// =============================================================================
// GET /api/route — Proxy para cálculo de rutas de conducción via OSRM
// =============================================================================
// Consulta la API Open Source Routing Machine desde el servidor backend:
//   - Elimina problemas de CORS y bloqueos de CSP en el navegador
//   - Convierte coordenadas [lon, lat] de GeoJSON a [lat, lon] para Leaflet
//   - Cachea respuestas por 1 hora para rutas frecuentes
// =============================================================================

import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const originLat = Number(url.searchParams.get('originLat'));
  const originLon = Number(url.searchParams.get('originLon'));
  const destLat = Number(url.searchParams.get('destLat'));
  const destLon = Number(url.searchParams.get('destLon'));

  if (
    !Number.isFinite(originLat) ||
    !Number.isFinite(originLon) ||
    !Number.isFinite(destLat) ||
    !Number.isFinite(destLon)
  ) {
    return new Response(JSON.stringify({ error: 'Coordenadas inválidas' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${originLon},${originLat};${destLon},${destLat}?overview=full&geometries=geojson`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    const res = await fetch(osrmUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'ArtesaNica/1.0 (https://artesa-nica-psi.vercel.app)',
      },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return new Response(JSON.stringify({ error: `Error OSRM: ${res.status}` }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await res.json();
    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
      const primaryRoute = data.routes[0];
      // OSRM GeoJSON coords son [lon, lat], Leaflet espera [lat, lon]
      const coordinates = primaryRoute.geometry.coordinates.map(
        ([lon, lat]: [number, number]) => [lat, lon]
      );
      const distanceKm = Number((primaryRoute.distance / 1000).toFixed(1));
      const durationMin = Math.max(1, Math.round(primaryRoute.duration / 60));

      return new Response(
        JSON.stringify({
          coordinates,
          distanceKm,
          durationMin,
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
          },
        }
      );
    }

    return new Response(JSON.stringify({ error: 'No se encontró ruta vial' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Error de conexión' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
