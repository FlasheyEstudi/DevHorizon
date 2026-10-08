// =============================================================================
// GET /api/auth/verify-email?token=<token>
// =============================================================================
// Consumes the verification token PB emails after registration.
//
// Per spec REQ-K3:
//   - On success: redirect to /perfil so the user lands on their dashboard
//     (the user is already logged in if they registered moments ago; if not,
//     middleware will redirect to /login?next=/perfil).
//   - On failure (invalid/expired token, missing token): redirect to
//     /login?verify=fail. The login page reads the flag and shows a
//     localized banner.
//   - Always returns 302 — no 500 leaks, even if PB throws.
//
// This is a GET because PB's verify link is opened in the browser, not
// fetched via XHR. CSRF does not apply (safe method).
// =============================================================================

import type { APIRoute } from 'astro';
import { logAuthEvent } from '../../../lib/auth/logger';

export const prerender = false;

export const GET: APIRoute = async ({ url, locals, redirect }) => {
  const token = url.searchParams.get('token');
  const lang = url.searchParams.get('lang');
  const prefix = lang && lang !== 'es' ? `/${lang}` : '';

  if (!token) {
    logAuthEvent('auth.email_verify_missing_token', {});
    return redirect(`${prefix}/login?verify=missing`);
  }

  try {
    const pb = locals.pb;
    await pb.collection('users').confirmVerification(token);
    logAuthEvent('auth.email_verified', {});
    return redirect(`${prefix}/perfil`);
  } catch {
    logAuthEvent('auth.email_verify_failed', {});
    return redirect(`${prefix}/login?verify=fail`);
  }
};