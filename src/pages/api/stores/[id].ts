// =============================================================================
// PATCH /api/stores/{id} — Owner-only update of location + department + text.
// =============================================================================
// Per design §4.1 (ADR-006 + ADR-010):
//   - Request-scoped `pocketbaseFor(request)` to read auth from cookies.
//   - Auth required (401 if no session).
//   - Ownership required (403 if record.owner !== authRecord.id).
//   - Zod-validated body; lat ∈ [10.7, 15.0], lon ∈ [-87.7, -83.1].
//   - Null Island guard at server (defense in depth — Zod accepts (0,0)).
//   - CSRF double-submit enforced via validateCsrf().
//   - Returns updated record JSON on success.
// =============================================================================

import type { APIRoute } from 'astro';
import { z } from 'zod';
import { pocketbaseFor } from '../../../lib/pocketbase';
import { validateCsrf } from '../../../lib/auth/csrf';
import { DEPARTMENTS } from '../../../lib/geo';

export const prerender = false;

const LocationSchema = z.object({
  lat: z.number().min(10.7).max(15.0),
  lon: z.number().min(-87.7).max(-83.1),
});

const BodySchema = z
  .object({
    location: LocationSchema.optional(),
    department: z.enum(DEPARTMENTS).optional(),
    address_text: z.string().max(500).optional(),
  })
  .strict();

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const PATCH: APIRoute = async ({ request, cookies, params }) => {
  // 1. CSRF.
  const csrfError = validateCsrf(request, cookies);
  if (csrfError) return csrfError;

  // 2. Auth.
  const pb = pocketbaseFor(request);
  const authRecord = pb.authStore.record;
  if (!authRecord) {
    return jsonResponse({ error: 'unauthorized' }, 401);
  }

  // 3. Param check.
  const storeId = params.id;
  if (!storeId) {
    return jsonResponse({ error: 'missing_id' }, 400);
  }

  // 4. Ownership check.
  let store: { owner?: string };
  try {
    store = await pb.collection('stores').getOne(storeId);
  } catch {
    return jsonResponse({ error: 'not_found' }, 404);
  }
  if (store.owner !== authRecord.id) {
    return jsonResponse({ error: 'forbidden' }, 403);
  }

  // 5. Body parse + validate.
  const body = await request.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse(
      { error: 'validation', details: z.flattenError(parsed.error) },
      400
    );
  }

  // 6. Null Island guard at server (Zod accepts (0,0) technically).
  if (
    parsed.data.location &&
    parsed.data.location.lat === 0 &&
    parsed.data.location.lon === 0
  ) {
    return jsonResponse(
      { error: 'validation', details: { location: ['null_island'] } },
      400
    );
  }

  // 7. PB update.
  try {
    const updated = await pb.collection('stores').update(storeId, parsed.data);
    return jsonResponse(updated, 200);
  } catch {
    return jsonResponse({ error: 'update_failed' }, 500);
  }
};