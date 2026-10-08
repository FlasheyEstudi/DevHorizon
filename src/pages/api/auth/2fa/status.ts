// =============================================================================
// GET /api/auth/2fa/status — Estado del 2FA del usuario autenticado
// =============================================================================
// Requiere sesión activa (método seguro, sin CSRF). Devuelve únicamente
// metadatos: jamás el secreto ni los códigos de recuperación.
//
// Respuesta 200:
//   {
//     enabled: boolean,
//     pendingSetup: boolean,            // enrolamiento iniciado sin confirmar
//     recoveryCodesRemaining: number    // códigos de respaldo sin usar
//   }
//
// Errores:
//   401 unauthorized          — sin sesión.
//   503 two_factor_unavailable.
// =============================================================================

import type { APIRoute } from 'astro';
import { jsonError, jsonOk } from '../../../../lib/auth/http';
import { readUserSecurity } from '../../../../lib/auth/twofactor';

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  const user = locals.user;
  if (!user) return jsonError('unauthorized', 401);

  try {
    const security = await readUserSecurity(user.id);
    return jsonOk({
      enabled: security.enabled,
      pendingSetup: !security.enabled && security.pendingSecret !== '',
      recoveryCodesRemaining: security.recoveryCodes.length,
    });
  } catch {
    return jsonError('two_factor_unavailable', 503);
  }
};
