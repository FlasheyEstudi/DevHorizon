#!/usr/bin/env bash
# =============================================================================
# ArtesaNica — verificación del despliegue autoalojado
# =============================================================================
#   bash infra/verify.sh
#
# Comprueba, en este orden:
#   1. Que nginx tenga una configuración válida (`nginx -t`).
#   2. Que los contenedores estén arriba y sanos.
#   3. Que los contenedores escuchen SÓLO en loopback (no expuestos a la red).
#   4. Que el borde responda: páginas SSR, API de la app y endpoints 2FA.
#   5. Que lo que NO debe ser público esté bloqueado (/pb/, /_/).
#   6. Que las cabeceras de seguridad viajen en las respuestas.
#
# Sale con código 0 si todo pasa, 1 si algo falla.
# =============================================================================
set -uo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"
ENV_FILE="${ENV_FILE:-.env.docker}"
BASE="${BASE_URL:-http://localhost}"

FAIL=0
ok()   { printf '  \033[32mOK\033[0m   %s\n' "$1"; }
bad()  { printf '  \033[31mFALLA\033[0m %s\n' "$1"; FAIL=1; }
skip() { printf '  --   %s\n' "$1"; }

expect() { # expect <descripción> <ruta> <código esperado>
    local desc="$1" path="$2" want="$3"
    local code
    code="$(curl -s -o /dev/null -w '%{http_code}' -m 15 "${BASE}${path}" || echo 000)"
    if [ "$code" = "$want" ]; then ok "$desc (${path} -> ${code})"
    else bad "$desc (${path} -> ${code}, esperado ${want})"; fi
}

echo "=============================================================="
echo " Verificación del despliegue (base: ${BASE})"
echo "=============================================================="

# --- 1. Configuración de nginx ---------------------------------------------
echo
echo "[1/6] Configuración de nginx"
if command -v nginx >/dev/null 2>&1; then
    if nginx -t 2>/dev/null; then ok "nginx -t: sintaxis válida"
    else bad "nginx -t: la configuración tiene errores"; fi
    if systemctl is-active --quiet nginx; then ok "servicio nginx activo"
    else bad "el servicio nginx no está activo"; fi
else
    skip "nginx no instalado en este host"
fi

# --- 2. Contenedores --------------------------------------------------------
echo
echo "[2/6] Contenedores"
if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
    docker compose -f docker-compose.yml --env-file "$ENV_FILE" ps
    for svc in artesanica-web artesanica-pb; do
        state="$(docker inspect -f '{{.State.Status}}' "$svc" 2>/dev/null || echo missing)"
        health="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}n/a{{end}}' "$svc" 2>/dev/null || echo n/a)"
        if [ "$state" = "running" ] && { [ "$health" = "healthy" ] || [ "$health" = "n/a" ]; }; then
            ok "$svc: running (health: $health)"
        else
            bad "$svc: state=$state health=$health"
        fi
    done
else
    skip "docker no disponible para este usuario (o el stack no está levantado)"
fi

# --- 3. Aislamiento: sólo loopback -----------------------------------------
echo
echo "[3/6] Aislamiento de puertos (deben ser 127.0.0.1, nunca 0.0.0.0)"
if command -v ss >/dev/null 2>&1; then
    for spec in "4322:web (Astro)" "8091:PocketBase"; do
        port="${spec%%:*}"; label="${spec#*:}"
        listen="$(ss -ltnH "sport = :$port" 2>/dev/null | awk '{print $4}' | sort -u | tr '\n' ' ')"
        if [ -z "$listen" ]; then bad "puerto $port ($label) no está escuchando"
        elif echo "$listen" | grep -qE '0\.0\.0\.0:|\*:'; then
            bad "puerto $port ($label) escucha en $listen (¡expuesto a la red!)"
        else ok "puerto $port ($label) sólo en $listen"; fi
    done
    if ss -ltnH 'sport = :80' 2>/dev/null | grep -q .; then ok "puerto 80 público (nginx)"
    else bad "nginx no está escuchando en :80"; fi
else
    skip "ss no disponible"
fi

# --- 4. El borde responde ---------------------------------------------------
echo
echo "[4/6] Respuestas a través del proxy inverso"
expect "healthz del borde"        "/healthz"            200
expect "home SSR"                 "/"                   200
expect "directorio de tiendas"    "/tiendas"            200
expect "login"                    "/login"              200
expect "API de la app"            "/api/stores"         200
expect "endpoint 2FA sin sesión"  "/api/auth/2fa/status" 401
expect "ruta protegida redirige"  "/perfil"             302

# --- 5. Bloqueos ------------------------------------------------------------
echo
echo "[5/6] Superficie cerrada"
expect "API cruda de PocketBase bloqueada" "/pb/api/collections/users/records" 404
expect "panel de PocketBase bloqueado"     "/_/"                                404

# --- 6. Cabeceras de seguridad ---------------------------------------------
echo
echo "[6/6] Cabeceras de seguridad"
headers="$(curl -sI -m 15 "${BASE}/login" || true)"
for h in "content-security-policy" "x-frame-options" "x-content-type-options" "referrer-policy" "permissions-policy"; do
    if printf '%s' "$headers" | grep -qi "^${h}:"; then ok "cabecera $h presente"
    else bad "falta la cabecera $h"; fi
done

echo
if [ "$FAIL" -eq 0 ]; then
    echo "RESULTADO: todo correcto ✅"
else
    echo "RESULTADO: hay fallos ❌ (revisa arriba)"
fi
exit "$FAIL"
