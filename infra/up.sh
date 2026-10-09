#!/usr/bin/env bash
# =============================================================================
# ArtesaNica — levanta el stack autoalojado (web + PocketBase)
# =============================================================================
#   bash infra/up.sh            # build + up + espera de healthchecks
#   bash infra/up.sh logs web   # argumentos extra se pasan a docker compose
#
# No necesita sudo: si tu usuario aún no está en el grupo `docker` (hace falta
# reiniciar sesión tras el install-host.sh), se reejecuta vía `sg docker`.
#
# El tráfico público sigue entrando por nginx (:80). Este script sólo gestiona
# los contenedores, que escuchan en 127.0.0.1:4322 y 127.0.0.1:8091.
# =============================================================================
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

ENV_FILE="${ENV_FILE:-.env.docker}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"

if [ ! -f "$ENV_FILE" ]; then
    echo "ERROR: falta $ENV_FILE" >&2
    echo "       cp .env.docker.example $ENV_FILE   y edita las credenciales" >&2
    exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
    echo "ERROR: docker no está instalado. Ejecuta primero: sudo bash infra/install-host.sh" >&2
    exit 1
fi

# --- Toda la gestión de compose pasa por aquí (resuelve el grupo docker) ----
compose() {
    if docker info >/dev/null 2>&1; then
        docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "$@"
    elif command -v sg >/dev/null 2>&1 && sg docker -c "docker info" >/dev/null 2>&1; then
        sg docker -c "$(printf 'docker compose -f %q --env-file %q ' "$COMPOSE_FILE" "$ENV_FILE")$(printf '%q ' "$@")"
    else
        echo "ERROR: no puedo hablar con el daemon de Docker." >&2
        echo "       Revisa 'systemctl status docker' o cierra sesión y vuelve a entrar" >&2
        echo "       para que se aplique el grupo docker." >&2
        exit 1
    fi
}

echo "==> Construyendo imágenes (Astro SSR + PocketBase)"
compose build

echo "==> Levantando contenedores"
compose up -d

echo "==> Esperando a que PocketBase y la web estén sanos"
for _ in $(seq 1 30); do
    unhealthy="$(compose ps --format '{{.Name}} {{.Health}}' 2>/dev/null | grep -v -e 'healthy$' -e '^$' || true)"
    if [ -z "$unhealthy" ]; then
        break
    fi
    sleep 3
done
compose ps

echo
echo "==> Comprobación rápida"
for path in /healthz /login /api/stores; do
    code="$(curl -s -o /dev/null -w '%{http_code}' -m 10 "http://localhost${path}" || echo 'sin respuesta')"
    printf '    http://localhost%-14s -> %s\n' "$path" "$code"
done

cat <<'EOF'

Stack arriba. Puertos:
  nginx (borde)          0.0.0.0:80     <- única entrada pública
  web  (contenedor)   127.0.0.1:4322    <- sólo loopback (dev: 4321)
  pb   (contenedor)   127.0.0.1:8091    <- sólo loopback (dev: 8090)

Verificación completa:  bash infra/verify.sh
Documentación:          docs/INFRA_PRODUCCION.md
EOF
