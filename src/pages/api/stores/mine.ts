// =============================================================================
// /api/stores/mine
// =============================================================================
// GET /api/stores/mine -> Retorna la tienda del usuario autenticado actual.
// Devuelve 200 { store } o 200 { store: null } si el usuario no tiene tienda.
// Devuelve 401 si no esta autenticado.
// =============================================================================

import type { APIRoute } from 'astro';
import { pocketbaseFor } from '../../../lib/pocketbase';

export const prerender = false;

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const GET: APIRoute = async ({ request, locals }) => {
  const pb = locals.pb ?? pocketbaseFor(request);
  if (!pb.authStore.isValid || !pb.authStore.record) {
    return jsonResponse({ error: 'No autenticado' }, 401);
  }

  const userId = pb.authStore.record.id;

  try {
    const store = await pb.collection('stores').getFirstListItem(`owner = "${userId}"`);
    return jsonResponse({ store }, 200);
  } catch (err: unknown) {
    // Si no se encuentra la tienda, retornar store: null de forma limpia
    const status = (err as { status?: number }).status;
    if (status === 404) {
      return jsonResponse({ store: null }, 200);
    }
    return jsonResponse({ error: 'Error al consultar la tienda del usuario' }, 500);
  }
};
