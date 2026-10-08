// =============================================================================
// totp.ts — Núcleo TOTP (RFC 6238) + HOTP (RFC 4226) sin dependencias externas.
// =============================================================================
// Se implementa sobre Web Crypto (`crypto.subtle`), disponible tanto en el
// runtime Node 22 de Vercel como en entornos Edge, para no agregar paquetes
// npm nuevos al bundle del servidor.
//
// Parámetros adoptados (los mismos que genera Google Authenticator,
// Authy, 1Password y Microsoft Authenticator por defecto):
//   - Algoritmo: HMAC-SHA1
//   - Periodo:   30 segundos
//   - Dígitos:   6
//   - Ventana:   ±1 paso (tolera ±30s de desfase de reloj)
//
// El secreto se genera con 20 bytes aleatorios (160 bits) y se transporta en
// Base32 sin padding (RFC 4648), que es el formato que exige el estándar
// `otpauth://` de Key Uri Format.
//
// Nada de este módulo toca PocketBase: es lógica criptográfica pura y
// testeable de forma aislada.
// =============================================================================

/** Emisor mostrado por la app autenticadora. */
export const TOTP_ISSUER = 'ArtesaNica';
/** Dígitos del código OTP. */
export const TOTP_DIGITS = 6;
/** Periodo del paso temporal, en segundos. */
export const TOTP_PERIOD = 30;
/** Pasos de tolerancia hacia atrás/adelante al validar (clock drift). */
export const TOTP_WINDOW = 1;
/** Bytes de entropía del secreto compartido. */
export const TOTP_SECRET_BYTES = 20;
/** Cantidad de códigos de recuperación emitidos al activar el 2FA. */
export const RECOVERY_CODE_COUNT = 10;

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

// -----------------------------------------------------------------------------
// Base32 (RFC 4648, sin padding)
// -----------------------------------------------------------------------------

export function base32Encode(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

export function base32Decode(input: string): Uint8Array {
  const clean = input.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const char of clean) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) throw new Error('Invalid base32 character');
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Uint8Array.from(out);
}

// -----------------------------------------------------------------------------
// Generación de secretos
// -----------------------------------------------------------------------------

/** Secreto compartido nuevo, codificado en Base32 (sin padding). */
export function generateTotpSecret(): string {
  const bytes = new Uint8Array(TOTP_SECRET_BYTES);
  crypto.getRandomValues(bytes);
  return base32Encode(bytes);
}

// -----------------------------------------------------------------------------
// HOTP / TOTP
// -----------------------------------------------------------------------------

/** HOTP (RFC 4226) para un contador explícito. Devuelve `digits` dígitos. */
export async function hotp(
  secret: string | Uint8Array,
  counter: number,
  digits: number = TOTP_DIGITS
): Promise<string> {
  const keyBytes =
    typeof secret === 'string' ? base32Decode(secret) : secret;

  const counterBytes = new Uint8Array(8);
  // Contador de 64 bits big-endian. Number.MAX_SAFE_INTEGER lo cubre de sobra
  // para el contador temporal actual (≈ 5.8e7 pasos de 30s desde 1970).
  let remaining = Math.floor(counter);
  for (let i = 7; i >= 0; i -= 1) {
    counterBytes[i] = remaining & 0xff;
    remaining = Math.floor(remaining / 256);
  }

  const key = await crypto.subtle.importKey(
    'raw',
    keyBytes as unknown as BufferSource,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );
  const signature = new Uint8Array(
    await crypto.subtle.sign('HMAC', key, counterBytes as unknown as BufferSource)
  );

  // Truncamiento dinámico (RFC 4226 §5.3).
  const offset = signature[signature.length - 1] & 0x0f;
  const binary =
    ((signature[offset] & 0x7f) << 24) |
    ((signature[offset + 1] & 0xff) << 16) |
    ((signature[offset + 2] & 0xff) << 8) |
    (signature[offset + 3] & 0xff);

  const modulo = 10 ** digits;
  return String(binary % modulo).padStart(digits, '0');
}

/** Paso temporal (contador) para un instante dado. */
export function timeStep(
  timestampMs: number = Date.now(),
  period: number = TOTP_PERIOD
): number {
  return Math.floor(timestampMs / 1000 / period);
}

/** TOTP (RFC 6238) para el instante indicado. */
export async function totp(
  secret: string,
  timestampMs: number = Date.now(),
  digits: number = TOTP_DIGITS,
  period: number = TOTP_PERIOD
): Promise<string> {
  return hotp(secret, timeStep(timestampMs, period), digits);
}

/** Comparación de strings en tiempo constante (evita timing attacks). */
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export interface TotpVerifyResult {
  ok: boolean;
  /** Paso temporal aceptado (para bloqueo de replay). -1 si no hubo match. */
  counter: number;
}

/**
 * Valida un código TOTP contra el secreto.
 *
 * `minCounter` permite rechazar la reutilización del mismo código (replay):
 * se pasa el último contador aceptado y solo se aceptan pasos estrictamente
 * mayores.
 */
export async function verifyTotp(
  secret: string,
  code: string,
  options: { window?: number; minCounter?: number; timestampMs?: number } = {}
): Promise<TotpVerifyResult> {
  const normalized = code.replace(/\D/g, '');
  if (normalized.length !== TOTP_DIGITS) return { ok: false, counter: -1 };

  const window = options.window ?? TOTP_WINDOW;
  const current = timeStep(options.timestampMs ?? Date.now());
  const minCounter = options.minCounter ?? -1;

  for (let offset = -window; offset <= window; offset += 1) {
    const counter = current + offset;
    if (counter < 0 || counter <= minCounter) continue;
    const expected = await hotp(secret, counter);
    if (constantTimeEqual(expected, normalized)) {
      return { ok: true, counter };
    }
  }
  return { ok: false, counter: -1 };
}

// -----------------------------------------------------------------------------
// URI otpauth:// (Key Uri Format de Google Authenticator)
// -----------------------------------------------------------------------------

export function buildOtpauthUrl(params: {
  secret: string;
  accountName: string;
  issuer?: string;
}): string {
  const issuer = params.issuer ?? TOTP_ISSUER;
  const label = encodeURIComponent(`${issuer}:${params.accountName}`);
  const query = new URLSearchParams({
    secret: params.secret,
    issuer,
    algorithm: 'SHA1',
    digits: String(TOTP_DIGITS),
    period: String(TOTP_PERIOD),
  });
  return `otpauth://totp/${label}?${query.toString()}`;
}

// -----------------------------------------------------------------------------
// Códigos de recuperación (one-time backup codes)
// -----------------------------------------------------------------------------

/**
 * Códigos de recuperación en formato `XXXX-XXXX` (alfabeto sin caracteres
 * ambiguos: sin 0/O ni 1/I/L).
 */
export function generateRecoveryCodes(count: number = RECOVERY_CODE_COUNT): string[] {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const codes: string[] = [];
  const buffer = new Uint8Array(8);
  while (codes.length < count) {
    crypto.getRandomValues(buffer);
    let code = '';
    for (const byte of buffer) {
      code += alphabet[byte % alphabet.length];
    }
    codes.push(`${code.slice(0, 4)}-${code.slice(4, 8)}`);
  }
  return codes;
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value)
  );
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, '0')
  ).join('');
}

/** Hash de un código de recuperación (nunca se guarda en claro). */
export async function hashRecoveryCode(code: string): Promise<string> {
  return sha256Hex(normalizeRecoveryCode(code));
}

/** Normaliza `abcd-efgh` / `ABCD EFGH` a `ABCDEFGH`. */
export function normalizeRecoveryCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export interface RecoveryVerifyResult {
  ok: boolean;
  /** Hashes restantes (el consumido se elimina). */
  remaining: string[];
}

/**
 * Consume un código de recuperación de la lista de hashes almacenada.
 * El match se hace comparando hashes en tiempo constante.
 */
export async function consumeRecoveryCode(
  storedHashes: string[],
  code: string
): Promise<RecoveryVerifyResult> {
  const normalized = normalizeRecoveryCode(code);
  if (normalized.length !== 8) return { ok: false, remaining: storedHashes };

  const candidate = await hashRecoveryCode(normalized);
  for (let i = 0; i < storedHashes.length; i += 1) {
    if (constantTimeEqual(storedHashes[i], candidate)) {
      const remaining = storedHashes.slice();
      remaining.splice(i, 1);
      return { ok: true, remaining };
    }
  }
  return { ok: false, remaining: storedHashes };
}
