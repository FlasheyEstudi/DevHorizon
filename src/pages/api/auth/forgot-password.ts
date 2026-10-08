// =============================================================================
// POST /api/auth/forgot-password
// =============================================================================
// Starts the password-reset flow by asking PocketBase to email a reset link.
//
// Per spec REQ-K1:
//   - Always returns 204 No Content regardless of whether the email is
//     registered. This prevents email enumeration: an attacker can't tell
//     "user exists" vs "user does not exist" from the response.
//   - PB emails the user a link to <baseUrl>/<reset-page>?token=...; the
//     reset page itself is created in Phase 5 (T5.3).
//
// Per spec REQ-A2, REQ-C:
//   - PB client from Astro.locals.pb.
//   - CSRF validated via helper.
//
// Body: { email: string }
// =============================================================================

import type { APIRoute } from 'astro';
import { z } from 'zod';
import { validateCsrf } from '../../../lib/auth/csrf';
import { logAuthEvent } from '../../../lib/auth/logger';

export const prerender = false;

const ForgotPasswordSchema = z
  .object({
    email: z.string().email({ message: 'Email inválido' }),
  })
  .strict();

function clientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

export const POST: APIRoute = async ({ request, cookies, locals, url }) => {
  // 1. CSRF.
  const csrfError = validateCsrf(request, cookies);
  if (csrfError) return csrfError;

  // 2. Parse body. Always respond 204 — even on invalid bodies — to keep the
  //    endpoint enumeration-safe.
  const body = await request.json().catch(() => null);
  const parsed = ForgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    logAuthEvent('auth.forgot_password_invalid', {
      ip: clientIp(request),
    });
    return new Response(null, { status: 204 });
  }

  // 3. baseUrl: origin only — PB will append the path it has configured for
  //    the users collection (or whatever URL it generates). We send the
  //    request's origin so the email link matches the user's host.
  const baseUrl = `${url.protocol}//${url.host}`;

  // 4. Call PB. Always swallow errors and return 204 — we never want to leak
  //    whether the email exists or whether PB errored out.
  try {
    const pb = locals.pb;
    await pb.collection('users').requestPasswordReset(parsed.data.email, baseUrl);
    logAuthEvent('auth.forgot_password_requested', {
      ip: clientIp(request),
    });
  } catch {
    logAuthEvent('auth.forgot_password_error', {
      ip: clientIp(request),
    });
  }

  return new Response(null, { status: 204 });
};