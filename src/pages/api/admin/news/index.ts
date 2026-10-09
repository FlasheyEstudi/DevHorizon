// =============================================================================
// /api/admin/news
// =============================================================================
// GET  /api/admin/news  -> Lista noticias (TODOS los estados) para el panel.
//                          Query: ?status=draft|published&page=&perPage=
// POST /api/admin/news  -> Crea una noticia.
//
// POST body (multipart/form-data):
//   - title: string     (required)
//   - slug: string      (optional, ^[a-z0-9-]+$; se deriva del titulo si falta)
//   - summary: string   (optional)
//   - content: string   (required, HTML del editor)
//   - category: string  (optional, uno de NEWS_CATEGORIES)
//   - status: string    (optional, default 'draft')
//   - image: File       (optional, max 5MB, jpeg/png/webp)
//
// Reglas:
//   - Auth + rol admin (401/403). CSRF validado (403).
//   - Slug unico (409).
//   - status default 'draft' para no publicar por accidente.
//
// Devuelve 201 con { news }.
// =============================================================================

import type { APIRoute } from 'astro';
import { z } from 'zod';
import { validateCsrf } from '../../../../lib/auth/csrf';
import { jsonResponse, requireAdminContext } from '../../../../lib/api/admin';
import { slugify } from '../../../../lib/slugify';

export const prerender = false;

const SLUG_PATTERN = /^[a-z0-9-]+$/;
const NEWS_CATEGORIES = ['tradicion', 'nuevos_productos', 'comunidad', 'eventos'] as const;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const CreateBodySchema = z
  .object({
    title: z.string().min(2).max(200),
    slug: z.string().min(2).max(200).regex(SLUG_PATTERN).optional(),
    summary: z.string().max(500).optional().default(''),
    content: z.string().min(1).max(100000),
    category: z.enum(NEWS_CATEGORIES).nullable().optional(),
    status: z.enum(['draft', 'published']).optional().default('draft'),
  })
  .strict();

export const GET: APIRoute = async (context) => {
  const guarded = requireAdminContext(context);
  if (guarded instanceof Response) return guarded;
  const { pb } = guarded;

  const status = context.url.searchParams.get('status');
  const pageParam = parseInt(context.url.searchParams.get('page') ?? '1', 10);
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;
  const perPageParam = parseInt(context.url.searchParams.get('perPage') ?? '50', 10);
  const perPage = Number.isInteger(perPageParam) && perPageParam > 0 ? Math.min(perPageParam, 200) : 50;

  const filters: string[] = [];
  if (status === 'draft' || status === 'published') {
    filters.push(pb.filter('status = {:status}', { status }));
  }

  try {
    const list = await pb.collection('news').getList(page, perPage, {
      sort: '-created_at',
      filter: filters.join(' && '),
    });
    return jsonResponse(list, 200);
  } catch {
    return jsonResponse({ error: 'list_failed' }, 500);
  }
};

export const POST: APIRoute = async (context) => {
  const csrfError = validateCsrf(context.request, context.cookies);
  if (csrfError) return csrfError;

  const guarded = requireAdminContext(context);
  if (guarded instanceof Response) return guarded;
  const { pb } = guarded;

  let form: FormData;
  try {
    form = await context.request.formData();
  } catch {
    return jsonResponse({ error: 'invalid_form' }, 400);
  }

  // Imagen opcional.
  const imageRaw = form.get('image');
  const imageFile = imageRaw instanceof File && imageRaw.size > 0 ? imageRaw : null;
  if (imageFile) {
    if (imageFile.size > MAX_IMAGE_BYTES) {
      return jsonResponse({ error: 'image_too_large', maxBytes: MAX_IMAGE_BYTES }, 400);
    }
    if (!ALLOWED_IMAGE_MIMES.has(imageFile.type)) {
      return jsonResponse({ error: 'image_invalid_mime', allowed: Array.from(ALLOWED_IMAGE_MIMES) }, 400);
    }
  }

  const title = form.get('title')?.toString() ?? '';
  const parsed = CreateBodySchema.safeParse({
    title,
    slug: form.get('slug')?.toString().trim() || undefined,
    summary: form.get('summary')?.toString() ?? '',
    content: form.get('content')?.toString() ?? '',
    category: form.get('category')?.toString() || null,
    status: form.get('status')?.toString() || 'draft',
  });
  if (!parsed.success) {
    return jsonResponse({ error: 'validation', details: z.flattenError(parsed.error) }, 400);
  }

  const slug = parsed.data.slug || slugify(title);
  if (!slug || !SLUG_PATTERN.test(slug)) return jsonResponse({ error: 'invalid_slug' }, 400);

  try {
    const dup = await pb
      .collection('news')
      .getList(1, 1, { filter: pb.filter('slug = {:slug}', { slug }) });
    if (dup.items.length > 0) return jsonResponse({ error: 'slug_taken' }, 409);
  } catch {
    // El indice unico es la garantia real.
  }

  try {
    const news = await pb.collection('news').create({
      title: parsed.data.title.trim(),
      slug,
      summary: parsed.data.summary,
      content: parsed.data.content,
      category: parsed.data.category ?? '',
      status: parsed.data.status,
      ...(imageFile && { image: imageFile }),
    });
    return jsonResponse({ news }, 201);
  } catch (err: unknown) {
    const pbErr = err as { data?: { data?: Record<string, string> } };
    return jsonResponse({ error: 'create_failed', details: pbErr?.data?.data ?? {} }, 500);
  }
};
