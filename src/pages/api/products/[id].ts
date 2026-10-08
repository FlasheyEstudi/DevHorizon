// =============================================================================
// /api/products/[id]
// =============================================================================
// PUT    /api/products/[id]  -> Edita un producto propio.
// DELETE /api/products/[id]  -> Elimina un producto propio.
//
// Reglas:
//   - Auth requerida (401).
//   - CSRF validado (403).
//   - Owner check: product.store.owner === authRecord.id (mismo patron que
//     /api/reviews). Admin puede editar/borrar cualquier producto.
//   - PUT no permite cambiar `store` ni `rating_avg`/`rating_count`
//     (esos los mantiene PB/hooks server-side).
//   - DELETE es hard delete (PB no tiene soft delete en este schema).
//
// PUT body (multipart/form-data), todos opcionales:
//   - name, slug, description, price, stock, categories, status, tags, images.
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

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const UpdateBodySchema = z
  .object({
    name: z.string().min(2).max(200).optional(),
    slug: z.string().min(2).max(120).regex(SLUG_PATTERN).optional(),
    description: z.string().max(5000).optional(),
    price: z.number().min(0).optional(),
    stock: z.number().int().min(0).optional(),
    categories: z.array(z.string()).max(5).optional(),
    status: z.enum(['draft', 'published', 'archived']).optional(),
    tags: z.array(z.string()).optional(),
    images: z.array(z.instanceof(File)).max(8).optional(),
  })
  .strict();

async function authorize(
  pb: ReturnType<typeof pocketbaseFor>,
  productId: string
): Promise<
  | { ok: true; product: { id: string; store?: string; status?: string } }
  | { ok: false; status: number; error: string }
> {
  const authRecord = pb.authStore.record;
  if (!authRecord) return { ok: false, status: 401, error: 'unauthorized' };

  let product: { id: string; store?: string; status?: string };
  try {
    product = (await pb.collection('products').getOne(productId)) as typeof product;
  } catch {
    return { ok: false, status: 404, error: 'not_found' };
  }

  // Owner check via product.store.owner === authRecord.id.
  // Reusamos el patron exacto de /api/reviews/index.ts:127-139.
  try {
    const store = await pb.collection('stores').getOne(product.store as string);
    const isOwner = store.owner === authRecord.id;
    const isAdmin = (authRecord as { role?: string }).role === 'admin';
    if (!isOwner && !isAdmin) {
      return { ok: false, status: 403, error: 'forbidden' };
    }
  } catch {
    return { ok: false, status: 404, error: 'store_not_found' };
  }

  return { ok: true, product };
}

export const PUT: APIRoute = async ({ request, cookies, params }) => {
  // 1. CSRF.
  const csrfError = validateCsrf(request, cookies);
  if (csrfError) return csrfError;

  // 2. Param.
  const productId = params.id;
  if (!productId) return jsonResponse({ error: 'missing_id' }, 400);

  // 3. Auth + owner.
  const pb = pocketbaseFor(request);
  const auth = await authorize(pb, productId);
  if (!auth.ok) return jsonResponse({ error: auth.error }, auth.status);

  // 4. Body parse (soporta multipart/form-data y application/json para updates rápidos).
  const contentType = request.headers.get('content-type') || '';
  const candidate: Record<string, unknown> = {};
  let imagesRaw: File[] = [];

  if (contentType.includes('application/json')) {
    let jsonBody: Record<string, unknown>;
    try {
      jsonBody = await request.json();
    } catch {
      return jsonResponse({ error: 'invalid_json' }, 400);
    }
    if (jsonBody.name !== undefined) candidate.name = String(jsonBody.name);
    if (jsonBody.slug !== undefined) candidate.slug = String(jsonBody.slug);
    if (jsonBody.description !== undefined) candidate.description = String(jsonBody.description);
    if (jsonBody.price !== undefined) candidate.price = Number(jsonBody.price);
    if (jsonBody.stock !== undefined) candidate.stock = Number(jsonBody.stock);
    if (jsonBody.status !== undefined) candidate.status = String(jsonBody.status);
    if (jsonBody.tags !== undefined) {
      candidate.tags = Array.isArray(jsonBody.tags)
        ? jsonBody.tags
        : String(jsonBody.tags).split(',').map((s) => s.trim()).filter(Boolean);
    }
    if (jsonBody.categories !== undefined) {
      candidate.categories = Array.isArray(jsonBody.categories) ? jsonBody.categories : [String(jsonBody.categories)];
    }
  } else {
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return jsonResponse({ error: 'invalid_form' }, 400);
    }

    imagesRaw = form.getAll('images').filter((v): v is File =>
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

    const tagsRaw = form.get('tags')?.toString();
    const categoriesRaw = form.getAll('categories').map((v) => v.toString()).filter(Boolean);

    const v = (key: string): string | undefined => {
      const got = form.get(key);
      return got == null ? undefined : got.toString();
    };

    const name = v('name');
    if (name !== undefined) candidate.name = name;
    const slug = v('slug');
    if (slug !== undefined) candidate.slug = slug;
    const description = v('description');
    if (description !== undefined) candidate.description = description;
    const priceRaw = v('price');
    if (priceRaw !== undefined) candidate.price = Number(priceRaw);
    const stockRaw = v('stock');
    if (stockRaw !== undefined) candidate.stock = Number(stockRaw);
    const status = v('status');
    if (status !== undefined) candidate.status = status;
    if (tagsRaw !== undefined) {
      candidate.tags = tagsRaw.split(',').map((s) => s.trim()).filter(Boolean);
    }
    if (categoriesRaw.length > 0) candidate.categories = categoriesRaw;
  }

  // Validamos con Zod (los campos son opcionales).
  const parsed = UpdateBodySchema.safeParse({
    ...candidate,
    images: imagesRaw,
  });
  if (!parsed.success) {
    return jsonResponse(
      { error: 'validation', details: z.flattenError(parsed.error) },
      400
    );
  }

  // 7. Si cambia slug, verificar unicidad.
  if (parsed.data.slug) {
    try {
      const existing = await pb
        .collection('products')
        .getList(1, 1, {
          filter: pb.filter('slug = {:slug} && id != {:productId}', {
            slug: parsed.data.slug,
            productId,
          }),
        });
      if (existing.items.length > 0) {
        return jsonResponse(
          { error: 'slug_taken', details: { slug: ['already_exists'] } },
          409
        );
      }
    } catch {
      // Fall through.
    }
  }

  // 8. PB update. Pasamos objeto plano con File values si hay imagen —
  //    el PB SDK convierte a multipart/form-data internamente cuando detecta
  //    un File. Si no hay imagen, solo campos escalares.
  try {
    const { images: _omitImages, ...scalarPayload } = parsed.data;
    const product = await pb.collection('products').update(productId, {
      ...scalarPayload,
      ...(imagesRaw.length > 0 && { images: imagesRaw }),
    });
    return jsonResponse({ product }, 200);
  } catch (err: unknown) {
    const pbErr = err as { data?: { data?: Record<string, string> } };
    const fieldErrors = pbErr?.data?.data ?? {};
    return jsonResponse(
      { error: 'update_failed', details: fieldErrors },
      500
    );
  }
};

export const PATCH: APIRoute = PUT;

export const DELETE: APIRoute = async ({ request, cookies, params }) => {
  // 1. CSRF.
  const csrfError = validateCsrf(request, cookies);
  if (csrfError) return csrfError;

  // 2. Param.
  const productId = params.id;
  if (!productId) return jsonResponse({ error: 'missing_id' }, 400);

  // 3. Auth + owner.
  const pb = pocketbaseFor(request);
  const auth = await authorize(pb, productId);
  if (!auth.ok) return jsonResponse({ error: auth.error }, auth.status);

  // 4. PB delete.
  try {
    await pb.collection('products').delete(productId);
    return new Response(null, { status: 204 });
  } catch {
    return jsonResponse({ error: 'delete_failed' }, 500);
  }
};