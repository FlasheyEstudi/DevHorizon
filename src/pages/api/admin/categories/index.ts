// =============================================================================
// /api/admin/categories
// =============================================================================
// GET  /api/admin/categories  -> Lista TODAS las categorias (admin), con el
//                                `parent` expandido, para armar el arbol.
// POST /api/admin/categories  -> Crea una categoria o subcategoria.
//
// Body (JSON):
//   { name: string, slug?: string, description?: string,
//     icon?: string, parent?: string | null }
//
// Reglas:
//   - Auth + rol admin (401/403 via requireAdminContext).
//   - CSRF validado en las mutaciones (403).
//   - `slug` opcional: si no viene, se deriva del nombre con slugify().
//   - Slug y nombre unicos (409). El slug ademas cumple ^[a-z0-9-]+$.
//   - `parent` opcional: id de otra categoria (subcategoria).
//
// Devuelve 201 con { category }.
// =============================================================================

import type { APIRoute } from 'astro';
import { z } from 'zod';
import { validateCsrf } from '../../../../lib/auth/csrf';
import { jsonResponse, requireAdminContext } from '../../../../lib/api/admin';
import { slugify } from '../../../../lib/slugify';

export const prerender = false;

const SLUG_PATTERN = /^[a-z0-9-]+$/;

const CreateBodySchema = z
  .object({
    name: z.string().min(2).max(120),
    slug: z.string().min(2).max(120).regex(SLUG_PATTERN).optional(),
    description: z.string().max(2000).optional().default(''),
    icon: z.string().max(120).optional().default(''),
    parent: z.string().max(64).optional().nullable(),
  })
  .strict();

export const GET: APIRoute = async (context) => {
  const guarded = requireAdminContext(context);
  if (guarded instanceof Response) return guarded;
  const { pb } = guarded;

  try {
    const categories = await pb.collection('categories').getFullList({
      sort: 'name',
      expand: 'parent',
    });
    return jsonResponse({ items: categories, totalItems: categories.length }, 200);
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

  const body = await context.request.json().catch(() => null);
  const parsed = CreateBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse({ error: 'validation', details: z.flattenError(parsed.error) }, 400);
  }

  const name = parsed.data.name.trim();
  const slug = parsed.data.slug?.trim() || slugify(name);
  if (!slug || !SLUG_PATTERN.test(slug)) {
    return jsonResponse({ error: 'invalid_slug' }, 400);
  }

  // Unicidad de slug / nombre (chequeo amable; el indice unico es la garantia).
  try {
    const dupSlug = await pb
      .collection('categories')
      .getList(1, 1, { filter: pb.filter('slug = {:slug}', { slug }) });
    if (dupSlug.items.length > 0) return jsonResponse({ error: 'slug_taken' }, 409);

    const dupName = await pb
      .collection('categories')
      .getList(1, 1, { filter: pb.filter('name = {:name}', { name }) });
    if (dupName.items.length > 0) return jsonResponse({ error: 'name_taken' }, 409);
  } catch {
    // Si la comprobacion falla, el create falla igual por el indice unico.
  }

  const parent = (parsed.data.parent ?? '').trim();

  try {
    const category = await pb.collection('categories').create({
      name,
      slug,
      description: parsed.data.description,
      icon: parsed.data.icon,
      parent: parent || '',
    });
    return jsonResponse({ category }, 201);
  } catch (err: unknown) {
    const pbErr = err as { data?: { data?: Record<string, string> } };
    return jsonResponse({ error: 'create_failed', details: pbErr?.data?.data ?? {} }, 500);
  }
};
