// =============================================================================
// routing.ts — Servicio cliente para cálculo de rutas y navegación OSRM
// =============================================================================
// Consulta la API pública Open Source Routing Machine (OSRM) para obtener
// la geometría real de calles y carreteras, distancia y tiempo de viaje.
// =============================================================================

export interface RouteCoordinates {
  lat: number;
  lon: number;
}

export interface RouteResult {
  coordinates: [number, number][]; // [lat, lon] para Leaflet Polyline
  distanceKm: number;
  durationMin: number;
  durationMinutes: number;
  googleMapsUrl: string;
  wazeUrl: string;
}

/**
 * Formatea la distancia en kilómetros o metros legibles.
 */
export function formatDistance(km: number): string {
  if (!km || km <= 0) return '-- km';
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(1)} km`;
}

/**
 * Formatea la duración en minutos u horas legibles.
 */
export function formatDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return '-- min';
  if (minutes < 1) return '< 1 min';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  if (remainingMins === 0) return `${hours} h`;
  return `${hours} h ${remainingMins} min`;
}

/**
 * Genera la URL para abrir la ruta en Google Maps (navegación GPS paso a paso).
 */
export function getGoogleMapsDirUrl(origin: RouteCoordinates, dest: RouteCoordinates): string {
  return `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lon}&destination=${dest.lat},${dest.lon}&travelmode=driving`;
}

/**
 * Genera la URL para abrir el destino en Waze (navegación GPS paso a paso).
 */
export function getWazeDirUrl(dest: RouteCoordinates): string {
  return `https://waze.com/ul?ll=${dest.lat},${dest.lon}&navigate=yes`;
}

/**
 * Obtiene la ruta de conducción real entre dos coordenadas.
 * Intenta primero el endpoint proxy interno /api/route (sin CORS ni CSP del cliente).
 * Si no está disponible, intenta OSRM directo.
 */
export async function fetchRoute(
  origin: RouteCoordinates,
  dest: RouteCoordinates
): Promise<RouteResult> {
  const googleMapsUrl = getGoogleMapsDirUrl(origin, dest);
  const wazeUrl = getWazeDirUrl(dest);

  // 1. Intentar endpoint proxy del backend (/api/route)
  try {
    const proxyUrl = `/api/route?originLat=${origin.lat}&originLon=${origin.lon}&destLat=${dest.lat}&destLon=${dest.lon}`;
    const proxyRes = await fetch(proxyUrl);
    if (proxyRes.ok) {
      const data = await proxyRes.json();
      if (Array.isArray(data.coordinates) && data.coordinates.length > 1) {
        return {
          coordinates: data.coordinates,
          distanceKm: data.distanceKm,
          durationMin: data.durationMin,
          durationMinutes: data.durationMin,
          googleMapsUrl,
          wazeUrl,
        };
      }
    }
  } catch (proxyErr) {
    console.warn('Backend route proxy failed, attempting direct OSRM...', proxyErr);
  }

  // 2. Intentar llamada directa a OSRM (permitida ahora por CSP en connect-src)
  const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${origin.lon},${origin.lat};${dest.lon},${dest.lat}?overview=full&geometries=geojson`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 7000);

  try {
    const res = await fetch(osrmUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`OSRM HTTP ${res.status}`);
    }

    const data = await res.json();
    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
      const primaryRoute = data.routes[0];
      const coordinates: [number, number][] = primaryRoute.geometry.coordinates.map(
        ([lon, lat]: [number, number]) => [lat, lon]
      );
      const distanceKm = Number((primaryRoute.distance / 1000).toFixed(1));
      const durationMin = Math.max(1, Math.round(primaryRoute.duration / 60));

      return {
        coordinates,
        distanceKm,
        durationMin,
        durationMinutes: durationMin,
        googleMapsUrl,
        wazeUrl,
      };
    }
    throw new Error('No route found in OSRM');
  } catch (err: any) {
    clearTimeout(timeoutId);
    console.error('Failed to calculate road route:', err);
    throw new Error(err?.message || 'No se pudo trazar la ruta en carretera');
  }
}
