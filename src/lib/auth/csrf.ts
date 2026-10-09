// =============================================================================
// csrf.ts — Origin allowlist + double-submit CSRF protection.
//
// Per design §3.3 + spec REQ-C1..C2:
//   Safe methods (GET/HEAD/OPTIONS) skip the check.
//   Origin header MUST match PUBLIC_SITE_ORIGIN or PUBLIC_ALLOWED_ORIGINS.
//   For mutating requests, the `csrf-token` cookie must match the
//   `x-csrf-token` header (JSON requests) or a `csrfToken` field in the body
//   (form / multipart requests).
//   On any failure: return a 403 Response.
//
// The CSRF cookie is intentionally NOT HttpOnly so client scripts can echo it
// as the `x-csrf-token` header (double-submit pattern). Protection relies on
// SameSite=Lax + the Origin allowlist + constant-time compare.
//
// `validateCsrf(request, cookies)` returns null on success or a Response on
// failure. Callers should `return response` when non-null.
// =============================================================================

import type { AstroCookies } from 'astro';
import { runtimeEnv } from '../env';

export const CSRF_COOKIE_NAME = 'csrf-token';
export const CSRF_HEADER_NAME = 'x-csrf-token';
export const CSRF_BODY_FIELD = 'csrfToken';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const TOKEN_TTL_SECONDS = 60 * 60 * 12; // 12 hours

function getAllowedOrigins(request: Request): string[] {
  // Same-origin is always allowed (baseline CSRF protection: same-origin POSTs
  // include both cookies and Origin, so they are inherently verifiable). Without
  // this, any env that doesn't set PUBLIC_SITE_ORIGIN would 403 every mutating
  // request — which was caught by sdd-verify as CRITICAL-A.
  let requestOrigin = '';
  try {
    requestOrigin = new URL(request.url).origin;
  } catch {
    requestOrigin = '';
  }
  const base = runtimeEnv(
    'PUBLIC_SITE_ORIGIN',
    import.meta.env.PUBLIC_SITE_ORIGIN
  ).trim();
  const extras = runtimeEnv(
    'PUBLIC_ALLOWED_ORIGINS',
    import.meta.env.PUBLIC_ALLOWED_ORIGINS
  )
    .split(',')
    .map((s: string) => s.trim())
    .filter(Boolean);
  return [requestOrigin, base, ...extras].filter(Boolean);
}

function forbidden(message = 'CSRF validation failed'): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 403,
    headers: { 'Content-Type': 'application/json' },
  });
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

function generateToken(): string {
  // 32 random bytes -> 64-char hex string. Uses Web Crypto which is available
  // in both Node 22 and the Vercel Edge runtime.
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Returns null on success or a 403 Response on failure. Safe methods are
 * always allowed through.
 */
export function validateCsrf(request: Request, cookies: AstroCookies): Response | null {
  if (SAFE_METHODS.has(request.method)) return null;

  // Origin allowlist (primary defense).
  const originHeader = request.headers.get('origin');
  const referer = request.headers.get('referer');
  let sourceOrigin: string | null = null;
  if (originHeader) {
    sourceOrigin = originHeader;
  } else if (referer) {
    try {
      sourceOrigin = new URL(referer).origin;
    } catch {
      sourceOrigin = null;
    }
  }

  const allowed = getAllowedOrigins(request);
  if (!sourceOrigin || !allowed.includes(sourceOrigin)) {
    return forbidden('Origin not allowed');
  }

  // Double-submit compare.
  const cookieToken = cookies.get(CSRF_COOKIE_NAME)?.value;
  if (!cookieToken) return forbidden();

  const headerToken = request.headers.get(CSRF_HEADER_NAME);
  if (headerToken && constantTimeEqual(cookieToken, headerToken)) {
    return null;
  }

  // Fallback for form-encoded bodies: caller must invoke readFormCsrf(request)
  // and compare manually when they have parsed the body.
  return forbidden();
}

/**
 * Convenience for form-encoded submissions. Reads `csrfToken` from a cloned
 * request without consuming the original body stream.
 *
 * Returns true if the field matches the cookie, false otherwise.
 */
export async function validateCsrfFromForm(request: Request, cookies: AstroCookies): Promise<boolean> {
  if (SAFE_METHODS.has(request.method)) return true;
  const cookieToken = cookies.get(CSRF_COOKIE_NAME)?.value;
  if (!cookieToken) return false;

  const cloned = request.clone();
  let formToken: string | null = null;
  try {
    const form = await cloned.formData();
    const value = form.get(CSRF_BODY_FIELD);
    if (typeof value === 'string') formToken = value;
  } catch {
    return false;
  }
  if (!formToken) return false;
  return constantTimeEqual(cookieToken, formToken);
}

/**
 * Issue (or rotate) the CSRF cookie. Returns the token value so callers can
 * echo it into a hidden form field on the rendered page.
 *
 * Note: this cookie is intentionally NOT HttpOnly. The double-submit pattern
 * requires JS to read the cookie value and echo it as the `x-csrf-token`
 * header on mutating requests. CSRF mitigation here relies on:
 *   - SameSite=Lax: cross-origin requests do NOT send the cookie.
 *   - Origin allowlist in `validateCsrf`: server rejects mismatched Origin.
 *   - Constant-time compare of cookie vs. header.
 * The token itself is a synchronizer (not a session secret); JS-readability
 * does not weaken the model.
 */
export function issueCsrfCookie(cookies: AstroCookies): string {
  const token = generateToken();
  cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    secure: import.meta.env.PROD,
    sameSite: 'lax',
    path: '/',
    maxAge: TOKEN_TTL_SECONDS,
  });
  return token;
}
