# syntax=docker/dockerfile:1
# =============================================================================
# ArtesaNica — imagen de PocketBase (base de datos, auth y almacenamiento)
# =============================================================================
# Construye desde la release OFICIAL de PocketBase (GitHub), sin imágenes de
# terceros. La versión debe coincidir con el SDK del frontend (`pocketbase`
# 0.27.x en package.json).
#
#   docker build -f infra/docker/pocketbase.Dockerfile -t artesanica-pocketbase .
#
# El binario se ejecuta como usuario sin privilegios (uid 1000) y los datos
# viven en el volumen `/data`. Las migraciones y los hooks se montan en modo
# lectura desde el repositorio, de forma que el esquema sigue versionado en Git.
# =============================================================================

# --- 1. Descarga del binario oficial -----------------------------------------
FROM alpine:3.20 AS download
ARG PB_VERSION=0.27.2
# TARGETARCH lo rellena BuildKit: amd64 en x86_64, arm64 en Apple Silicon / ARM
ARG TARGETARCH=amd64
RUN apk add --no-cache ca-certificates wget unzip \
    && wget -q -O /tmp/pb.zip \
       "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_${TARGETARCH}.zip" \
    && unzip /tmp/pb.zip -d /pb \
    && rm /tmp/pb.zip \
    && chmod +x /pb/pocketbase

# --- 2. Runtime --------------------------------------------------------------
FROM alpine:3.20
RUN apk add --no-cache ca-certificates tzdata wget \
    && addgroup -g 1000 -S pocketbase \
    && adduser -u 1000 -S -G pocketbase pocketbase

WORKDIR /app
COPY --from=download /pb/pocketbase /app/pocketbase
COPY infra/docker/pb-entrypoint.sh /app/pb-entrypoint.sh
RUN chmod +x /app/pb-entrypoint.sh \
    && mkdir -p /data \
    && chown -R pocketbase:pocketbase /app /data

USER pocketbase
EXPOSE 8090
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=5 \
    CMD wget -q --spider "http://127.0.0.1:${PB_PORT:-8090}/api/health" || exit 1

ENTRYPOINT ["/app/pb-entrypoint.sh"]
