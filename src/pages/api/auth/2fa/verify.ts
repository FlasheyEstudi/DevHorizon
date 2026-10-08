// =============================================================================
// POST /api/auth/2fa/verify — Paso 2 del login (canje del desafío TOTP)
// =============================================================================
// No requiere sesión: canjea la cookie HttpOnly `pb_2fa` (emitida por
// /api/auth/login cuando la cuenta tiene 2FA) por la sesión real `pb_auth`
// una vez validado el código.
//
// Acepta dos formatos de código:
//   - 6 dígitos  → TOTP normal (ventana ±1 paso, anti-replay por contador).
//   - XXXX-XXXX  → código de recuperación de un solo uso (se consume).
//
// Body: { code: string }
//
// Respuesta 200: { user: <record> }
//
// Errores:
//   401 two_factor_challenge_expired — falta la cookie o el token ya no vale.
//   401 invalid_code                 — código incorrecto (con intentos restantes).
//   409 two_factor_disabled          — el 2FA se desactivó mientras se
//                                      completaba el desafío.
//   429 too_many_attempts            — superó el límite de intentos.
//   503 two_factor_unavailable.
//
// La cookie de desafío caduca a los 5 minutos y solo existe para este
// endpoint: el middleware nunca la interpreta como sesión autenticada.
// =============================================================================

import type { APIRoute } from 'astro';
import { z } from 'zod';
import {
  clearPendingTwoFactorCookie,
  readPendingTwoFactorToken,
  setAuthCookie,
} from '../../../../lib/auth/cookie';
import { validateCsrf } from '../../../../lib/auth/csrf';
import { clientIp, jsonError, jsonOk } from '../../../../lib/auth/http';
import { logAuthEvent } from '../../../../lib/auth/logger';
import { decodeJwtPayload } from '../../../../lib/auth/refresh';
import {
  pocketbaseFromToken,
  readUserSecurity,
  registerTwoFactorFailure,
  resetTwoFactorAttempts,
  twoFactorAttemptState,
  updateUserSecurity,
  verifyUserCode,
} from '../../../../lib/auth/twofactor';
import type { RecordModel } from 'pocketbase';

export const prerender = false;

const VerifySchema = z.object({
  code: z.string().trim().min(6).max(20),
});

export const POST: APIRoute = async ({ request, cookies }) => {
  const csrfError = validateCsrf(request, cookies);
  if (csrfError) return csrfError;

  const token = readPendingTwoFactorToken(cookies);
  if (!token) {
    return jsonError('two_factor_challenge_expired', 401);
  }

  const body = await request.json().catch(() => null);
  const parsed = VerifySchema.safeParse(body);
  if (!parsed.success) return jsonError('invalid_request', 400);

  // 1. Validar el token del desafío y obtener el record del usuario.
  //
  //    El JWT solo se DECODIFICA (sin verificar firma, igual que hace
  //    `maybeRefresh`) para leer el `id`; la validación real la hace
  //    PocketBase al servir el record con ese token. No usamos
  //    `authRefresh()`: el token se emitió segundos antes en el paso 1, así
  //    que no hay nada que rotar y evitamos depender de hooks/rotación.
  const payload = decodeJwtPayload(token);
  const challengeUserId = typeof payload?.id === 'string' ? payload.id : '';
  const challengeType = payload?.type;
  const expiresAtMs = typeof payload?.exp === 'number' ? payload.exp * 1000 : 0;
  const tokenLooksValid =
    challengeUserId !== '' &&
    (challengeType === undefined || challengeType === 'auth') &&
    expiresAtMs > Date.now();

  if (!tokenLooksValid) {
    clearPendingTwoFactorCookie(cookies);
    logAuthEvent('auth.2fa_challenge_expired', { ip: clientIp(request) });
    return jsonError('two_factor_challenge_expired', 401);
  }

  let record: RecordModel;
  try {
    record = (await pocketbaseFromToken(token)
      .collection('users')
      .getOne(challengeUserId)) as unknown as RecordModel;
  } catch {
    clearPendingTwoFactorCookie(cookies);
    logAuthEvent('auth.2fa_challenge_expired', { ip: clientIp(request) });
    return jsonError('two_factor_challenge_expired', 401);
  }

  const userId = record.id;

  // 2. Límite de intentos por usuario (best-effort por instancia).
  const attemptState = twoFactorAttemptState(userId);
  if (!attemptState.allowed) {
    logAuthEvent('auth.2fa_rate_limited', {
      userId,
      ip: clientIp(request),
    });
    return new Response(
      JSON.stringify({
        error: 'too_many_attempts',
        retryAfterSeconds: attemptState.retryAfterSeconds,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(attemptState.retryAfterSeconds),
        },
      }
    );
  }

  // 3. Verificar el código contra el estado 2FA del usuario.
  try {
    const security = await readUserSecurity(userId);

    if (!security.enabled || !security.secret) {
      clearPendingTwoFactorCookie(cookies);
      logAuthEvent('auth.2fa_disabled_during_challenge', {
        userId,
        ip: clientIp(request),
      });
      return jsonError('two_factor_disabled', 409);
    }

    const verification = await verifyUserCode(security, parsed.data.code, {
      enforceReplay: true,
    });

    if (!verification.ok) {
      registerTwoFactorFailure(userId);
      logAuthEvent('auth.2fa_invalid_code', {
        userId,
        ip: clientIp(request),
      });
      const after = twoFactorAttemptState(userId);
      return new Response(
        JSON.stringify({
          error: 'invalid_code',
          attemptsRemaining: after.remaining,
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 4. Persistir el consumo (contador anti-replay o código de recuperación).
    if (verification.method === 'totp') {
      await updateUserSecurity(userId, { lastCounter: verification.lastCounter });
    } else if (verification.remainingRecoveryCodes) {
      await updateUserSecurity(userId, {
        recoveryCodes: verification.remainingRecoveryCodes,
      });
    }

    // 5. Canjear el desafío por la sesión real.
    setAuthCookie(cookies, token, record);
    clearPendingTwoFactorCookie(cookies);
    resetTwoFactorAttempts(userId);

    logAuthEvent('auth.2fa_login_success', {
      userId,
      ip: clientIp(request),
    });
    if (verification.method === 'recovery') {
      logAuthEvent('auth.2fa_recovery_code_used', {
        userId,
        ip: clientIp(request),
      });
    }

    return jsonOk({ user: record });
  } catch {
    logAuthEvent('auth.2fa_verify_unavailable', {
      userId,
      ip: clientIp(request),
    });
    return jsonError('two_factor_unavailable', 503);
  }
};
