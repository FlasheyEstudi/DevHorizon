// =============================================================================
// /api/users/me
// =============================================================================
// GET   /api/users/me    -> Devuelve el user actual (equivale a /api/auth/me).
// PATCH /api/users/me    -> Edita name, phone, locale del user actual.
//
// Body (Zod .strict): { name?, phone?, locale? }
//
// Reglas:
//   - Auth requerida (401).
//   - CSRF validado en PATCH (403).
//   - No se puede cambiar `email`, `role`, `password`, ni `avatar` desde
//     aca (email/password tienen endpoints dedicados; avatar va por
//     FormData en /api/users/me/avatar; role solo se promueve via
//     /api/stores POST).
// =============================================================================

import type { APIRoute } from 'astro';
import { z } from 'zod';
import { pocketbaseFor } from '../../../lib/pocketbase';
import { validateCsrf } from '../../../lib/auth/csrf';
import { setAuthCookie } from '../../../lib/auth/cookie';

export const prerender = false;

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const PatchBodySchema = z
  .object({
    name: z.string().min(2).max(120).optional(),
    phone: z.string().max(40).optional(),
    locale: z.enum(['es', 'en']).optional(),
  })
  .strict();

export const GET: APIRoute = async ({ request }) => {
  const pb = pocketbaseFor(request);
  if (!pb.authStore.record) {
    return jsonResponse({ user: null }, 401);
  }
  return jsonResponse({ user: pb.authStore.record }, 200);
};

export const PATCH: APIRoute = async ({ request, cookies }) => {
  // 1. CSRF.
  const csrfError = validateCsrf(request, cookies);
  if (csrfError) return csrfError;

  // 2. Auth.
  const pb = pocketbaseFor(request);
  const authRecord = pb.authStore.record;
  if (!authRecord) {
    return jsonResponse({ error: 'unauthorized' }, 401);
  }

  // 3. Body parse.
  const raw = await request.json().catch(() => null);
  const parsed = PatchBodySchema.safeParse(raw);
  if (!parsed.success) {
    return jsonResponse(
      { error: 'validation', details: z.flattenError(parsed.error) },
      400
    );
  }

  if (Object.keys(parsed.data).length === 0) {
    return jsonResponse({ error: 'no_fields' }, 400);
  }

  // 4. PB update.
  try {
    const user = await pb.collection('users').update(authRecord.id, parsed.data);
    // Refrescar la cookie pb_auth con el record actualizado (mismo motivo
    // que en /api/stores POST: el cookie guarda un snapshot del user y si
    // no lo actualizamos, /api/auth/me devuelve datos stale).
    if (pb.authStore.token) {
      setAuthCookie(cookies, pb.authStore.token, user);
    }
    return jsonResponse({ user }, 200);
  } catch (err: unknown) {
    const pbErr = err as { data?: { data?: Record<string, string> } };
    return jsonResponse(
      { error: 'update_failed', details: pbErr?.data?.data ?? {} },
      500
    );
  }
};