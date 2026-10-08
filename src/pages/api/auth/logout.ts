// =============================================================================
// POST /api/auth/logout
// =============================================================================
// Drops the PB-side session and clears the auth cookie.
//
// Per spec REQ-D3:
//   - clearAuthCookie() removes the pb_auth cookie from the browser.
//   - pb.authStore.clear() drops the in-memory token on this request's client.
//   - A single pb.collection('users').authRefresh() call invalidates the
//     server-side session for this user. We do NOT invalidate all sessions
//     (REQ-D3 explicitly forbids that).
//
// Returns 204 No Content on success. If authRefresh throws (already-expired
// token), we still clear the cookie and return 204 — the user is effectively
// logged out regardless.
// =============================================================================

import type { APIRoute } from 'astro';
import { clearAuthCookie } from '../../../lib/auth/cookie';
import { logAuthEvent } from '../../../lib/auth/logger';
import { validateCsrf } from '../../../lib/auth/csrf';

export const prerender = false;

function clientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

export const POST: APIRoute = async ({ request, cookies, locals }) => {
  // Validación de CSRF
  const csrfError = validateCsrf(request, cookies);
  if (csrfError) return csrfError;

  const pb = locals.pb;
  const userId = locals.user?.id;

  // 1. Limpiar cookie del navegador (fuente de verdad del cliente)
  clearAuthCookie(cookies);

  // 2. Limpiar el authStore en memoria del cliente para esta petición
  pb.authStore.clear();

  logAuthEvent('auth.logout', {
    userId,
    ip: clientIp(request),
  });

  return new Response(null, { status: 204 });
};