// =============================================================================
// geo.ts — Geographic helpers for the geopoint-marketplace-features change.
// =============================================================================
// Pure utility module. No React, no Astro, no DOM. Safe to import from
// both server-side (Astro pages, API endpoints) and client-side (React
// islands via `client:only="react"`).
//
// Exports:
//   - NICARAGUA_BOUNDS            Conservative bounding box for the country.
//   - isNullIsland(loc)           Detects the {lon:0, lat:0} PB sentinel.
//   - isWithinNicaragua(lat, lon) True if inside the bbox.
//   - isValidLocation(loc)        Combined guard (not null + not Null Island
//                                 + inside Nicaragua bounds).
//   - normalizeLocation(loc)      Returns the location if valid, else null.
//   - DEPARTMENTS                 Tuple of the 17 locked Nicaraguan divisions.
//   - Department                  String-literal union type derived from
//                                 DEPARTMENTS.
//   - NICARAGUA_DEPARTMENT_BOUNDS Per-department bbox for reverse-geocoding.
//   - reverseGeocodeDepartment    lat/lon -> Department | null.
// =============================================================================

import type { GeoPointRecord } from '@/lib/types/geo';

/**
 * Re-export from a single local type module so consumers don't have to
 * know that the PocketBase JS SDK does not export `GeoPointRecord`
 * (the geoPoint shape is documented but the type is not surfaced).
 */
export type { GeoPointRecord } from '@/lib/types/geo';

/**
 * Conservative bounding box covering all 17 Nicaraguan divisions
 * (15 departments + RAAN + RAAS).
 *
 * Source: INETER public administrative data. Includes a small buffer so
 * coastal/border markers don't appear "outside" when rendered.
 *
 * Used to:
 *   - Validate map clicks in onboarding (MapPicker refuses clicks outside).
 *   - Validate PATCH /api/stores/[id] payloads (server-side defense).
 *   - Validate "Cerca de mí" geolocation results before showing nearby
 *     stores.
 */
export const NICARAGUA_BOUNDS = {
  latMin: 10.7,
  latMax: 15.0,
  lonMin: -87.7,
  lonMax: -83.1,
} as const;

/**
 * PocketBase returns `{lon: 0, lat: 0}` as the default value for unset
 * geoPoint fields. Without this guard, those records render markers in
 * the Gulf of Guinea — visually wrong and bad for SEO/UX.
 *
 * Always call this before rendering any geoPoint coming from PB.
 */
export function isNullIsland(loc: GeoPointRecord | null | undefined): boolean {
  return !!loc && loc.lon === 0 && loc.lat === 0;
}

/**
 * True iff the lat/lon pair sits inside the conservative Nicaragua bbox.
 * Use before persisting user-picked coordinates.
 */
export function isWithinNicaragua(lat: number, lon: number): boolean {
  return (
    lat >= NICARAGUA_BOUNDS.latMin &&
    lat <= NICARAGUA_BOUNDS.latMax &&
    lon >= NICARAGUA_BOUNDS.lonMin &&
    lon <= NICARAGUA_BOUNDS.lonMax
  );
}

/**
 * Combined guard: not Null Island AND inside Nicaragua bounds AND not null.
 * Use at any render boundary that consumes a stored geoPoint.
 */
export function isValidLocation(loc: GeoPointRecord | null | undefined): boolean {
  if (!loc) return false;
  if (isNullIsland(loc)) return false;
  return isWithinNicaragua(loc.lat, loc.lon);
}

/**
 * Returns the location if valid, else null. Use at render boundaries so
 * downstream JSX never has to re-check.
 */
export function normalizeLocation(
  loc: GeoPointRecord | null | undefined
): GeoPointRecord | null {
  if (!isValidLocation(loc)) return null;
  return loc as GeoPointRecord;
}

/**
 * The 17 locked Nicaraguan divisions. Order is stable and matches the
 * PB select values defined in the migration. Adding a new value requires
 * a new migration + spec amendment.
 */
export const DEPARTMENTS = [
  'Boaco',
  'Carazo',
  'Chinandega',
  'Chontales',
  'Estelí',
  'Granada',
  'Jinotega',
  'León',
  'Madriz',
  'Managua',
  'Masaya',
  'Matagalpa',
  'Nueva Segovia',
  'Río San Juan',
  'RAAN',
  'RAAS',
  'Rivas',
] as const;

/**
 * String-literal union of the locked department values.
 * Use this in component props / API response types.
 */
export type Department = (typeof DEPARTMENTS)[number];

/**
 * Approximate bounding boxes per Nicaraguan department.
 *
 * Used by `reverseGeocodeDepartment` to map user lat/lon -> department
 * for the "Cerca de mí" pre-filter (the only way to scope a "near me"
 * query in PB 0.27, which has no spatial index).
 *
 * Border accuracy is intentionally rough (~10km at edges). Users can
 * correct via the department dropdown, so this is acceptable.
 *
 * Values based on INETER public administrative boundaries.
 */
export const NICARAGUA_DEPARTMENT_BOUNDS: Record<
  Department,
  { latMin: number; latMax: number; lonMin: number; lonMax: number }
> = {
  Boaco: { latMin: 12.0, latMax: 12.8, lonMin: -85.8, lonMax: -85.2 },
  Carazo: { latMin: 11.55, latMax: 11.95, lonMin: -86.3, lonMax: -85.95 },
  Chinandega: { latMin: 12.4, latMax: 13.2, lonMin: -87.2, lonMax: -86.7 },
  Chontales: { latMin: 11.5, latMax: 12.5, lonMin: -85.6, lonMax: -84.9 },
  Estelí: { latMin: 12.9, latMax: 13.6, lonMin: -86.5, lonMax: -86.1 },
  Granada: { latMin: 11.6, latMax: 12.1, lonMin: -86.1, lonMax: -85.65 },
  Jinotega: { latMin: 13.2, latMax: 14.5, lonMin: -86.3, lonMax: -84.8 },
  León: { latMin: 12.1, latMax: 13.0, lonMin: -87.0, lonMax: -86.4 },
  Madriz: { latMin: 13.1, latMax: 13.7, lonMin: -86.6, lonMax: -86.1 },
  Managua: { latMin: 11.75, latMax: 12.5, lonMin: -86.5, lonMax: -86.05 },
  Masaya: { latMin: 11.75, latMax: 12.1, lonMin: -86.2, lonMax: -85.95 },
  Matagalpa: { latMin: 12.5, latMax: 13.4, lonMin: -86.2, lonMax: -85.4 },
  'Nueva Segovia': { latMin: 13.5, latMax: 14.4, lonMin: -86.5, lonMax: -85.6 },
  'Río San Juan': { latMin: 10.7, latMax: 11.8, lonMin: -85.2, lonMax: -84.0 },
  RAAN: { latMin: 13.0, latMax: 15.0, lonMin: -84.8, lonMax: -83.1 },
  RAAS: { latMin: 11.5, latMax: 13.0, lonMin: -84.5, lonMax: -82.5 },
  Rivas: { latMin: 10.95, latMax: 11.7, lonMin: -86.0, lonMax: -85.1 },
};

/**
 * Reverse-geocode a lat/lon pair to a Nicaraguan department.
 *
 * Returns null if the point is outside all known department bboxes
 * (e.g., user is in Honduras or Costa Rica). Callers should show the
 * `near.outOfNI` i18n string in that case.
 *
 * Border ambiguity (~10km) is acceptable; users can correct via the
 * dropdown when onboarding.
 */
export function reverseGeocodeDepartment(
  lat: number,
  lon: number
): Department | null {
  for (const [dept, b] of Object.entries(NICARAGUA_DEPARTMENT_BOUNDS) as [
    Department,
    { latMin: number; latMax: number; lonMin: number; lonMax: number },
  ][]) {
    if (
      lat >= b.latMin &&
      lat <= b.latMax &&
      lon >= b.lonMin &&
      lon <= b.lonMax
    ) {
      return dept;
    }
  }
  return null;
}