// =============================================================================
// GET /api/dashboard/stats
// =============================================================================
// Devuelve las estadisticas agregadas del seller actual para mostrar en
// la seccion Dashboard del perfil.
//
// Response 200:
//   {
//     store: {...},
//     products: { total, published, draft, archived },
//     reviews: { avg, count },
//     orders: { total, byStatus: { pending, paid, shipped, delivered, cancelled } },
//     revenue: { total, thisMonth, lastMonth }
//   }
//
// Estrategia de calculo:
//   - Products: counts via filtros PB (rapido, un solo getList por estado).
//   - Reviews: avg y count agregados en products.rating_avg / rating_count,
//     los promediamos nosotros para el seller.
//   - Orders + revenue: PB no soporta filter sobre `orders.items[]` (es
//     JSON, no relation). Hacemos 2 fetches paralelos y filtramos en
//     server-side:
//       1. Productos del seller (saber que product IDs son "mios").
//       2. Todas las orders (con `expand=product` para casos donde querramos
//          datos del producto, aunque para el filtro usamos items[].productId).
//     Filtramos client-side las orders que tengan al menos un item con
//     productId ∈ mis_product_ids. Para MVP esta OK; si crece, denormalizar
//     orders.store (relation) y filtrar por ahi.
// =============================================================================

import type { APIRoute } from 'astro';
import { pocketbaseFor, ensureAdminAuth } from '../../../lib/pocketbase';

export const prerender = false;

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

interface OrderRecord {
  id: string;
  items: OrderItem[];
  total: number;
  status: string;
  created_at: string;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function startOfPrevMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() - 1, 1);
}

export const GET: APIRoute = async ({ request }) => {
  const pb = pocketbaseFor(request);
  const authRecord = pb.authStore.record;
  if (!authRecord) {
    return jsonResponse({ error: 'unauthorized' }, 401);
  }

  // 1. Encontrar el store del user.
  let store;
  try {
    const stores = await pb
      .collection('stores')
      .getList(1, 1, { filter: pb.filter('owner = {:ownerId}', { ownerId: authRecord.id }) });
    if (stores.items.length === 0) {
      return jsonResponse({ error: 'no_store' }, 404);
    }
    store = stores.items[0];
  } catch {
    return jsonResponse({ error: 'store_lookup_failed' }, 500);
  }

  const storeId = store.id;

  // 2. Fetches en paralelo: productos del vendedor + órdenes del sistema
  //    (usando cliente administrativo en servidor para superar la listRule
  //    restrictiva de orders que solo permite ver al comprador, garantizando
  //    cálculo real de ventas e ingresos para el artesano).
  const productsPromise = pb.collection('products').getFullList({
    filter: pb.filter('store = {:storeId}', { storeId }),
    fields: 'id,rating_avg,rating_count,status',
  });

  const ordersPromise = (async () => {
    try {
      const adminPb = await ensureAdminAuth();
      return (await adminPb.collection('orders').getFullList({
        fields: 'id,items,total,status,created_at',
      })) as OrderRecord[];
    } catch {
      return (await pb.collection('orders').getFullList({
        fields: 'id,items,total,status,created_at',
      })) as OrderRecord[];
    }
  })();

  const [products, allOrders] = await Promise.all([productsPromise, ordersPromise]);

  // 3. Productos: counts por status.
  const productCounts = { total: 0, published: 0, draft: 0, archived: 0 };
  let ratingSum = 0;
  let ratingCount = 0;
  for (const p of products) {
    productCounts.total++;
    const s = (p as { status?: string }).status ?? 'draft';
    if (s === 'published') productCounts.published++;
    else if (s === 'draft') productCounts.draft++;
    else if (s === 'archived') productCounts.archived++;
    const rc = (p as { rating_count?: number }).rating_count ?? 0;
    const ra = (p as { rating_avg?: number }).rating_avg ?? 0;
    if (rc > 0) {
      ratingSum += ra * rc;
      ratingCount += rc;
    }
  }

  // 4. Reviews: avg ponderado (no promedio de promedios).
  const reviewsStats = {
    avg: ratingCount > 0 ? Math.round((ratingSum / ratingCount) * 10) / 10 : 0,
    count: ratingCount,
  };

  // 5. Orders: filtramos las que tengan items cuyo productId sea mio.
  const myProductIds = new Set(products.map((p) => p.id));
  const myOrders = allOrders.filter((order) =>
    (order.items ?? []).some((it) => myProductIds.has(it.productId))
  );

  // 6. Orders por status + revenue.
  const orderCounts = {
    total: myOrders.length,
    byStatus: {
      pending: 0,
      paid: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
    },
  };

  const now = new Date();
  const monthStart = startOfMonth(now);
  const prevMonthStart = startOfPrevMonth(now);

  let revenueTotal = 0;
  let revenueThisMonth = 0;
  let revenueLastMonth = 0;

  for (const order of myOrders) {
    const status = order.status as keyof typeof orderCounts.byStatus;
    if (status in orderCounts.byStatus) {
      orderCounts.byStatus[status]++;
    }

    // Revenue: solo contar items del seller en esta orden.
    const orderDate = new Date(order.created_at);
    let orderRevenue = 0;
    for (const it of order.items ?? []) {
      if (myProductIds.has(it.productId)) {
        orderRevenue += (it.price ?? 0) * (it.quantity ?? 0);
      }
    }
    revenueTotal += orderRevenue;

    if (orderDate >= monthStart) {
      revenueThisMonth += orderRevenue;
    } else if (orderDate >= prevMonthStart && orderDate < monthStart) {
      revenueLastMonth += orderRevenue;
    }
  }

  return jsonResponse(
    {
      store: {
        id: store.id,
        name: store.name,
        slug: store.slug,
        department: store.department,
        category: store.category,
      },
      products: productCounts,
      reviews: reviewsStats,
      orders: orderCounts,
      revenue: {
        total: revenueTotal,
        thisMonth: revenueThisMonth,
        lastMonth: revenueLastMonth,
      },
    },
    200
  );
};