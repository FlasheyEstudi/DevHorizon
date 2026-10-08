// =============================================================================
// /api/cart
// =============================================================================
// GET  /api/cart          -> lista items del carrito del usuario actual
// POST /api/cart          -> { productId, quantity }  agrega o actualiza item
//
// Requiere sesion activa (cookie pb_auth).
// =============================================================================

import type { APIRoute } from 'astro';
import { z } from 'zod';
import { pocketbaseWithAuth } from '../../../lib/pocketbase';
import { validateCsrf } from '../../../lib/auth/csrf';

export const prerender = false;

const AddItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).default(1),
});

export const GET: APIRoute = async ({ request }) => {
  const pb = pocketbaseWithAuth(request.headers.get('cookie'));

  if (!pb.authStore.isValid || !pb.authStore.record) {
    return new Response(JSON.stringify({ error: 'No autenticado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const items = await pb.collection('cart_items').getFullList({
      sort: '-created_at',
      filter: pb.filter('user = {:userId}', { userId: pb.authStore.record.id }),
      expand: 'product',
    });
    return new Response(JSON.stringify({ items }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Error al listar carrito' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const POST: APIRoute = async ({ request, cookies }) => {
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

  const body = await request.json().catch(() => null);
  const parsed = AddItemSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'Datos invalidos' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Buscar si ya existe el item (unique index user+product).
    const existing = await pb.collection('cart_items').getList(1, 1, {
      filter: pb.filter('user = {:userId} && product = {:productId}', {
        userId: pb.authStore.record.id,
        productId: parsed.data.productId,
      }),
    });

    let item;
    if (existing.items.length > 0) {
      // Incrementar cantidad.
      item = await pb.collection('cart_items').update(existing.items[0].id, {
        quantity: existing.items[0].quantity + parsed.data.quantity,
      });
    } else {
      item = await pb.collection('cart_items').create({
        user: pb.authStore.record.id,
        product: parsed.data.productId,
        quantity: parsed.data.quantity,
      });
    }

    return new Response(JSON.stringify({ item }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Error al agregar al carrito' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};