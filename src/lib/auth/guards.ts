// =============================================================================
// guards.ts — SSR route guards.
//
// Per design §3.4 + spec REQ-B4..B5:
//   requireUser(Astro): returns a redirect Response if no user, otherwise
//     the typed `{ user }` object. Callers should `if (guard instanceof
//     Response) return guard;` then destructure.
//   requireRole(Astro, roles): same, plus an extra role check. Roles are
//     compared against the PB user record's `role` field.
//
//   The `next` query param encodes the original pathname (+ search) so the
//   login page can bounce the user back after a successful sign-in.
// =============================================================================

import type { APIContext } from 'astro';
import type { RecordModel } from 'pocketbase';
import { getLangFromUrl } from '../../i18n/utils';

type GuardResult = Response | { user: RecordModel };

interface RoleCarrier {
  role?: string;
}

export function requireUser(Astro: APIContext): GuardResult {
  const user = Astro.locals.user;
  if (!user) {
    const lang = getLangFromUrl(Astro.url);
    const redirectPrefix = lang === 'es' ? '' : `/${lang}`;
    const next = encodeURIComponent(Astro.url.pathname + Astro.url.search);
    return Astro.redirect(`${redirectPrefix}/login?next=${next}`);
  }
  return { user };
}

export function requireRole(Astro: APIContext, roles: string[]): GuardResult {
  const guard = requireUser(Astro);
  if (guard instanceof Response) return guard;
  const role = (guard.user as RecordModel & RoleCarrier).role ?? '';
  if (!roles.includes(role)) {
    return new Response('Forbidden', { status: 403 });
  }
  return guard;
}
