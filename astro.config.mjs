// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import vercel from '@astrojs/vercel';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import icon from 'astro-icon';


// https://astro.build/config
//
// Estrategia de output:
// - `output: 'static'` por default (todo prerender).
// - Las páginas/endpoints que necesiten SSR usan `export const prerender = false`.
// - En Vercel, el adapter `@astrojs/vercel` convierte automáticamente
//   los endpoints SSR en Vercel Functions.

// Origen de PocketBase. Lo usamos en el CSP para img-src y connect-src
// (imagenes servidas desde /api/files/{collectionId}/{recordId}/{filename}
// y el endpoint /api/* para refresh de tokens). En prod PUBLIC_POCKETBASE_URL
// apunta al host publico de PB; en dev el fallback es localhost:8090.
const pbOrigin = (import.meta.env.PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090') + ' https://vapor-invented.pockethost.io';

export default defineConfig({
  site: 'https://artesa-nica-psi.vercel.app',
  output: 'static',
  adapter: vercel(),

  // Prefetch de links en viewport para mejorar la navegación.
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport',
  },

  // i18n oficial de Astro (reemplaza js/i18n/* del proyecto viejo).
  // src/i18n/ui.ts tiene el diccionario de strings.
  // src/i18n/utils.ts tiene getLangFromUrl + useTranslations.
  i18n: {
    defaultLocale: 'es',
    locales: ['es', 'en', 'miq'],
    routing: {
      prefixDefaultLocale: false, // '/' es español, '/en/' es inglés, '/miq/' es miskitu
      fallbackType: 'redirect',
    },
    fallback: {
      en: 'es', // si falta una pagina en /en/, redirige a /es/
      miq: 'es', // si falta una pagina en /miq/, redirige a /es/
    },
  },

  // Astro Fonts API — self-hosts Poppins para evitar requests a fonts.googleapis.com.
  // Antes se importaba via @import url(...) en global.css, lo que violaba el CSP.
  // Ahora se sirve desde /_astro/fonts/* y queda cubierto por default-src 'self'.
  // Ver https://docs.astro.build/en/guides/fonts/
  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Poppins',
      cssVariable: '--font-poppins',
      weights: [300, 400, 500, 600, 700],
      styles: ['normal'],
      fallbacks: ['sans-serif'],
    },
  ],

  // astro-icon — librería de íconos tree-shakeable via Iconify.
  // Los íconos se embeben en el bundle (sin CDN) y respetan currentColor.
  // Uso: <Icon name="lucide:home" class="w-5 h-5" />
  //
  // @astrojs/react — habilita islas React para componentes interactivos
  // que requieren estado cliente (e.g. dropdown de shadcn en el header).
  // El resto del sitio sigue 100% Astro nativo.
  integrations: [react(), icon()],

  // Cabeceras de seguridad.
  //
  // Cambios recientes:
  // - font-src: solo 'self' y data: (Poppins self-hosted, ya no requiere fonts.gstatic.com).
  // - style-src-elem: añade https://fonts.googleapis.com quitado; FontAwesome CDN eliminado.
  //
  // Trade-off conocido: `script-src` y `style-src` mantienen `'unsafe-inline'`
  // porque Astro inserta scripts inline para hidratación y estilos scoped.
  // CSP basado en nonces queda como trabajo deferido.
  //
  // HSTS se aplica solo en producción para no romper HTTPS testing en localhost.
  //
  // img-src incluye el origen de PocketBase para que las imagenes servidas
  // desde /api/files/{collectionId}/{recordId}/{filename} (productos, tiendas,
  // avatars) carguen. La URL se resuelve en runtime via PUBLIC_POCKETBASE_URL
  // para que en prod apunte al host publico de PB sin hardcodear localhost.
  // En dev el fallback es http://127.0.0.1:8090.
  server: {
    headers: {
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline'",
        // img-src incluye `*.tile.openstreetmap.org` y `*.arcgisonline.com` para los tiles PNG/JPG
        // del mapa (geopoint-marketplace-features). connect-src lo cubre
        // tambien porque Leaflet hace fetch del tile metadata.
        // `blob:` necesario para previews de File via URL.createObjectURL
        // (usado en el form de productos y avatar del perfil).
        "img-src 'self' https://i.postimg.cc https://postimg.cc https://*.tile.openstreetmap.org https://*.arcgisonline.com https://server.arcgisonline.com https://*.pockethost.io https://vapor-invented.pockethost.io data: blob: " + pbOrigin,
        "font-src 'self' data:",
        "connect-src 'self' https://*.tile.openstreetmap.org https://*.arcgisonline.com https://server.arcgisonline.com https://router.project-osrm.org https://*.pockethost.io https://vapor-invented.pockethost.io " + pbOrigin,
        // 'self' en lugar de 'none': permite que herramientas de dev/preview
        // que embeben el sitio en un iframe same-origin (DevTools device mode,
        // VSCode embedded browser, port-forwarding tools) carguen la pagina.
        // Sitios externos siguen bloqueados — el riesgo de clickjacking real
        // viene de terceros, no de self-embedding.
        "frame-ancestors 'self'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join('; '),
      'X-Frame-Options': 'SAMEORIGIN',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      // geolocation=(self): permite que el documento mismo invoque
      // navigator.geolocation en el widget "Cerca de mi". No se delega
      // a iframes de OSM (no lo necesitan).
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self)',
      // HSTS solo en producción — en dev rompería el flujo HTTPS de localhost.
      ...(import.meta.env.PROD
        ? { 'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload' }
        : {}),
    },
  },

  vite: {
    resolve: {
      dedupe: ['react', 'react-dom'],
    },
    // El SDK de PocketBase y librerías React del mapa se benefician de bundling.
    ssr: {
      noExternal: ['pocketbase', 'react-leaflet-cluster'],
    },
    // Pre-bundle explícito de las deps del mapa y React.
    optimizeDeps: {
      include: ['react', 'react-dom', 'leaflet', 'leaflet.markercluster', 'react-leaflet', 'react-leaflet-cluster', 'pocketbase'],
    },
    // Tailwind v4 via plugin oficial de Vite (CSS-first config en global.css).
    plugins: [tailwindcss()],
  },
});