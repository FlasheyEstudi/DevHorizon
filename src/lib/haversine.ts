// =============================================================================
// haversine.ts — Pure Haversine distance function.
// =============================================================================
// Great-circle distance between two geoPoints, in kilometers.
// Used by "Cerca de mí" widget to rank stores by proximity.
//
// No DOM. No React. Safe to import from any layer.
//
// Reference: https://en.wikipedia.org/wiki/Haversine_formula
// =============================================================================

import type { GeoPointRecord } from '@/lib/types/geo';

/** Mean Earth radius in kilometers (IUGG). */
const EARTH_RADIUS_KM = 6371;

/** Convert degrees to radians. */
function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Great-circle distance between two geoPoints using the Haversine formula.
 *
 * Result is rounded to two decimal places to avoid floating-point noise
 * leaking into sorted lists.
 *
 * Acceptable for Nicaragua distances (<500km); not appropriate for
 * antipodal points where sub-meter accuracy is required (use Vincenty
 * in that case).
 *
 * @param a First geoPoint with `{lat, lon}` in decimal degrees.
 * @param b Second geoPoint with `{lat, lon}` in decimal degrees.
 * @returns Distance in kilometers, rounded to two decimals.
 */
export function haversineKm(a: GeoPointRecord, b: GeoPointRecord): number {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h =
    sinDLat * sinDLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinDLon * sinDLon;
  // Clamp to [0, 1] to defend against floating-point overshoot at near-coincident points.
  const c = 2 * Math.asin(Math.min(1, Math.sqrt(h)));
  const km = EARTH_RADIUS_KM * c;
  return Math.round(km * 100) / 100;
}