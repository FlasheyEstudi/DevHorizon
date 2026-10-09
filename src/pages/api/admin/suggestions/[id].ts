// =============================================================================
// /api/admin/suggestions/[id]
// =============================================================================
// PUT /api/admin/suggestions/:id -> Aprueba o rechaza una sugerencia.
//
// Body (JSON):
//   {
//     action: 'approve' | 'reject',
//     admin_note?: string,
//     // Solo en approve: overrides opcionales por si el admin quiere ajustar
//     // el nombre/slug/descripcion/icono/parent antes de crearla.
//     category?: { name?, slug?, description?, icon?, parent? }
//   }
//
// approve: crea el registro real en `categories` (con lo sugerido o los
//          overrides) y marca la sugerencia como 'approved'.
// reject : solo marca la sugerencia como 'rejected' + nota.
//
// Reglas:
//   - Auth + rol admin (401/403). CSRF validado (403).
//   - Solo se revisan sugerencias en estado 'pending' (409 already_reviewed).
//   - Slug unico contra `categories` (409).
//
// Devuelve { suggestion, category? }.
// =============================================================================

import type { APIRoute } from 'astro';
import { z } from 'zod';
import { validateCsrf } from '../../../../lib/auth/csrf';
import { jsonResponse, requireAdminContext } from '../../../../lib/api/admin';
import { slugify } from '../../../../lib/slugify';

export const prerender = false;

const SLUG_PATTERN = /^[a-z0-9-]+$/;

const ReviewBodySchema = z
  .object({
    action: z.enum(['approve', 'reject']),
    admin_note: z.string().max(1000).optional().default(''),
    category: z
      .object({
        name: z.string().min(2).max(120).optional(),
        slug: z.string().min(2).max(120).regex(SLUG_PATTERN).optional(),
        description: z.string().max(2000).optional(),
        icon: z.string().max(120).optional(),
        parent: z.string().max(64).optional().nullable(),
      })
      .strict()
      .optional(),
  })
  .strict();

export const PUT: APIRoute = async (context) => {
  const csrfError = validateCsrf(context.request, context.cookies);
  if (csrfError) return csrfError;

  const guarded = requireAdminContext(context);
  if (guarded instanceof Response) return guarded;
  const { pb, admin } = guarded;

  const id = context.params.id;
  if (!id) return jsonResponse({ error: 'missing_id' }, 400);

  let suggestion;
  try {
    suggestion = await pb.collection('category_suggestions').getOne(id);
  } catch {
    return jsonResponse({ error: 'not_found' }, 404);
  }

  if (suggestion.status !== 'pending') {
    return jsonResponse({ error: 'already_reviewed' }, 409);
  }

  const body = await context.request.json().catch(() => null);
  const parsed = ReviewBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse({ error: 'validation', details: z.flattenError(parsed.error) }, 400);
  }

  const { action, admin_note, category: override } = parsed.data;

  // ── Rechazar ────────────────────────────────────────────────────────────
  if (action === 'reject') {
    try {
      const updated = await pb.collection('category_suggestions').update(id, {
        status: 'rejected',
        admin_note,
        reviewed_by: admin.id,
      });
      return jsonResponse({ suggestion: updated }, 200);
    } catch {
      return jsonResponse({ error: 'update_failed' }, 500);
    }
  }

  // ── Aprobar: crear la categoria real ────────────────────────────────────
  const suggestedName = (suggestion.name as string) ?? '';
  const suggestedSlug = (suggestion.slug as string) ?? '';

  const name = (override?.name ?? suggestedName).trim();
  const slug = (override?.slug ?? suggestedSlug).trim() || slugify(name);
  if (!slug || !SLUG_PATTERN.test(slug)) return jsonResponse({ error: 'invalid_slug' }, 400);

  try {
    const dup = await pb
      .collection('categories')
      .getList(1, 1, { filter: pb.filter('slug = {:slug}', { slug }) });
    if (dup.items.length > 0) return jsonResponse({ error: 'slug_taken' }, 409);
  } catch {
    // El indice unico es la garantia real.
  }

  const parent = ((override?.parent ?? (suggestion.parent as string)) ?? '').toString().trim();

  let category;
  try {
    category = await pb.collection('categories').create({
      name,
      slug,
      description: override?.description ?? (suggestion.description as string) ?? '',
      icon: override?.icon ?? (suggestion.icon as string) ?? '',
      parent: parent || '',
    });
  } catch (err: unknown) {
    const pbErr = err as { data?: { data?: Record<string, string> } };
    return jsonResponse({ error: 'create_failed', details: pbErr?.data?.data ?? {} }, 500);
  }

  try {
    const updated = await pb.collection('category_suggestions').update(id, {
      status: 'approved',
      admin_note,
      reviewed_by: admin.id,
    });
    return jsonResponse({ suggestion: updated, category }, 201);
  } catch {
    // La categoria ya se creo: lo reportamos sin fallar del todo.
    return jsonResponse({ category, warning: 'suggestion_not_updated' }, 201);
  }
};
