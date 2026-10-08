// =============================================================================
// twofactor.ts — Integración de TOTP con PocketBase (server-side).
// =============================================================================
// Centraliza TODO el acceso a los campos 2FA de la colección `users`
// (`totp_enabled`, `totp_secret`, `totp_pending_secret`, `totp_recovery_codes`,
// `totp_last_counter`), que son `hidden` en PocketBase.
//
// Consecuencias del flag `hidden`:
//   1. El secreto NUNCA se serializa en respuestas de la API pública, ni
//      siquiera para el propio dueño del registro.
//   2. Solo el cliente de superusuario puede leerlos/escribirlos, por lo que
//      todas las operaciones de este módulo pasan por `ensureAdminAuth()`.
//   3. Ningún usuario puede activar/desactivar su 2FA con un PATCH directo a
//      /api/collections/users/records/{id}: la única vía son nuestros
//      endpoints, que validan CSRF, sesión y un código TOTP válido.
//
// También expone el limitador de intentos por usuario del paso 2 del login.
// =============================================================================

import type PocketBase from 'pocketbase';
import { ensureAdminAuth, pocketbaseWithAuth } from '../pocketbase';
import {
  RECOVERY_CODE_COUNT,
  consumeRecoveryCode,
  generateRecoveryCodes,
  hashRecoveryCode,
  verifyTotp,
} from './totp';

export interface UserSecurityState {
  enabled: boolean;
  /** Secreto confirmado (Base32). */
  secret: string;
  /** Secreto en enrolamiento, pendiente de confirmar con un código. */
  pendingSecret: string;
  /** Hashes SHA-256 de los códigos de recuperación no consumidos. */
  recoveryCodes: string[];
  /** Último paso temporal TOTP aceptado (anti-replay). */
  lastCounter: number;
}

export interface UserSecurityPatch {
  enabled?: boolean;
  secret?: string;
  pendingSecret?: string;
  recoveryCodes?: string[];
  lastCounter?: number;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

function asCounter(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return -1;
}

/** Normaliza un registro de `users` (con campos hidden) al estado de seguridad. */
export function toSecurityState(record: Record<string, unknown>): UserSecurityState {
  return {
    enabled: record.totp_enabled === true,
    secret: asString(record.totp_secret),
    pendingSecret: asString(record.totp_pending_secret),
    recoveryCodes: asStringArray(record.totp_recovery_codes),
    lastCounter: asCounter(record.totp_last_counter),
  };
}

/**
 * Lee el estado 2FA de un usuario con el cliente de superusuario.
 * Lanza si el cliente admin no está disponible (el llamador decide si
 * fallar cerrado).
 */
export async function readUserSecurity(userId: string): Promise<UserSecurityState> {
  const admin = await ensureAdminAuth();
  const record = (await admin
    .collection('users')
    .getOne(userId)) as unknown as Record<string, unknown>;
  return toSecurityState(record);
}

/** Escribe (merge) los campos 2FA del usuario con el cliente de superusuario. */
export async function updateUserSecurity(
  userId: string,
  patch: UserSecurityPatch
): Promise<void> {
  const data: Record<string, unknown> = {};
  if (patch.enabled !== undefined) data.totp_enabled = patch.enabled;
  if (patch.secret !== undefined) data.totp_secret = patch.secret;
  if (patch.pendingSecret !== undefined) {
    data.totp_pending_secret = patch.pendingSecret;
  }
  if (patch.recoveryCodes !== undefined) {
    data.totp_recovery_codes = patch.recoveryCodes;
  }
  if (patch.lastCounter !== undefined) {
    data.totp_last_counter = patch.lastCounter;
  }
  if (Object.keys(data).length === 0) return;

  const admin = await ensureAdminAuth();
  await admin.collection('users').update(userId, data);
}

/** Desactiva el 2FA y destruye secretos y códigos de recuperación. */
export async function clearUserSecurity(userId: string): Promise<void> {
  await updateUserSecurity(userId, {
    enabled: false,
    secret: '',
    pendingSecret: '',
    recoveryCodes: [],
    lastCounter: -1,
  });
}

/**
 * Cliente PocketBase aislado autenticado con un token concreto.
 * Se usa para canjear el token del desafío 2FA sin tocar `locals.pb`.
 */
export function pocketbaseFromToken(token: string): PocketBase {
  const client = pocketbaseWithAuth(null);
  client.authStore.save(token, null);
  return client;
}

// -----------------------------------------------------------------------------
// Códigos de recuperación
// -----------------------------------------------------------------------------

/** Genera códigos nuevos y devuelve en claro + hashes para persistir. */
export async function buildRecoveryCodes(): Promise<{
  plain: string[];
  hashes: string[];
}> {
  const plain = generateRecoveryCodes(RECOVERY_CODE_COUNT);
  const hashes: string[] = [];
  for (const code of plain) {
    hashes.push(await hashRecoveryCode(code));
  }
  return { plain, hashes };
}

// -----------------------------------------------------------------------------
// Verificación del paso 2 del login
// -----------------------------------------------------------------------------

export interface CodeVerification {
  ok: boolean;
  /** 'totp' | 'recovery' | null */
  method: 'totp' | 'recovery' | null;
  /** Nuevo valor de `totp_last_counter` cuando el método fue TOTP. */
  lastCounter?: number;
  /** Hashes restantes cuando el método fue recovery. */
  remainingRecoveryCodes?: string[];
}

/**
 * Verifica un código de 6 dígitos (TOTP) o un código de recuperación
 * (`XXXX-XXXX`) contra el estado 2FA del usuario.
 *
 * `enforceReplay` activa el bloqueo de reutilización del mismo paso temporal,
 * que solo aplica al login (un código interceptado no debe poder reusarse).
 */
export async function verifyUserCode(
  security: UserSecurityState,
  code: string,
  options: { enforceReplay?: boolean } = {}
): Promise<CodeVerification> {
  if (!security.enabled || !security.secret) {
    return { ok: false, method: null };
  }

  const normalized = code.replace(/\s+/g, '');
  const isDigitsOnly = /^\d{6}$/.test(normalized);

  if (isDigitsOnly) {
    const result = await verifyTotp(security.secret, normalized, {
      minCounter: options.enforceReplay ? security.lastCounter : -1,
    });
    if (!result.ok) return { ok: false, method: null };
    return { ok: true, method: 'totp', lastCounter: result.counter };
  }

  const recovery = await consumeRecoveryCode(
    security.recoveryCodes,
    normalized
  );
  if (!recovery.ok) return { ok: false, method: null };
  return {
    ok: true,
    method: 'recovery',
    remainingRecoveryCodes: recovery.remaining,
  };
}

// -----------------------------------------------------------------------------
// Limitador de intentos del paso 2 (best-effort, por instancia)
// -----------------------------------------------------------------------------
// Vercel puede repartir requests entre varias instancias, por lo que este
// limitador es una barrera adicional, no la única: el desafío caduca a los
// 5 minutos y el paso 1 (password) está limitado por PocketBase a 5 req/min
// por IP. Un ataque por fuerza bruta contra el paso 2 requiere, por tanto,
// repetir la autenticación con contraseña.
// -----------------------------------------------------------------------------

const ATTEMPT_WINDOW_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

const attemptsByUser = new Map<string, number[]>();

function prune(now: number, entries: number[]): number[] {
  return entries.filter((ts) => now - ts < ATTEMPT_WINDOW_MS);
}

export function twoFactorAttemptState(userId: string): {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
} {
  const now = Date.now();
  const entries = prune(now, attemptsByUser.get(userId) ?? []);
  attemptsByUser.set(userId, entries);

  if (entries.length === 0) {
    return { allowed: true, remaining: MAX_ATTEMPTS, retryAfterSeconds: 0 };
  }
  if (entries.length < MAX_ATTEMPTS) {
    return {
      allowed: true,
      remaining: MAX_ATTEMPTS - entries.length,
      retryAfterSeconds: 0,
    };
  }
  const oldest = entries[0];
  return {
    allowed: false,
    remaining: 0,
    retryAfterSeconds: Math.max(
      1,
      Math.ceil((ATTEMPT_WINDOW_MS - (now - oldest)) / 1000)
    ),
  };
}

export function registerTwoFactorFailure(userId: string): void {
  const now = Date.now();
  const entries = prune(now, attemptsByUser.get(userId) ?? []);
  entries.push(now);
  attemptsByUser.set(userId, entries);
}

export function resetTwoFactorAttempts(userId: string): void {
  attemptsByUser.delete(userId);
}
