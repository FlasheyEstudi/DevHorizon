// =============================================================================
// /api/suggestions
// =============================================================================
// GET  /api/suggestions  -> Devuelve las sugerencias del usuario autenticado.
// POST /api/suggestions  -> Crea una sugerencia de categoria (seller/admin).
//
// Body (JSON):
//   { name: string, slug?: string, description?: string,
//     icon?: string, parent?: string | null }
//
// Reglas:
//   - Auth requerida (401). Rol seller o admin para proponer (403).
//   - CSRF validado (403).
//   - suggested_by se fuerza al usuario del request (no se confia en el body).
//   - La sugerencia nace con status 'pending'.
//   - 409 si el slug ya existe como categoria o como sugerencia pendiente.
//
// El admin revisa estas propuestas en /api/admin/suggestions.
// =============================================================================

import type { APIRoute } from 'astro';
import type PocketBase from 'pocketbase';
import { z } from 'zod';
import { validateCsrf } from '../../../lib/auth/csrf';
import { pocketbaseFor } from '../../../lib/pocketbase';
import { jsonResponse } from '../../../lib/api/admin';
import { slugify } from '../../../lib/slugify';

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

function clientFor(context: Parameters<APIRoute>[0]): PocketBase {
  return (context.locals.pb as PocketBase | undefined) ?? pocketbaseFor(context.request);
}

export const GET: APIRoute = async (context) => {
  const pb = clientFor(context);
  const record = pb.authStore.record;
  if (!record) return jsonResponse({ error: 'unauthorized' }, 401);

  try {
    const items = await pb.collection('category_suggestions').getFullList({
      sort: '-created_at',
      filter: pb.filter('suggested_by = {:uid}', { uid: record.id }),
      expand: 'parent,reviewed_by',
    });
    return jsonResponse({ items, totalItems: items.length }, 200);
  } catch {
    return jsonResponse({ error: 'list_failed' }, 500);
  }
};

export const POST: APIRoute = async (context) => {
  const csrfError = validateCsrf(context.request, context.cookies);
  if (csrfError) return csrfError;

  const pb = clientFor(context);
  const record = pb.authStore.record;
  if (!record) return jsonResponse({ error: 'unauthorized' }, 401);

  const role = (record as { role?: string }).role;
  if (role !== 'seller' && role !== 'admin') {
    return jsonResponse({ error: 'not_seller' }, 403);
  }

  const body = await context.request.json().catch(() => null);
  const parsed = CreateBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse({ error: 'validation', details: z.flattenError(parsed.error) }, 400);
  }

  const name = parsed.data.name.trim();
  const slug = parsed.data.slug?.trim() || slugify(name);
  if (!slug || !SLUG_PATTERN.test(slug)) return jsonResponse({ error: 'invalid_slug' }, 400);

  // Duplicados obvios: ya es categoria, o ya hay una sugerencia pendiente.
  try {
    const existingCat = await pb
      .collection('categories')
      .getList(1, 1, { filter: pb.filter('slug = {:slug}', { slug }) });
    if (existingCat.items.length > 0) return jsonResponse({ error: 'already_exists' }, 409);

    const existingSug = await pb
      .collection('category_suggestions')
      .getList(1, 1, { filter: pb.filter('slug = {:slug} && status = "pending"', { slug }) });
    if (existingSug.items.length > 0) return jsonResponse({ error: 'already_suggested' }, 409);
  } catch {
    // Continuar: la unicidad no es critica para las sugerencias.
  }

  const parent = (parsed.data.parent ?? '').trim();

  try {
    const suggestion = await pb.collection('category_suggestions').create({
      name,
      slug,
      description: parsed.data.description,
      icon: parsed.data.icon,
      parent: parent || '',
      suggested_by: record.id,
      status: 'pending',
    });
    return jsonResponse({ suggestion }, 201);
  } catch (err: unknown) {
    const pbErr = err as { data?: { data?: Record<string, string> } };
    return jsonResponse({ error: 'create_failed', details: pbErr?.data?.data ?? {} }, 500);
  }
};
