# syntax=docker/dockerfile:1
# =============================================================================
# ArtesaNica — imagen del frontend (Astro SSR con adaptador Node)
# =============================================================================
# Este Dockerfile corresponde al despliegue AUTOALOJADO (servidor propio detrás
# de nginx). El despliegue en Vercel NO lo usa: allí manda `astro.config.mjs`
# con `@astrojs/vercel`.
#
#   docker build -t artesanica-web .
#   docker run --rm -p 127.0.0.1:4321:4321 artesanica-web
#
# Variables:
#   - PUBLIC_POCKETBASE_URL se "hornea" en el bundle del CLIENTE (Vite la
#     sustituye en build), por eso entra como build-arg. Por defecto `/pb`,
#     que es la ruta que publica nginx en el mismo origen.
#   - El resto (POCKETBASE_URL, POCKETBASE_ADMIN_*, PUBLIC_SITE_ORIGIN) se leen
#     en TIEMPO DE EJECUCIÓN gracias a `src/lib/env.ts`, así que no hay que
#     reconstruir la imagen para cambiar de entorno ni quedan secretos dentro.
# =============================================================================

# --- 1. Dependencias ---------------------------------------------------------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# --- 2. Build del frontend ---------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app
ENV NODE_ENV=production
ARG PUBLIC_POCKETBASE_URL=/pb
ENV PUBLIC_POCKETBASE_URL=${PUBLIC_POCKETBASE_URL}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# `--config` apunta al config con el adaptador Node; astro.config.mjs queda intacto.
# Las cabeceras de seguridad cuando la app es el borde (Azure) se activan en
# ejecución con SECURITY_HEADERS=app: ver src/lib/security-headers.ts.
RUN npm run build -- --config astro.config.docker.mjs
# --- 3. Runtime --------------------------------------------------------------
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=4321 \
    POCKETBASE_URL=http://pocketbase:8090 \
    PUBLIC_POCKETBASE_URL=/pb
# Sólo dependencias de producción: el servidor generado es autocontenido
# (dist/server/entry.mjs) y únicamente necesita los paquetes de runtime.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force
COPY --from=build /app/dist ./dist
# Usuario sin privilegios (existe en la imagen oficial de Node).
USER node
EXPOSE 4321
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4321)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "./dist/server/entry.mjs"]
