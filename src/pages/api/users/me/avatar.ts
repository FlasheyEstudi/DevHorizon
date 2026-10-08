// =============================================================================
// POST /api/users/me/avatar
// =============================================================================
// Sube/actualiza el avatar del user actual.
//
// Content-Type: multipart/form-data
// Body field: `avatar` (file, image/jpeg|png|webp, max 5MB — mismos
// limites que la coleccion users).
//
// Patrón: reusamos el campo `avatar` del users collection. PB soporta
// file fields en updates via FormData (con `multipart/form-data`).
//
// Devuelve 200 con { user } (incluye el nuevo avatar filename).
// =============================================================================

import type { APIRoute } from 'astro';
import { pocketbaseFor } from '../../../../lib/pocketbase';
import { validateCsrf } from '../../../../lib/auth/csrf';
import { setAuthCookie } from '../../../../lib/auth/cookie';

export const prerender = false;

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export const POST: APIRoute = async ({ request, cookies }) => {
  // 1. CSRF (header-based, mismo patron que el resto de la API).
  const csrfError = validateCsrf(request, cookies);
  if (csrfError) return csrfError;

  // 2. Auth.
  const pb = pocketbaseFor(request);
  const authRecord = pb.authStore.record;
  if (!authRecord) {
    return jsonResponse({ error: 'unauthorized' }, 401);
  }

  // 3. Parse multipart.
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonResponse({ error: 'invalid_form' }, 400);
  }

  const file = form.get('avatar');
  if (!(file instanceof File)) {
    return jsonResponse({ error: 'no_file' }, 400);
  }
  if (file.size === 0) {
    return jsonResponse({ error: 'empty_file' }, 400);
  }
  if (file.size > MAX_BYTES) {
    return jsonResponse({ error: 'too_large', maxBytes: MAX_BYTES }, 400);
  }
  if (!ALLOWED_MIMES.has(file.type)) {
    return jsonResponse(
      { error: 'invalid_mime', allowed: Array.from(ALLOWED_MIMES) },
      400
    );
  }

  // 4. PB update con FormData.
  try {
    const data = new FormData();
    data.append('avatar', file);
    const user = await pb.collection('users').update(authRecord.id, data);
    // Refrescar cookie con el nuevo filename de avatar (sino el Header
    // muestra el avatar viejo).
    if (pb.authStore.token) {
      setAuthCookie(cookies, pb.authStore.token, user);
    }
    return jsonResponse({ user }, 200);
  } catch (err: unknown) {
    const pbErr = err as { data?: { data?: Record<string, string> } };
    return jsonResponse(
      { error: 'upload_failed', details: pbErr?.data?.data ?? {} },
      500
    );
  }
};