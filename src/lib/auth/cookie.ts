// =============================================================================
// cookie.ts — Single source for `pb_auth` Set-Cookie writes.
//
// Per design §3.2 + spec REQ-D1..D3:
//   HttpOnly always.
//   Secure only when import.meta.env.PROD (dev needs plain http://localhost).
//   SameSite=Lax so email-link top-level navigations still send the cookie.
//   Path=/, Max-Age=604800 (7 days, matches PB JWT lifetime).
//
// Only the login / register / logout endpoints and middleware should call
// these helpers. Page components MUST NOT touch cookies directly.
// =============================================================================

import type { AstroCookies } from 'astro';
import type { RecordModel } from 'pocketbase';

export const AUTH_COOKIE_NAME = 'pb_auth';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

interface AuthCookiePayload {
  token: string;
  record: RecordModel | null;
}

export function setAuthCookie(
  cookies: AstroCookies,
  token: string,
  record: RecordModel | null
): void {
  // Payload shape must match what PocketBase SDK 0.27 expects in
  // `loadFromCookie`: `{token, record}`. The previous `{token, model}`
  // shape broke auth — `loadFromCookie` reads `.record` (not `.model`)
  // so `Astro.locals.user` was always null after login.
  //
  // The value is JSON-encoded (no extra encodeURIComponent) — Astro's
  // `cookies.set` runs the value through the standard `cookie.serialize`
  // which encodes ONCE. Pre-encoding here would double-encode and break
  // the cookie parser on the read side.
  const payload: AuthCookiePayload = { token, record };
  cookies.set(AUTH_COOKIE_NAME, JSON.stringify(payload), {
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  });

  // Cookie ligera de señalización legible por JS cliente:
  // Permite saber al frontend (ej. sincronización de carrito) si el usuario
  // está autenticado sin exponer el token JWT seguro (HttpOnly).
  cookies.set('pb_has_session', '1', {
    httpOnly: false,
    secure: import.meta.env.PROD,
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  });
}

export function clearAuthCookie(cookies: AstroCookies): void {
  cookies.delete(AUTH_COOKIE_NAME, { path: '/' });
  cookies.delete('pb_has_session', { path: '/' });
}
