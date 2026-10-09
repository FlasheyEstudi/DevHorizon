// =============================================================================
// POST /api/auth/2fa/setup — Paso 1 del enrolamiento TOTP
// =============================================================================
// Requiere sesión activa + CSRF. Genera un secreto nuevo (160 bits) y lo
// guarda como *pending* (`totp_pending_secret`, hidden). El 2FA NO queda
// activo hasta que /api/auth/2fa/enable confirme un código válido, de modo
// que un usuario que abandone el asistente no se autobloquea.
//
// Respuesta 200:
//   { secret, otpauthUrl, issuer, account, digits, period }
//
// `otpauthUrl` es el URI estándar que se puede copiar en la app autenticadora
// o codificar como QR en el cliente.
//
// Errores:
//   401 unauthorized            — sin sesión.
//   409 two_factor_already_enabled — el 2FA ya está activo.
//   503 two_factor_unavailable  — el cliente de superusuario no está
//                                  disponible (fallo cerrado).
// =============================================================================

import type { APIRoute } from 'astro';
import { validateCsrf } from '../../../../lib/auth/csrf';
import { clientIp, jsonError, jsonOk } from '../../../../lib/auth/http';
import { logAuthEvent } from '../../../../lib/auth/logger';
import {
  TOTP_DIGITS,
  TOTP_ISSUER,
  TOTP_PERIOD,
  buildOtpauthUrl,
  generateTotpSecret,
} from '../../../../lib/auth/totp';
import { readUserSecurity, updateUserSecurity } from '../../../../lib/auth/twofactor';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, locals }) => {
  const csrfError = validateCsrf(request, cookies);
  if (csrfError) return csrfError;

  const user = locals.user;
  if (!user) return jsonError('unauthorized', 401);

  try {
    const security = await readUserSecurity(user.id);
    if (security.enabled) {
      return jsonError('two_factor_already_enabled', 409);
    }

    const secret = generateTotpSecret();
    await updateUserSecurity(user.id, { pendingSecret: secret, lastCounter: -1 });

    const account =
      typeof user.email === 'string' && user.email ? user.email : user.id;

    logAuthEvent('auth.2fa_setup_started', {
      userId: user.id,
      ip: clientIp(request),
    });

    return jsonOk({
      secret,
      otpauthUrl: buildOtpauthUrl({ secret, accountName: account }),
      issuer: TOTP_ISSUER,
      account,
      digits: TOTP_DIGITS,
      period: TOTP_PERIOD,
    });
  } catch {
    logAuthEvent('auth.2fa_setup_unavailable', {
      userId: user.id,
      ip: clientIp(request),
    });
    return jsonError('two_factor_unavailable', 503);
  }
};
