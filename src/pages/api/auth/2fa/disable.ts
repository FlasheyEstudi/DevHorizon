// =============================================================================
// POST /api/auth/2fa/disable — Desactiva el 2FA de la cuenta
// =============================================================================
// Requiere sesión activa + CSRF y una doble prueba de identidad:
//   1. La contraseña actual (revalidada contra PocketBase).
//   2. Un código TOTP vigente o un código de recuperación sin usar.
//
// Body: { password: string, code: string }
//
// Respuesta 200: { enabled: false }
//
// Errores:
//   400 two_factor_not_enabled — la cuenta no tiene 2FA activo.
//   401 invalid_credentials    — contraseña incorrecta.
//   401 invalid_code           — código incorrecto.
//   401 unauthorized           — sin sesión.
//   503 two_factor_unavailable.
// =============================================================================

import type { APIRoute } from 'astro';
import { z } from 'zod';
import { validateCsrf } from '../../../../lib/auth/csrf';
import { clientIp, jsonError, jsonOk } from '../../../../lib/auth/http';
import { logAuthEvent } from '../../../../lib/auth/logger';
import {
  clearUserSecurity,
  readUserSecurity,
  verifyUserCode,
} from '../../../../lib/auth/twofactor';

export const prerender = false;

const DisableSchema = z.object({
  password: z.string().min(8),
  code: z.string().trim().min(6).max(20),
});

export const POST: APIRoute = async ({ request, cookies, locals }) => {
  const csrfError = validateCsrf(request, cookies);
  if (csrfError) return csrfError;

  const user = locals.user;
  if (!user) return jsonError('unauthorized', 401);

  const body = await request.json().catch(() => null);
  const parsed = DisableSchema.safeParse(body);
  if (!parsed.success) return jsonError('invalid_request', 400);

  const email = typeof user.email === 'string' ? user.email : '';
  if (!email) return jsonError('unauthorized', 401);

  // 1. Revalidar la contraseña contra PocketBase (nunca guardamos hashes).
  try {
    await locals.pb
      .collection('users')
      .authWithPassword(email, parsed.data.password);
  } catch {
    logAuthEvent('auth.2fa_disable_bad_password', {
      userId: user.id,
      ip: clientIp(request),
    });
    return jsonError('invalid_credentials', 401);
  }

  try {
    const security = await readUserSecurity(user.id);
    if (!security.enabled) {
      return jsonError('two_factor_not_enabled', 400);
    }

    const verification = await verifyUserCode(security, parsed.data.code);
    if (!verification.ok) {
      logAuthEvent('auth.2fa_disable_bad_code', {
        userId: user.id,
        ip: clientIp(request),
      });
      return jsonError('invalid_code', 401);
    }

    await clearUserSecurity(user.id);

    logAuthEvent('auth.2fa_disabled', {
      userId: user.id,
      ip: clientIp(request),
    });

    return jsonOk({ enabled: false });
  } catch {
    logAuthEvent('auth.2fa_disable_unavailable', {
      userId: user.id,
      ip: clientIp(request),
    });
    return jsonError('two_factor_unavailable', 503);
  }
};
