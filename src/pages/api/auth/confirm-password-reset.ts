// =============================================================================
// POST /api/auth/confirm-password-reset
// =============================================================================
// Finalizes the password-reset flow: the user opens the link from the email,
// submits a new password, and we forward it to PocketBase along with the
// token PB issued.
//
// Per spec REQ-K2:
//   - Body: { token, password, passwordConfirm } — all required.
//   - On success: 200 { ok: true }. The user is NOT auto-logged-in here
//     because confirmPasswordReset does not return the email. The UI page
//     (Phase 5) will redirect the user to /login after success.
//   - On PB error (invalid/expired token, password rules): 400.
//
// Per spec REQ-A2, REQ-C:
//   - PB client from Astro.locals.pb.
//   - CSRF validated via helper.
//
// Body: { token: string, password: string, passwordConfirm: string }
// =============================================================================

import type { APIRoute } from 'astro';
import { z } from 'zod';
import { validateCsrf } from '../../../lib/auth/csrf';
import { logAuthEvent } from '../../../lib/auth/logger';

export const prerender = false;

const ConfirmResetSchema = z
  .object({
    token: z.string().min(1),
    password: z.string().min(8),
    passwordConfirm: z.string().min(8),
  })
  .strict()
  .refine((data) => data.password === data.passwordConfirm, {
    message: 'Passwords do not match',
    path: ['passwordConfirm'],
  });

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
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
  // 1. CSRF.
  const csrfError = validateCsrf(request, cookies);
  if (csrfError) return csrfError;

  // 2. Parse + validate body.
  const body = await request.json().catch(() => null);
  const parsed = ConfirmResetSchema.safeParse(body);
  if (!parsed.success) {
    logAuthEvent('auth.password_reset_invalid', {
      ip: clientIp(request),
    });
    return jsonResponse({ error: 'Invalid request' }, 400);
  }

  // 3. PB call.
  try {
    const pb = locals.pb;
    await pb
      .collection('users')
      .confirmPasswordReset(
        parsed.data.token,
        parsed.data.password,
        parsed.data.passwordConfirm
      );

    logAuthEvent('auth.password_reset_confirmed', {
      ip: clientIp(request),
    });
    return jsonResponse({ ok: true }, 200);
  } catch {
    // PB returns 400 for invalid/expired tokens and on validation rules.
    // We don't surface the underlying message to avoid leaking detail.
    logAuthEvent('auth.password_reset_failed', {
      ip: clientIp(request),
    });
    return jsonResponse({ error: 'Invalid or expired token' }, 400);
  }
};