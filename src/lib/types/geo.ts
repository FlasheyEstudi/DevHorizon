// =============================================================================
// types/geo.ts — GeoPoint type alias.
// =============================================================================
// PocketBase stores geoPoint fields as a `{lat, lon}` JS object (not a JSON
// string). The JS SDK exposes the shape at runtime but does NOT export a
// `GeoPointRecord` type, so we declare it here once and import from this
// module everywhere we need it.
//
// Use this anywhere a function or component accepts/returns a PB geoPoint.
// =============================================================================

/** PB geoPoint shape. Coordinates in decimal degrees (WGS84). */
export interface GeoPointRecord {
  lat: number;
  lon: number;
}