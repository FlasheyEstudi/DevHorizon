// =============================================================================
// POST /api/auth/change-password
// =============================================================================
// Changes the password of the currently authenticated user.
//
// Per spec REQ-K4:
//   - Requires an authenticated session (middleware populated locals.user).
//     Returns 401 if locals.user is null — never leaks the change endpoint
//     to anonymous callers.
//   - Body: { oldPassword, newPassword, newPasswordConfirm }.
//   - Uses PB's `update()` with oldPassword so PB rejects the call itself if
//     the old password doesn't match (we don't need to verify it locally).
//   - Does NOT re-issue the cookie here: PB keeps the same JWT after a
//     password update, and re-issuing would invalidate in-flight tabs
//     unnecessarily. The UI redirects the user to /login on success so
//     they get a fresh session on next load.
//
// Per spec REQ-A2, REQ-C:
//   - PB client from Astro.locals.pb.
//   - CSRF validated via helper.
//
// Body: { oldPassword: string, newPassword: string, newPasswordConfirm: string }
// =============================================================================

import type { APIRoute } from 'astro';
import { z } from 'zod';
import { validateCsrf } from '../../../lib/auth/csrf';
import { logAuthEvent } from '../../../lib/auth/logger';

export const prerender = false;

const ChangePasswordSchema = z
  .object({
    oldPassword: z.string().min(1),
    newPassword: z.string().min(8),
    newPasswordConfirm: z.string().min(8),
  })
  .strict()
  .refine((data) => data.newPassword === data.newPasswordConfirm, {
    message: 'Passwords do not match',
    path: ['newPasswordConfirm'],
  });

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const POST: APIRoute = async ({ request, cookies, locals }) => {
  // 1. Auth required — change-password is never anonymous.
  if (!locals.user) {
    return jsonResponse({ error: 'Unauthenticated' }, 401);
  }

  // 2. CSRF.
  const csrfError = validateCsrf(request, cookies);
  if (csrfError) return csrfError;

  // 3. Parse + validate body.
  const body = await request.json().catch(() => null);
  const parsed = ChangePasswordSchema.safeParse(body);
  if (!parsed.success) {
    logAuthEvent('auth.password_change_invalid', {
      userId: locals.user.id,
    });
    return jsonResponse({ error: 'Invalid request' }, 400);
  }

  // 4. PB update with oldPassword — PB will reject if it doesn't match.
  try {
    const pb = locals.pb;
    await pb.collection('users').update(locals.user.id, {
      oldPassword: parsed.data.oldPassword,
      password: parsed.data.newPassword,
      passwordConfirm: parsed.data.newPasswordConfirm,
    });

    logAuthEvent('auth.password_changed', {
      userId: locals.user.id,
    });
    return jsonResponse({ ok: true }, 200);
  } catch {
    logAuthEvent('auth.password_change_failed', {
      userId: locals.user.id,
    });
    return jsonResponse({ error: 'Current password incorrect' }, 400);
  }
};