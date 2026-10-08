// =============================================================================
// DELETE /api/cart/[productId]
// =============================================================================
// Elimina un item del carrito del usuario actual.
// =============================================================================

import type { APIRoute } from 'astro';
import { pocketbaseWithAuth } from '../../../lib/pocketbase';
import { validateCsrf } from '../../../lib/auth/csrf';

export const prerender = false;

export const DELETE: APIRoute = async ({ request, params, cookies }) => {
  // Validación de CSRF
  const csrfError = validateCsrf(request, cookies);
  if (csrfError) return csrfError;

  const pb = pocketbaseWithAuth(request.headers.get('cookie'));

  if (!pb.authStore.isValid || !pb.authStore.record) {
    return new Response(JSON.stringify({ error: 'No autenticado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const productId = params.productId;
  if (!productId) {
    return new Response(JSON.stringify({ error: 'productId requerido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const existing = await pb.collection('cart_items').getList(1, 1, {
      filter: pb.filter('user = {:userId} && product = {:productId}', {
        userId: pb.authStore.record.id,
        productId,
      }),
    });

    if (existing.items.length === 0) {
      return new Response(JSON.stringify({ error: 'Item no encontrado en carrito' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await pb.collection('cart_items').delete(existing.items[0].id);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Error al eliminar del carrito' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};