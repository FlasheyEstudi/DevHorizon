// =============================================================================
// GET /api/stores/geo — GeoJSON FeatureCollection of all valid-location stores.
// =============================================================================
// Ships per design ADR-008. Not consumed by any client in Phase 1, but
// available for Phase 2 reuse (e.g., static map generation, OG previews,
// external analytics).
//
// Filters:
//   - Server-side: `location != null` (PB filter syntax).
//   - Client-side: `isValidLocation` (Null Island + bounds guard) —
//     defense in depth in case PB returns unexpected geoPoint shapes.
//
// Content-Type is `application/geo+json` per RFC 8146.
//
// No auth required: stores list is public per collection rule.
// =============================================================================

import type { APIRoute } from 'astro';
import { pb } from '../../../lib/pocketbase';
import { isValidLocation } from '../../../lib/geo';

export const prerender = false;

export const GET: APIRoute = async () => {
  const stores = await pb.collection('stores').getFullList({
    filter: 'location != null',
  });

  const features = stores
    .filter((s) => isValidLocation(s.location))
    .map((s) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        // GeoJSON coordinate order is [lon, lat] (NOT [lat, lon]).
        coordinates: [s.location!.lon, s.location!.lat],
      },
      properties: {
        id: s.id,
        name: s.name,
        slug: s.slug,
        department: s.department,
        address_text: s.address_text,
      },
    }));

  const collection = { type: 'FeatureCollection' as const, features };

  return new Response(JSON.stringify(collection), {
    status: 200,
    headers: { 'Content-Type': 'application/geo+json' },
  });
};