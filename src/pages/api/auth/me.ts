// =============================================================================
// GET /api/auth/me
// =============================================================================
// Returns the current authenticated user based on Astro.locals.user (set by
// middleware on every SSR request). locals.user is authoritative — no
// fallback to PB.getOne is needed.
//
// Returns:
//   - 200 { user: { id, email, name, role, avatar, locale } } when authed.
//   - 401 { user: null } when anonymous.
//
// Per spec REQ-B1 + design §6: middleware already ran maybeRefresh() and
// populated locals.user from the pb_auth cookie. This endpoint just reads
// that.
// =============================================================================

import type { APIRoute } from 'astro';

export const prerender = false;

interface PublicUser {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar: string;
  locale: string;
}

function pickPublicFields(
  user: Record<string, unknown> | null
): PublicUser | null {
  if (!user || typeof user !== 'object') return null;
  const id = typeof user.id === 'string' ? user.id : '';
  const email = typeof user.email === 'string' ? user.email : '';
  const name = typeof user.name === 'string' ? user.name : '';
  const role = typeof user.role === 'string' ? user.role : '';
  const avatar = typeof user.avatar === 'string' ? user.avatar : '';
  const locale = typeof user.locale === 'string' ? user.locale : '';
  return { id, email, name, role, avatar, locale };
}

export const GET: APIRoute = async ({ locals }) => {
  const publicUser = pickPublicFields(
    locals.user as Record<string, unknown> | null
  );

  if (!publicUser) {
    return new Response(JSON.stringify({ user: null }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ user: publicUser }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};