#!/bin/sh
# =============================================================================
# pb-entrypoint.sh — arranque de PocketBase dentro del contenedor
# =============================================================================
# 1. Crea o actualiza el superusuario desde variables de entorno (idempotente).
#    Es imprescindible para el servidor Astro: las operaciones administrativas
#    (seed, métricas del dashboard y el estado 2FA de la verificación en dos
#    pasos) usan el cliente de superusuario.
# 2. Arranca `serve` aplicando las migraciones pendientes (`--automigrate`).
#
# Variables:
#   PB_ADMIN_EMAIL / PB_ADMIN_PASSWORD  credenciales del superusuario (requeridas)
#   PB_DATA_DIR        directorio de datos (por defecto /data)
#   PB_MIGRATIONS_DIR  migraciones versionadas (por defecto /migrations)
#   PB_HOOKS_DIR       hooks JSVM (por defecto /hooks)
#   PB_PORT            puerto interno (por defecto 8090)
# =============================================================================
set -e

DATA_DIR="${PB_DATA_DIR:-/data}"
MIGRATIONS_DIR="${PB_MIGRATIONS_DIR:-/migrations}"
HOOKS_DIR="${PB_HOOKS_DIR:-/hooks}"
PORT="${PB_PORT:-8090}"

if [ -n "${PB_ADMIN_EMAIL}" ] && [ -n "${PB_ADMIN_PASSWORD}" ]; then
  echo "[pb-entrypoint] asegurando superusuario ${PB_ADMIN_EMAIL}"
  /app/pocketbase superuser upsert "${PB_ADMIN_EMAIL}" "${PB_ADMIN_PASSWORD}" --dir "${DATA_DIR}" || {
    echo "[pb-entrypoint] AVISO: no se pudo crear/actualizar el superusuario" >&2
  }
else
  echo "[pb-entrypoint] AVISO: PB_ADMIN_EMAIL/PB_ADMIN_PASSWORD sin definir;" >&2
  echo "               el 2FA y las operaciones administrativas no funcionarán." >&2
fi

set -- serve --dir "${DATA_DIR}" --http "0.0.0.0:${PORT}"
[ -d "${MIGRATIONS_DIR}" ] && set -- "$@" --migrationsDir "${MIGRATIONS_DIR}"
[ -d "${HOOKS_DIR}" ] && set -- "$@" --hooksDir "${HOOKS_DIR}"

echo "[pb-entrypoint] exec pocketbase $*"
exec /app/pocketbase "$@"
