// =============================================================================
// /api/admin/suggestions
// =============================================================================
// GET /api/admin/suggestions -> Lista TODAS las sugerencias de categoria.
//                               Query: ?status=pending|approved|rejected
//
// El admin las revisa y aprueba/rechaza en /api/admin/suggestions/[id].
// Se listan expandiendo `parent`, `suggested_by` y `reviewed_by` para mostrar
// nombres en la UI sin round-trips extra.
// =============================================================================

import type { APIRoute } from 'astro';
import { jsonResponse, requireAdminContext } from '../../../../lib/api/admin';

export const prerender = false;

const STATUSES = ['pending', 'approved', 'rejected'];

export const GET: APIRoute = async (context) => {
  const guarded = requireAdminContext(context);
  if (guarded instanceof Response) return guarded;
  const { pb } = guarded;

  const status = context.url.searchParams.get('status');
  const filters: string[] = [];
  if (status && STATUSES.includes(status)) {
    filters.push(pb.filter('status = {:status}', { status }));
  }

  try {
    const items = await pb.collection('category_suggestions').getFullList({
      sort: '-created_at',
      filter: filters.join(' && '),
      expand: 'parent,suggested_by,reviewed_by',
    });
    return jsonResponse({ items, totalItems: items.length }, 200);
  } catch {
    return jsonResponse({ error: 'list_failed' }, 500);
  }
};
