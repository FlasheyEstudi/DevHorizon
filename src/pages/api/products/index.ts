// =============================================================================
// /api/products
// =============================================================================
// GET  /api/products                 -> Lista productos publicados.
// POST /api/products                 -> Crea un producto (sellers/admin).
//
// POST body (multipart/form-data):
//   - name: string            (required)
//   - slug: string            (required, ^[a-z0-9-]+$)
//   - description: string     (optional)
//   - price: number-as-string (required, >= 0)
//   - stock: number-as-string (required, >= 0 int)
//   - categories: string[]    (optional, max 5)
//   - status: string          (optional, default 'draft')
//   - tags: string            (optional, comma-separated)
//   - images: File[]          (optional, max 1 en MVP; el schema soporta 8)
//
// Reglas:
//   - Auth requerida (401).
//   - CSRF validado via header (403).
//   - role ∈ ['seller', 'admin']. Si role='user' (sin tienda), 403.
//   - El user debe ser dueno de UN store; se asigna automaticamente.
//   - Slug unico (409 si existe).
//   - Categories, si vienen, deben existir como records.
//   - status default 'draft' para no publicar accidentalmente; el seller
//     puede cambiarlo despues con PUT.
//   - rating_avg y rating_count arrancan en 0 (los setea el PB default).
//
// Devuelve 201 con { product }.
// =============================================================================

import type { APIRoute } from 'astro';
import { z } from 'zod';
import { pocketbaseFor } from '../../../lib/pocketbase';
import { validateCsrf } from '../../../lib/auth/csrf';

export const prerender = false;

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const SLUG_PATTERN = /^[a-z0-9-]+$/;

const CreateBodySchema = z
  .object({
    name: z.string().min(2).max(200),
    slug: z.string().min(2).max(120).regex(SLUG_PATTERN),
    description: z.string().max(5000).optional().default(''),
    price: z.number().min(0),
    stock: z.number().int().min(0).default(0),
    categories: z.array(z.string()).max(5).optional().default([]),
    status: z.enum(['draft', 'published', 'archived']).optional().default('draft'),
    tags: z.array(z.string()).optional().default([]),
    images: z.array(z.instanceof(File)).max(8).optional().default([]),
  })
  .strict();

export const GET: APIRoute = async ({ request, url }) => {
  const pageParam = parseInt(url.searchParams.get('page') ?? '1', 10);
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;

  const perPageParam = parseInt(url.searchParams.get('perPage') ?? '30', 10);
  const perPage = Number.isInteger(perPageParam) && perPageParam > 0 ? Math.min(perPageParam, 100) : 30;

  const category = (url.searchParams.get('category') ?? '').trim();
  const search = (url.searchParams.get('search') ?? '').trim();
  const owner = url.searchParams.get('owner');

  // Modo publico: solo published. Modo ?owner=me: productos del seller
  // actual (cualquier status). Modo ?owner=<id>: filtro explicito.
  //
  // Importante: para `?owner=me` usamos un PB client AUTH'd, asi la listRule
  // de products deja pasar drafts y archivados del dueno (la regla default
  // solo permite `status = 'published'` a usuarios anonimos).
  const filters: string[] = [];
  let activePb: typeof import('../../../lib/pocketbase').pb;

  if (owner) {
    let ownerId = owner;
    if (owner === 'me') {
      const { pocketbaseFor } = await import('../../../lib/pocketbase');
      const pbAuth = pocketbaseFor(request);
      if (!pbAuth.authStore.record) {
        return jsonResponse({ error: 'unauthorized' }, 401);
      }
      ownerId = pbAuth.authStore.record.id;
      // Para ?owner=me usamos el cliente auth'd para que listRule permita
      // ver drafts/archivados del propio seller.
      activePb = pbAuth;
    } else {
      // ?owner=<id> explicito: sin auth, solo lo que la listRule publica deja ver.
      const { pb } = await import('../../../lib/pocketbase');
      activePb = pb;
    }

    // Buscar el store del owner y filtrar productos por ese store.
    let storeId: string | null = null;
    try {
      const stores = await activePb
        .collection('stores')
        .getList(1, 1, { filter: activePb.filter('owner = {:ownerId}', { ownerId }) });
      if (stores.items.length > 0) storeId = stores.items[0].id;
    } catch {
      // Ignore.
    }
    if (storeId) {
      filters.push(activePb.filter('store = {:storeId}', { storeId }));
    } else {
      // No hay store: devolver lista vacia.
      return jsonResponse({
        items: [],
        page: 1,
        perPage,
        totalItems: 0,
        totalPages: 0,
      }, 200);
    }
  } else {
    filters.push('status = "published"');
    const { pb } = await import('../../../lib/pocketbase');
    activePb = pb;
  }

  if (category) filters.push(activePb.filter('categories.slug ?~ {:category}', { category }));
  if (search) filters.push(activePb.filter('(name ~ {:search} || description ~ {:search})', { search }));

  try {
    const list = await activePb.collection('products').getList(page, perPage, {
      sort: '-created_at',
      filter: filters.join(' && '),
    });
    return jsonResponse(list, 200);
  } catch {
    return jsonResponse({ error: 'Error al listar productos' }, 500);
  }
};

// Constantes para validar la imagen.
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);

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

  // 3. Role gate.
  const role = (authRecord as { role?: string }).role;
  if (role !== 'seller' && role !== 'admin') {
    return jsonResponse({ error: 'not_seller' }, 403);
  }

  // 4. Body parse (multipart/form-data).
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonResponse({ error: 'invalid_form' }, 400);
  }

  // 5. Extraer y validar imagenes.
  const imagesRaw = form.getAll('images').filter((v): v is File =>
    v instanceof File && v.size > 0
  );
  if (imagesRaw.length > 0) {
    for (const img of imagesRaw) {
      if (img.size > MAX_IMAGE_BYTES) {
        return jsonResponse({ error: 'image_too_large', maxBytes: MAX_IMAGE_BYTES }, 400);
      }
      if (!ALLOWED_IMAGE_MIMES.has(img.type)) {
        return jsonResponse(
          { error: 'image_invalid_mime', allowed: Array.from(ALLOWED_IMAGE_MIMES) },
          400
        );
      }
    }
  }

  // 6. Validar el resto de los campos con Zod.
  //    FormData entrega todo como string, hacemos coercion a number para
  //    price/stock y split para tags/categories (los arrays llegan como
  //    multiples campos con el mismo name, separados por coma o uno por uno).
  const tagsRaw = form.get('tags')?.toString() ?? '';
  const categoriesRaw = form.getAll('categories').map((v) => v.toString()).filter(Boolean);

  const parsed = CreateBodySchema.safeParse({
    name: form.get('name')?.toString() ?? '',
    slug: form.get('slug')?.toString() ?? '',
    description: form.get('description')?.toString() ?? '',
    price: Number(form.get('price') ?? 'NaN'),
    stock: Number(form.get('stock') ?? '0'),
    status: form.get('status')?.toString() ?? 'draft',
    tags: tagsRaw.split(',').map((s) => s.trim()).filter(Boolean),
    categories: categoriesRaw,
    images: imagesRaw,
  });
  if (!parsed.success) {
    return jsonResponse(
      { error: 'validation', details: z.flattenError(parsed.error) },
      400
    );
  }

  // 7. Encontrar el store del user (un seller = una tienda).
  let storeId: string;
  try {
    const stores = await pb
      .collection('stores')
      .getList(1, 1, { filter: pb.filter('owner = {:ownerId}', { ownerId: authRecord.id }) });
    if (stores.items.length === 0) {
      return jsonResponse({ error: 'no_store' }, 409);
    }
    storeId = stores.items[0].id;
  } catch {
    return jsonResponse({ error: 'store_lookup_failed' }, 500);
  }

  // 8. Slug unico.
  try {
    const existing = await pb
      .collection('products')
      .getList(1, 1, { filter: `slug = "${parsed.data.slug}"` });
    if (existing.items.length > 0) {
      return jsonResponse(
        { error: 'slug_taken', details: { slug: ['already_exists'] } },
        409
      );
    }
  } catch {
    // Fall through; create falla igual.
  }

  // 9. Crear producto. Pasamos un objeto plano con File values si hay
  //    imagen — el PB SDK detecta automaticamente el File y convierte a
  //    multipart/form-data internamente (es la forma recomendada segun
  //    https://github.com/pocketbase/js-sdk#uploading-files).
  try {
    const basePayload = {
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description,
      price: parsed.data.price,
      stock: parsed.data.stock,
      categories: parsed.data.categories,
      status: parsed.data.status,
      tags: parsed.data.tags,
      store: storeId,
    };
    const product = await pb.collection('products').create({
      ...basePayload,
      ...(imagesRaw.length > 0 && { images: imagesRaw }),
    });
    return jsonResponse({ product }, 201);
  } catch (err: unknown) {
    const pbErr = err as { data?: { data?: Record<string, string> } };
    const fieldErrors = pbErr?.data?.data ?? {};
    const slugError = Object.values(fieldErrors).some(
      (v) => typeof v === 'string' && v.toLowerCase().includes('slug')
    );
    if (slugError) {
      return jsonResponse(
        { error: 'slug_taken', details: { slug: ['already_exists'] } },
        409
      );
    }
    return jsonResponse({ error: 'create_failed', details: fieldErrors }, 500);
  }
};