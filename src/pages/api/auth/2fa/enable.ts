// =============================================================================
// POST /api/auth/2fa/enable — Paso 2 del enrolamiento TOTP
// =============================================================================
// Requiere sesión activa + CSRF. Valida el código de 6 dígitos contra el
// secreto *pending* creado por /api/auth/2fa/setup y, solo entonces, promueve
// el secreto a definitivo (`totp_secret`), marca `totp_enabled = true` y
// emite los códigos de recuperación.
//
// Body: { code: string }
//
// Respuesta 200: { enabled: true, recoveryCodes: string[] }
//   Los códigos de recuperación se devuelven UNA sola vez en claro; en la base
//   solo se persisten sus hashes SHA-256.
//
// Errores:
//   400 invalid_code                  — código TOTP incorrecto.
//   400 two_factor_setup_not_started  — no hay enrolamiento en curso.
//   401 unauthorized                  — sin sesión.
//   503 two_factor_unavailable.
// =============================================================================

import type { APIRoute } from 'astro';
import { z } from 'zod';
import { validateCsrf } from '../../../../lib/auth/csrf';
import { clientIp, jsonError, jsonOk } from '../../../../lib/auth/http';
import { logAuthEvent } from '../../../../lib/auth/logger';
import { TOTP_DIGITS, verifyTotp } from '../../../../lib/auth/totp';
import {
  buildRecoveryCodes,
  readUserSecurity,
  updateUserSecurity,
} from '../../../../lib/auth/twofactor';

export const prerender = false;

const EnableSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(new RegExp(`^\\d{${TOTP_DIGITS}}$`), { message: 'Código inválido' }),
});

export const POST: APIRoute = async ({ request, cookies, locals }) => {
  const csrfError = validateCsrf(request, cookies);
  if (csrfError) return csrfError;

  const user = locals.user;
  if (!user) return jsonError('unauthorized', 401);

  const body = await request.json().catch(() => null);
  const parsed = EnableSchema.safeParse(body);
  if (!parsed.success) return jsonError('invalid_request', 400);

  try {
    const security = await readUserSecurity(user.id);
    if (!security.pendingSecret) {
      return jsonError('two_factor_setup_not_started', 400);
    }

    const verification = await verifyTotp(security.pendingSecret, parsed.data.code);
    if (!verification.ok) {
      logAuthEvent('auth.2fa_enable_invalid_code', {
        userId: user.id,
        ip: clientIp(request),
      });
      return jsonError('invalid_code', 400);
    }

    const recovery = await buildRecoveryCodes();
    await updateUserSecurity(user.id, {
      enabled: true,
      secret: security.pendingSecret,
      pendingSecret: '',
      recoveryCodes: recovery.hashes,
      lastCounter: verification.counter,
    });

    logAuthEvent('auth.2fa_enabled', {
      userId: user.id,
      ip: clientIp(request),
    });

    return jsonOk({ enabled: true, recoveryCodes: recovery.plain });
  } catch {
    logAuthEvent('auth.2fa_enable_unavailable', {
      userId: user.id,
      ip: clientIp(request),
    });
    return jsonError('two_factor_unavailable', 503);
  }
};
