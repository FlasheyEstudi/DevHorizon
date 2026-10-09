// =============================================================================
// security-headers.ts — cabeceras de seguridad cuando la app ES el borde
// =============================================================================
// El bloque `server.headers` de astro.config.mjs solo lo aplican el servidor de
// desarrollo y el adaptador de Vercel. El adaptador `@astrojs/node` (contenedor
// Docker, Azure App Service) NO lo usa, así que en ese escenario la app se
// quedaría sin CSP ni X-Frame-Options.
//
// Por eso aquí se pueden aplicar desde el propio servidor, activándolo con la
// variable de entorno:
//
//     SECURITY_HEADERS=app
//
// Es una variable de EJECUCIÓN: no hay que reconstruir la imagen.
//
//   - Azure App Service (sin proxy propio)   -> SECURITY_HEADERS=app
//   - Docker detrás de nginx                 -> sin definir (las pone nginx)
//   - Vercel                                 -> sin definir (las pone astro.config.mjs)
//
// El origen de PocketBase se resuelve en tiempo de ejecución, de modo que la CSP
// sigue siendo correcta al cambiar de instancia sin recompilar.
// =============================================================================

import { runtimeEnv } from './env';

const MAP_AND_TILES = [
  'https://*.tile.openstreetmap.org',
  'https://*.arcgisonline.com',
  'https://server.arcgisonline.com',
  'https://router.project-osrm.org',
];

/** Hosts de imágenes de terceros que usa la interfaz (AuthPanel). */
const IMAGE_HOSTS = ['https://i.postimg.cc', 'https://postimg.cc'];

/** Respaldo en la nube de PocketBase (failover). */
const CLOUD_FALLBACK = 'https://*.pockethost.io';

/** Origen de PocketBase tal como lo ve el NAVEGADOR, o null si es relativo (/pb). */
function pocketBaseOrigin(): string | null {
  const raw = runtimeEnv(
    'PUBLIC_POCKETBASE_URL',
    import.meta.env.PUBLIC_POCKETBASE_URL,
  ).trim();
  if (!raw.startsWith('http')) return null; // '/pb' → mismo origen, cubierto por 'self'
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}

/** ¿Hay que aplicar las cabeceras desde la app? */
export function securityHeadersEnabled(): boolean {
  return runtimeEnv('SECURITY_HEADERS', '').trim().toLowerCase() === 'app';
}

/** CSP equivalente a la de astro.config.mjs, con el origen de PB en runtime. */
export function contentSecurityPolicy(): string {
  const pb = pocketBaseOrigin();
  const extra = [CLOUD_FALLBACK, pb].filter(Boolean).join(' ');
  const img = ['https://*.pockethost.io', ...IMAGE_HOSTS, ...MAP_AND_TILES, pb]
    .filter(Boolean)
    .join(' ');
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' ${img} data: blob:`,
    "font-src 'self' data:",
    `connect-src 'self' ${MAP_AND_TILES.join(' ')} ${extra}`,
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}

export const STATIC_SECURITY_HEADERS: Record<string, string> = {
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self)',
};

/**
 * Devuelve la misma respuesta con las cabeceras de seguridad puestas.
 * No sobreescribe las que ya venga puestas (por ejemplo desde un proxy).
 */
export function withSecurityHeaders(response: Response): Response {
  if (!securityHeadersEnabled()) return response;
  try {
    if (!response.headers.has('Content-Security-Policy')) {
      response.headers.set('Content-Security-Policy', contentSecurityPolicy());
    }
    for (const [name, value] of Object.entries(STATIC_SECURITY_HEADERS)) {
      if (!response.headers.has(name)) response.headers.set(name, value);
    }
  } catch {
    // Respuestas con cabeceras inmutables (p. ej. 304): no es crítico.
  }
  return response;
}
