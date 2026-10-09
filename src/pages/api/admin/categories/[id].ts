// =============================================================================
// /api/admin/categories/[id]
// =============================================================================
// PUT    /api/admin/categories/:id -> Actualiza nombre/slug/desc/icono/parent.
// DELETE /api/admin/categories/:id -> Elimina una categoria hoja sin uso.
//
// Reglas:
//   - Auth + rol admin (401/403). CSRF en ambas mutaciones.
//   - Slug/nombre unicos excluyendo la propia categoria (409).
//   - `parent` no puede ser la propia categoria ni un descendiente (ciclo)
//     -> 400 self_parent / cycle.
//   - DELETE bloquea si la categoria tiene hijas (409 has_children) o si hay
//     productos usandola (409 in_use), porque las relaciones no son cascade.
//
// Devuelve { category } en PUT y { ok: true } en DELETE.
// =============================================================================

import type { APIRoute } from 'astro';
import type PocketBase from 'pocketbase';
import { z } from 'zod';
import { validateCsrf } from '../../../../lib/auth/csrf';
import { jsonResponse, requireAdminContext } from '../../../../lib/api/admin';

export const prerender = false;

const SLUG_PATTERN = /^[a-z0-9-]+$/;

const UpdateBodySchema = z
  .object({
    name: z.string().min(2).max(120).optional(),
    slug: z.string().min(2).max(120).regex(SLUG_PATTERN).optional(),
    description: z.string().max(2000).optional(),
    icon: z.string().max(120).optional(),
    parent: z.string().max(64).optional().nullable(),
  })
  .strict();

/** Existe otro registro con ese filtro (excluyendo `excludeId`)? */
async function existsOther(
  pb: PocketBase,
  filter: string,
  params: Record<string, string>,
  excludeId: string
): Promise<boolean> {
  try {
    const list = await pb.collection('categories').getFullList({ filter: pb.filter(filter, params) });
    return list.some((r) => r.id !== excludeId);
  } catch {
    return false;
  }
}

/** Sube por la cadena de `parent` desde newParentId; si topa con nodeId hay ciclo. */
async function wouldCreateCycle(pb: PocketBase, nodeId: string, newParentId: string): Promise<boolean> {
  let current = newParentId;
  const seen = new Set<string>();
  while (current && !seen.has(current)) {
    if (current === nodeId) return true;
    seen.add(current);
    try {
      const rec = await pb.collection('categories').getOne(current);
      current = (rec.parent as string) || '';
    } catch {
      break;
    }
  }
  return false;
}

export const PUT: APIRoute = async (context) => {
  const csrfError = validateCsrf(context.request, context.cookies);
  if (csrfError) return csrfError;

  const guarded = requireAdminContext(context);
  if (guarded instanceof Response) return guarded;
  const { pb } = guarded;

  const id = context.params.id;
  if (!id) return jsonResponse({ error: 'missing_id' }, 400);

  const body = await context.request.json().catch(() => null);
  const parsed = UpdateBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse({ error: 'validation', details: z.flattenError(parsed.error) }, 400);
  }

  try {
    await pb.collection('categories').getOne(id);
  } catch {
    return jsonResponse({ error: 'not_found' }, 404);
  }

  const data = parsed.data;
  const payload: Record<string, unknown> = {};

  if (data.name !== undefined) {
    const name = data.name.trim();
    if (await existsOther(pb, 'name = {:name}', { name }, id)) {
      return jsonResponse({ error: 'name_taken' }, 409);
    }
    payload.name = name;
  }

  if (data.slug !== undefined) {
    const slug = data.slug.trim();
    if (!SLUG_PATTERN.test(slug)) return jsonResponse({ error: 'invalid_slug' }, 400);
    if (await existsOther(pb, 'slug = {:slug}', { slug }, id)) {
      return jsonResponse({ error: 'slug_taken' }, 409);
    }
    payload.slug = slug;
  }

  if (data.description !== undefined) payload.description = data.description;
  if (data.icon !== undefined) payload.icon = data.icon;

  if (data.parent !== undefined) {
    const parent = (data.parent ?? '').trim();
    if (parent) {
      if (parent === id) return jsonResponse({ error: 'self_parent' }, 400);
      if (await wouldCreateCycle(pb, id, parent)) return jsonResponse({ error: 'cycle' }, 400);
      payload.parent = parent;
    } else {
      payload.parent = ''; // desasociar -> pasa a ser categoria raiz
    }
  }

  try {
    const category = await pb.collection('categories').update(id, payload);
    return jsonResponse({ category }, 200);
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

  // No borrar una categoria con subcategorias (dejaria huerfanos).
  try {
    const children = await pb
      .collection('categories')
      .getList(1, 1, { filter: pb.filter('parent = {:id}', { id }) });
    if (children.items.length > 0) return jsonResponse({ error: 'has_children' }, 409);
  } catch {}

  // No borrar una categoria en uso por productos (relacion no cascade).
  try {
    const used = await pb
      .collection('products')
      .getList(1, 1, { filter: pb.filter('categories ?~ {:id}', { id }) });
    if (used.items.length > 0) return jsonResponse({ error: 'in_use' }, 409);
  } catch {}

  try {
    await pb.collection('categories').delete(id);
    return jsonResponse({ ok: true }, 200);
  } catch {
    return jsonResponse({ error: 'delete_failed' }, 500);
  }
};
