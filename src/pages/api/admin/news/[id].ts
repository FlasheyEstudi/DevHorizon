// =============================================================================
// /api/admin/news/[id]
// =============================================================================
// PUT    /api/admin/news/:id -> Actualiza una noticia (parcial).
// DELETE /api/admin/news/:id -> Elimina una noticia.
//
// PUT body (multipart/form-data, todos los campos opcionales):
//   title / slug / summary / content / category / status / image(File)
//
// Reglas:
//   - Auth + rol admin (401/403). CSRF en ambas mutaciones.
//   - Solo se actualizan los campos presentes en el form.
//   - Slug unico excluyendo la propia noticia (409).
//   - Si se manda `image` con contenido, reemplaza la imagen anterior.
//
// Devuelve { news } en PUT y { ok: true } en DELETE.
// =============================================================================

import type { APIRoute } from 'astro';
import type PocketBase from 'pocketbase';
import { z } from 'zod';
import { validateCsrf } from '../../../../lib/auth/csrf';
import { jsonResponse, requireAdminContext } from '../../../../lib/api/admin';
import { slugify } from '../../../../lib/slugify';

export const prerender = false;

const SLUG_PATTERN = /^[a-z0-9-]+$/;
const NEWS_CATEGORIES = ['tradicion', 'nuevos_productos', 'comunidad', 'eventos'] as const;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const UpdateBodySchema = z
  .object({
    title: z.string().min(2).max(200).optional(),
    slug: z.string().min(2).max(200).regex(SLUG_PATTERN).optional(),
    summary: z.string().max(500).optional(),
    content: z.string().min(1).max(100000).optional(),
    category: z.enum(NEWS_CATEGORIES).nullable().optional(),
    status: z.enum(['draft', 'published']).optional(),
  })
  .strict();

function isSlugAvailable(pb: PocketBase, slug: string, excludeId: string): Promise<boolean> {
  return pb
    .collection('news')
    .getFullList({ filter: pb.filter('slug = {:slug}', { slug }) })
    .then((list) => !list.some((r) => r.id !== excludeId))
    .catch(() => true);
}

export const PUT: APIRoute = async (context) => {
  const csrfError = validateCsrf(context.request, context.cookies);
  if (csrfError) return csrfError;

  const guarded = requireAdminContext(context);
  if (guarded instanceof Response) return guarded;
  const { pb } = guarded;

  const id = context.params.id;
  if (!id) return jsonResponse({ error: 'missing_id' }, 400);

  try {
    await pb.collection('news').getOne(id);
  } catch {
    return jsonResponse({ error: 'not_found' }, 404);
  }

  let form: FormData;
  try {
    form = await context.request.formData();
  } catch {
    return jsonResponse({ error: 'invalid_form' }, 400);
  }

  // Solo los campos presentes en el form.
  const raw: Record<string, unknown> = {};
  if (form.has('title')) raw.title = form.get('title')?.toString() ?? '';
  if (form.has('slug')) raw.slug = form.get('slug')?.toString() ?? '';
  if (form.has('summary')) raw.summary = form.get('summary')?.toString() ?? '';
  if (form.has('content')) raw.content = form.get('content')?.toString() ?? '';
  if (form.has('category')) raw.category = form.get('category')?.toString() || null;
  if (form.has('status')) raw.status = form.get('status')?.toString() || 'draft';

  const parsed = UpdateBodySchema.safeParse(raw);
  if (!parsed.success) {
    return jsonResponse({ error: 'validation', details: z.flattenError(parsed.error) }, 400);
  }

  const data = parsed.data;
  const payload: Record<string, unknown> = {};

  if (data.title !== undefined) payload.title = data.title.trim();
  if (data.summary !== undefined) payload.summary = data.summary;
  if (data.content !== undefined) payload.content = data.content;
  if (data.status !== undefined) payload.status = data.status;
  if (data.category !== undefined) payload.category = data.category ?? '';

  if (data.slug !== undefined) {
    const slug = data.slug.trim() || (data.title ? slugify(data.title) : '');
    if (!slug || !SLUG_PATTERN.test(slug)) return jsonResponse({ error: 'invalid_slug' }, 400);
    if (!(await isSlugAvailable(pb, slug, id))) return jsonResponse({ error: 'slug_taken' }, 409);
    payload.slug = slug;
  }

  // Imagen opcional: reemplaza la anterior.
  const imageRaw = form.get('image');
  if (imageRaw instanceof File && imageRaw.size > 0) {
    if (imageRaw.size > MAX_IMAGE_BYTES) {
      return jsonResponse({ error: 'image_too_large', maxBytes: MAX_IMAGE_BYTES }, 400);
    }
    if (!ALLOWED_IMAGE_MIMES.has(imageRaw.type)) {
      return jsonResponse({ error: 'image_invalid_mime', allowed: Array.from(ALLOWED_IMAGE_MIMES) }, 400);
    }
    payload.image = imageRaw;
  }

  try {
    const news = await pb.collection('news').update(id, payload);
    return jsonResponse({ news }, 200);
  } catch (err: unknown) {
    const pbErr = err as { data?: { data?: Record<string, string> } };
    return jsonResponse({ error: 'update_failed', details: pbErr?.data?.data ?? {} }, 500);
  }
};

export const DELETE: APIRoute = async (context) => {
  const csrfError = validateCsrf(context.request, context.cookies);
  if (csrfError) return csrfError;

  const guarded = requireAdminContext(context);
  if (guarded instanceof Response) return guarded;
  const { pb } = guarded;

  const id = context.params.id;
  if (!id) return jsonResponse({ error: 'missing_id' }, 400);

  try {
    await pb.collection('news').delete(id);
    return jsonResponse({ ok: true }, 200);
  } catch {
    return jsonResponse({ error: 'delete_failed' }, 500);
  }
};
