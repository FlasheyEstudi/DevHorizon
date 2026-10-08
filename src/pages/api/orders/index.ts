// =============================================================================
// /api/orders
// =============================================================================
// GET  /api/orders        -> lista orders del usuario actual
// POST /api/orders        -> crea una orden desde el carrito actual
//
// POST body: { shipping_address: {...}, payment_method: string, notes?: string }
// =============================================================================

import type { APIRoute } from 'astro';
import { z } from 'zod';
import { pocketbaseWithAuth } from '../../../lib/pocketbase';
import { pbFileUrl } from '../../../lib/pb-url';
import { validateCsrf } from '../../../lib/auth/csrf';

export const prerender = false;

const ItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().min(1),
  name: z.string().optional(),
  price: z.number().optional(),
  image: z.string().optional().nullable(),
});

const CreateOrderSchema = z.object({
  shipping_address: z.object({
    name: z.string(),
    phone: z.string(),
    address: z.string(),
    city: z.string(),
    department: z.string().optional(),
    reference: z.string().optional(),
  }),
  payment_method: z.enum(['cash', 'transfer', 'card', 'other']).default('cash'),
  notes: z.string().optional(),
  items: z.array(ItemSchema).optional(),
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
    const orders = await pb.collection('orders').getList(1, 50, {
      sort: '-created_at',
      filter: pb.filter('user = {:userId}', { userId: pb.authStore.record.id }),
    });
    return new Response(JSON.stringify(orders), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Error al listar ordenes' }), {
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
  const parsed = CreateOrderSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({
      error: 'Datos invalidos',
      details: z.flattenError(parsed.error),
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Obtener items del carrito de DB.
    const dbCartItems = await pb.collection('cart_items').getFullList({
      filter: pb.filter('user = {:userId}', { userId: pb.authStore.record.id }),
      expand: 'product',
    }).catch(() => []);

    let rawItems: Array<{ productId: string; quantity: number; name?: string; price?: number; image?: string | null }> = [];

    if (dbCartItems.length > 0) {
      rawItems = dbCartItems.map((ci) => {
        const prod = ci.expand?.product;
        const img = prod?.images?.[0] ? pbFileUrl('products', prod.id, prod.images[0]) : undefined;
        return {
          productId: ci.product,
          quantity: ci.quantity,
          name: prod?.name,
          price: prod?.price,
          image: img,
        };
      });
    } else if (parsed.data.items && parsed.data.items.length > 0) {
      rawItems = parsed.data.items;
    }

    if (rawItems.length === 0) {
      return new Response(JSON.stringify({ error: 'El carrito esta vacio' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Consultar la colección 'products' para obtener los precios reales y nombres actualizados
    const productIds = Array.from(new Set(rawItems.map((i) => i.productId)));
    const filterQuery = productIds.map((id) => `id = "${id}"`).join(' || ');
    const fetchedProducts = await pb.collection('products').getFullList({
      filter: filterQuery,
    }).catch(() => []);

    const productMap = new Map(fetchedProducts.map((p) => [p.id, p]));

    const items = rawItems.map((i) => {
      const dbProduct = productMap.get(i.productId);
      const dbPrice = dbProduct?.price ? Number(dbProduct.price) : 0;
      const clientPrice = i.price ? Number(i.price) : 0;
      const price = dbPrice > 0 ? dbPrice : clientPrice;
      const name = dbProduct?.name ?? i.name ?? 'Producto';
      const image = (dbProduct?.images?.[0] ? pbFileUrl('products', dbProduct.id, dbProduct.images[0]) : '') || i.image || '';
      return {
        productId: i.productId,
        name,
        price,
        quantity: Math.max(1, i.quantity),
        image,
      };
    });

    const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

    if (total <= 0) {
      return new Response(JSON.stringify({ error: 'El total de la orden debe ser mayor a C$ 0.00' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Crear orden.
    const order = await pb.collection('orders').create({
      user: pb.authStore.record.id,
      items,
      total,
      status: 'pending',
      shipping_address: parsed.data.shipping_address,
      payment_method: parsed.data.payment_method,
      notes: parsed.data.notes || '',
    });

    // Vaciar carrito en DB si existia.
    for (const ci of dbCartItems) {
      await pb.collection('cart_items').delete(ci.id).catch(() => {});
    }

    return new Response(JSON.stringify({ order }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    return new Response(JSON.stringify({
      error: 'Error al crear la orden',
      details: String(err),
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};