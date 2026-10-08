#!/usr/bin/env bash
# =============================================================================
# pb/start.sh — Arranca y administra el PocketBase local de ArtesaNica.
# =============================================================================
# Uso:
#   pb/start.sh start    Levanta PocketBase en 127.0.0.1:8090 (datos en pb/pb_data)
#   pb/start.sh stop     Detiene el proceso
#   pb/start.sh status   Estado + conteo de registros por coleccion
#   pb/start.sh seed     Carga los datos de demo (node pb/seeds/index.js)
#   pb/start.sh superuser  Crea/actualiza el superusuario desde .env (necesario en una base nueva)
#   pb/start.sh logs     Sigue el log en vivo
#
# El binario se espera en pb/pocketbase (ver .gitignore). Para descargarlo:
#   curl -sL -o /tmp/pb.zip https://github.com/pocketbase/pocketbase/releases/download/v0.27.2/pocketbase_0.27.2_linux_amd64.zip
#   cd pb && python3 -c "import zipfile;zipfile.ZipFile('/tmp/pb.zip').extractall('.')" && chmod +x pocketbase
#
# Variables opcionales:
#   POCKETBASE_PORT   Puerto HTTP (por defecto 8090)
#   POCKETBASE_BIN    Ruta del binario (por defecto <repo>/pb/pocketbase)
# =============================================================================
set -euo pipefail

PB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$PB_DIR")"
BIN="${POCKETBASE_BIN:-$PB_DIR/pocketbase}"
PORT="${POCKETBASE_PORT:-8090}"
URL="http://127.0.0.1:$PORT"
PIDFILE="$PB_DIR/.pid"
LOGFILE="$PB_DIR/pb.log"

running() {
  if [[ -f "$PIDFILE" ]] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then
    return 0
  fi
  pgrep -f "pocketbase serve" >/dev/null 2>&1
}

health() {
  curl -s -m 3 "$URL/api/health" | grep -q '"code":200'
}

wait_ready() {
  for _ in $(seq 1 30); do
    if health; then return 0; fi
    sleep 0.5
  done
  return 1
}

case "${1:-}" in
  start)
    if [[ ! -x "$BIN" ]]; then
      echo "No se encontró el binario en $BIN" >&2
      echo "Descargalo desde https://github.com/pocketbase/pocketbase/releases (v0.27.2, linux_amd64)" >&2
      echo "y descomprimilo dentro de pb/ (ver la cabecera de este script)." >&2
      exit 1
    fi
    if running; then
      echo "PocketBase ya está en ejecución ($URL)"
      exit 0
    fi
    # CWD = pb/ para que tome pb_data, pb_migrations y pb_hooks por defecto.
    cd "$PB_DIR"
    nohup "$BIN" serve > "$LOGFILE" 2>&1 &
    echo $! > "$PIDFILE"
    if wait_ready; then
      echo "PocketBase escuchando en $URL"
      echo "  datos:      $PB_DIR/pb_data"
      echo "  panel:      $URL/_/"
      echo "  log:        $LOGFILE"
    else
      echo "PocketBase no respondió a tiempo; revisá $LOGFILE" >&2
      exit 1
    fi
    ;;

  stop)
    if ! running; then
      echo "PocketBase no estaba en ejecución"
      rm -f "$PIDFILE"
      exit 0
    fi
    if [[ -f "$PIDFILE" ]]; then
      kill "$(cat "$PIDFILE")" 2>/dev/null || true
      rm -f "$PIDFILE"
    else
      pkill -f "pocketbase serve" || true
    fi
    for _ in $(seq 1 20); do
      running || break
      sleep 0.5
    done
    echo "PocketBase detenido"
    ;;

  status)
    if ! running; then
      echo "PocketBase detenido ($URL)"
      exit 1
    fi
    echo "PocketBase en ejecución -> $URL"
    echo "  datos: $PB_DIR/pb_data"
    for c in users categories stores products news orders reviews; do
      printf '  %-11s ' "$c"
      curl -s -m 5 "$URL/api/collections/$c/records?perPage=1" \
        | python3 -c 'import sys,json;d=json.load(sys.stdin);print("totalItems:",d.get("totalItems"))' \
        2>/dev/null || echo "(requiere autenticación)"
    done
    ;;

  superuser)
    if [[ ! -x "$BIN" ]]; then
      echo "No se encontró el binario en $BIN" >&2
      exit 1
    fi
    EMAIL="$(grep -E '^POCKETBASE_ADMIN_EMAIL=' "$PROJECT_DIR/.env" | cut -d= -f2- || true)"
    PASS="$(grep -E '^POCKETBASE_ADMIN_PASSWORD=' "$PROJECT_DIR/.env" | cut -d= -f2- || true)"
    if [[ -z "$EMAIL" || -z "$PASS" ]]; then
      echo "Definí POCKETBASE_ADMIN_EMAIL y POCKETBASE_ADMIN_PASSWORD en .env" >&2
      exit 1
    fi
    cd "$PB_DIR"
    "$BIN" superuser upsert "$EMAIL" "$PASS"
    ;;

  seed)
    if ! running; then
      echo "PocketBase no está en ejecución: corré primero pb/start.sh start" >&2
      echo "(en una base nueva: pb/start.sh superuser y después pb/start.sh seed)" >&2
      exit 1
    fi
    cd "$PROJECT_DIR"
    node pb/seeds/index.js
    ;;

  logs)
    touch "$LOGFILE"
    tail -f "$LOGFILE"
    ;;

  *)
    echo "Uso: $0 start|stop|status|seed|logs" >&2
    exit 1
    ;;
esac
