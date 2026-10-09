// @ts-check
// =============================================================================
// astro.config.docker.mjs — Build/ejecución para servidor propio (Docker)
// =============================================================================
// El despliegue en Vercel sigue usando `astro.config.mjs` con el adaptador
// `@astrojs/vercel`; este archivo NO lo reemplaza: se usa sólo cuando se
// construye el servidor autoalojado.
//
//     npx astro build --config astro.config.docker.mjs
//     node ./dist/server/entry.mjs
//
// Configuración heredada tal cual (i18n, fuentes, Tailwind, React, iconos,
// alias y `output: 'static'`) y sólo se cambia el adaptador:
//
//   - `@astrojs/node` en modo `standalone`: genera un servidor Node
//     (`dist/server/entry.mjs`) que atiende tanto los archivos estáticos del
//     cliente como las rutas con `export const prerender = false`
//     (todos los `/api/*`), que es lo que nginx pone detrás del proxy inverso.
//   - Se descarta `server.headers` del config base porque en este escenario las
//     cabeceras de seguridad las aplica nginx, que es el borde público.
//
// Versión fijada: @astrojs/node 11.1.2 (compatible con astro 7.0.3; las
// versiones >=11.1.3 exigen astro >=7.2.1).
// =============================================================================

import base from './astro.config.mjs';
import node from '@astrojs/node';

const { server: _devServerHeaders, ...inherited } = base;

export default {
  ...inherited,
  adapter: node({ mode: 'standalone' }),
};
