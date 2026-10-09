// =============================================================================
// /healthz — sonda de salud de la aplicación
// =============================================================================
// La usan las plataformas que no pasan por nginx para saber si la app está viva:
//   - Azure App Service: `healthCheckPath` (ver docs/AZURE.md).
//   - Docker/Compose: HEALTHCHECK del contenedor (alternativa a `/login`).
// Es deliberadamente barata: no consulta PocketBase ni la sesión, solo confirma
// que el servidor SSR responde. En el despliegue con nginx, ese vhost responde
// `/healthz` por sí mismo, así que esta ruta no se ve afectada.
// =============================================================================

import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = () =>
  new Response(JSON.stringify({ status: 'ok', ts: new Date().toISOString() }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
