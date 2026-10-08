// =============================================================================
// POST /api/auth/login
// =============================================================================
// Autentica contra PocketBase con email/password, guarda el token en una
// cookie httpOnly + secure(prod) y devuelve el user (sin password).
//
// Per spec REQ-A2, REQ-C, REQ-D1, REQ-D2:
//   - PB client comes from Astro.locals.pb (per-request, attached by middleware).
//   - CSRF check: validateCsrf() runs first; safe-method endpoints skip it.
//   - Cookie set via setAuthCookie() helper (HttpOnly, Secure(prod),
//     SameSite=Lax, Path=/, Max-Age=604800).
//   - Structured log via logAuthEvent() — never log email/password/token.
//
// Body: { email: string, password: string }
// =============================================================================

import type { APIRoute } from 'astro';
import { z } from 'zod';
import { setAuthCookie } from '../../../lib/auth/cookie';
import { validateCsrf } from '../../../lib/auth/csrf';
import { logAuthEvent } from '../../../lib/auth/logger';

export const prerender = false;

const LoginSchema = z.object({
  email: z.string().email({ message: 'Email inválido' }),
  password: z.string().min(8),
});

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function clientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

export const POST: APIRoute = async ({ request, cookies, locals }) => {
  // 1. CSRF — skip only on safe methods (this is POST so it always runs).
  const csrfError = validateCsrf(request, cookies);
  if (csrfError) return csrfError;

  // 2. Parse + validate body.
  const body = await request.json().catch(() => null);
  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    logAuthEvent('auth.login_validation_error', {
      event: 'auth.login_validation_error',
      ip: clientIp(request),
    });
    return jsonError('Invalid request', 400);
  }

  // 3. Per-request PB client from middleware.
  const pb = locals.pb;

  // 4. PB call.
  try {
    const authData = await pb
      .collection('users')
      .authWithPassword(parsed.data.email, parsed.data.password);

    setAuthCookie(cookies, authData.token, authData.record);

    logAuthEvent('auth.login_success', {
      userId: authData.record.id,
      ip: clientIp(request),
    });

    return new Response(JSON.stringify({ user: authData.record }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    // Don't leak whether email exists vs password was wrong.
    logAuthEvent('auth.login_failed', {
      ip: clientIp(request),
    });
    return jsonError('Invalid credentials', 401);
  }
};