// =============================================================================
// stores/geo.ts — Cross-island geo state via nanostores.
// =============================================================================
// Atoms for state shared between map islands. Phase 1 only uses these as a
// placeholder; each island currently holds its own local state. Kept here so
// Phase 2 (Cerca de mi) and Phase 3 (public mapa) can read/write a single
// source of truth without rewriting the wiring.
// =============================================================================

import { atom } from 'nanostores';
import type { GeoPointRecord } from '@/lib/types/geo';

export interface NearbyHit {
  id: string;
  name: string;
  slug: string;
  /** Distance in kilometers from the user's location, rounded to 2 decimals. */
  distanceKm: number;
}

/** Last known user location (from browser geolocation API). */
export const $userLocation = atom<GeoPointRecord | null>(null);

/** Top-N nearest stores computed by haversine sort. */
export const $nearbyResults = atom<NearbyHit[]>([]);

/** Last geolocation-related error key (e.g. 'near.denied'). */
export const $geoError = atom<string | null>(null);

/** Reset all geo stores to the initial state. */
export function clearGeoState(): void {
  $userLocation.set(null);
  $nearbyResults.set([]);
  $geoError.set(null);
}