// =============================================================================
// middleware.ts — SSR auth middleware.
//
// Per design §6 + spec REQ-B1..B5, REQ-C2, REQ-D, REQ-F1..F2:
//
//   1. Attach `locals.pb` (per-request PB client) and `locals.user`
//      (PB authStore.record or null).
//   2. Run `maybeRefresh(pb)` so long sessions rotate near-expiry tokens
//      without paying a refresh round-trip on every request.
//   3. Issue the `csrf-token` cookie on safe GETs that don't have one, so
//      forms rendered on those pages get a fresh double-submit token.
//   4. Guard /perfil and /carrito — redirect anonymous users to
//      /login?next=<encoded path+search>.
//   5. Inverse-guard /login and /registro — redirect authed users to /.
//
// Static/prerendered pages still get middleware applied at build time, but
// `locals` is irrelevant there since no auth-dependent code runs. The Vercel
// adapter treats dynamic routes as SSR.
// =============================================================================

import { defineMiddleware } from 'astro:middleware';
import { pocketbaseFor, getPocketBaseUrl } from './lib/pocketbase';
import { maybeRefresh, decodeJwtPayload } from './lib/auth/refresh';
import { issueCsrfCookie, CSRF_COOKIE_NAME } from './lib/auth/csrf';
import { setAuthCookie, AUTH_COOKIE_NAME } from './lib/auth/cookie';
import { getLangFromUrl, getPathWithoutLocale } from './i18n/utils';

const PROTECTED_PATHS = ['/perfil', '/carrito', '/orden'];
const AUTH_PAGES = ['/login', '/registro'];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export const onRequest = defineMiddleware(async (context, next) => {
  // Vercel adapter + `output: 'static'` + `prerender = false` per route means
  // every dynamic route here is SSR. We tag locals so downstream code can
  // branch on it if needed.
  context.locals.runtime = 'ssr';

  // 1. Per-request PB client + auth refresh.
  await getPocketBaseUrl();
  const pb = pocketbaseFor(context.request);
  context.locals.pb = pb;

  // Capture the pre-refresh token so we can detect rotation after maybeRefresh.
  // When the access token is rotated, the rotated token must be written back to
  // the response cookie so subsequent requests see the new token (per design §3.1
  // + spec REQ-F1). Without this, the rotated token only lives in `pb.authStore`
  // for the current request and is silently lost on the next one.
  const previousToken = pb.authStore.token;

  await maybeRefresh(pb);

  // H-04: Verificar que el record en memoria corresponda auténticamente al token JWT.
  if (pb.authStore.token && pb.authStore.record) {
    const jwtPayload = decodeJwtPayload(pb.authStore.token);
    if (!jwtPayload || !pb.authStore.isValid || (jwtPayload.id && jwtPayload.id !== pb.authStore.record.id)) {
      // Cookie alterada o token inconsistente: anular la sesión inmediatamente
      pb.authStore.clear();
      context.locals.user = null;
      context.cookies.delete(AUTH_COOKIE_NAME, { path: '/' });
      context.cookies.delete('pb_has_session', { path: '/' });
    } else {
      context.locals.user = pb.authStore.record;
    }
  } else {
    context.locals.user = null;
  }

  if (pb.authStore.token && pb.authStore.token !== previousToken && context.locals.user) {
    setAuthCookie(context.cookies, pb.authStore.token, pb.authStore.record);
  } else if (!pb.authStore.token && context.cookies.has(AUTH_COOKIE_NAME)) {
    // Token limpiado o expirado: eliminar cookies de sesión
    context.cookies.delete(AUTH_COOKIE_NAME, { path: '/' });
    context.cookies.delete('pb_has_session', { path: '/' });
  }

  // 2. Issue CSRF cookie on safe GETs to any page that doesn't have one.
  //    The cookie is JS-readable (SameSite=Lax + Origin allowlist are the
  //    actual CSRF defense); client scripts read it via `document.cookie`
  //    and echo it as the `x-csrf-token` header (double-submit pattern).
  if (
    context.request.method === 'GET' &&
    context.url.pathname.startsWith('/') &&
    !context.cookies.has(CSRF_COOKIE_NAME)
  ) {
    issueCsrfCookie(context.cookies);
  }

  // 3. Route guards.
  const path = context.url.pathname;
  const lang = getLangFromUrl(context.url);
  const redirectPrefix = lang === 'es' ? '' : `/${lang}`;
  const normalizedPath = getPathWithoutLocale(path);

  if (isProtectedPath(normalizedPath) && !context.locals.user) {
    const nextParam = encodeURIComponent(context.url.pathname + context.url.search);
    return context.redirect(`${redirectPrefix}/login?next=${nextParam}`);
  }

  if (AUTH_PAGES.includes(normalizedPath) && context.locals.user) {
    return context.redirect(`${redirectPrefix}/`);
  }

  return next();
});
