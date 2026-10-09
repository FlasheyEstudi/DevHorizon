#!/usr/bin/env bash
# =============================================================================
# ArtesaNica — despliegue en Azure App Service (Linux, contenedor)
# =============================================================================
# Publica la app usando la imagen que construye el Dockerfile del repositorio.
# Todo entra por variables ocultas (Application Settings) y los permisos de red
# quedan explícitos. Ver docs/AZURE.md para el detalle y el porqué de cada paso.
#
# Uso:
#   export RG=artesanica-rg
#   export APP=artesanica-web-flashey        # único en todo Azure
#   export PB_URL=https://<tu-instancia>.pockethost.io
#   export PB_ADMIN_EMAIL=admin@artesa-nica.local
#   export PB_ADMIN_PASSWORD='<clave>'
#   export PUBLIC_SITE_ORIGIN=https://$APP.azurewebsites.net   # opcional
#   bash infra/azure/deploy.sh
#
#   SKIP_BUILD=1 bash infra/azure/deploy.sh   # solo reconfigura (sin reconstruir)
#
# Requisitos: az CLI con sesión iniciada (`az login`) y permisos para crear el
# grupo de recursos, el ACR, el plan y la Web App.
# =============================================================================
set -euo pipefail

RG="${RG:-artesanica-rg}"
APP="${APP:-artesanica-web-flashey}"
LOCATION="${LOCATION:-eastus2}"
SKU="${SKU:-B1}"                     # F1 no soporta contenedores
TAG="${TAG:-v1}"
PB_URL="${PB_URL:-}"
PB_ADMIN_EMAIL="${PB_ADMIN_EMAIL:-}"
PB_ADMIN_PASSWORD="${PB_ADMIN_PASSWORD:-}"
PUBLIC_SITE_ORIGIN="${PUBLIC_SITE_ORIGIN:-https://${APP}.azurewebsites.net}"
PUBLIC_ALLOWED_ORIGINS="${PUBLIC_ALLOWED_ORIGINS:-}"
CORS_ORIGINS="${CORS_ORIGINS:-}"     # opcional: orígenes externos que llaman a /api/*
ACR="${ACR:-${APP}acr}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

fail() { echo "ERROR: $*" >&2; exit 1; }
step() { echo; echo "==> $*"; }

[ -n "$PB_URL" ] || fail "define PB_URL (https://<tu-instancia>.pockethost.io)"
[ -n "$PB_ADMIN_EMAIL" ] || fail "define PB_ADMIN_EMAIL (superusuario de PocketBase)"
[ -n "$PB_ADMIN_PASSWORD" ] || fail "define PB_ADMIN_PASSWORD"
case "$PB_URL" in https://*) ;; *) fail "PB_URL debe empezar por https:// (recibido: $PB_URL)";; esac

command -v az >/dev/null 2>&1 || fail "falta el CLI de Azure (https://aka.ms/azcli)"
az account show >/dev/null 2>&1 || fail "sin sesión en Azure: ejecuta 'az login'"

cd "$ROOT"
echo "Proyecto : $ROOT"
echo "Recursos : $RG / $APP / $ACR ($LOCATION, plan $SKU)"
echo "PocketBase: $PB_URL"
echo "Origen web: $PUBLIC_SITE_ORIGIN"

# ---------------------------------------------------------------------------
step "Grupo de recursos"
az group create -n "$RG" -l "$LOCATION" -o none

# ---------------------------------------------------------------------------
step "Registro de contenedores (ACR)"
if ! az acr show -n "$ACR" -g "$RG" -o none 2>/dev/null; then
    az acr create -n "$ACR" -g "$RG" --sku Basic -o none
fi

if [ "${SKIP_BUILD:-0}" != "1" ]; then
    step "Compilando la imagen EN LA NUBE (no hace falta Docker local)"
    # PUBLIC_POCKETBASE_URL es build-arg: Vite lo inyecta en el bundle del
    # navegador. El resto de la configuración entra en ejecución (variables
    # ocultas), así que cambiar de instancia o de secretos no exige reconstruir.
    az acr build -r "$ACR" -g "$RG" -t "artesanica-web:${TAG}" \
        --build-arg PUBLIC_POCKETBASE_URL="$PB_URL" \
        . -o none
else
    echo "    (SKIP_BUILD=1: no se reconstruye la imagen)"
fi

# ---------------------------------------------------------------------------
step "Plan de App Service (Linux) y Web App"
if ! az appservice plan show -n "${APP}-plan" -g "$RG" -o none 2>/dev/null; then
    az appservice plan create -n "${APP}-plan" -g "$RG" --is-linux --sku "$SKU" -o none
fi

if az webapp show -n "$APP" -g "$RG" -o none 2>/dev/null; then
    echo "    la Web App ya existe: actualizo la imagen"
    az webapp config container set -n "$APP" -g "$RG" \
        --docker-custom-image-name "${ACR}.azurecr.io/artesanica-web:${TAG}" \
        --docker-registry-server-url "https://${ACR}.azurecr.io" -o none
else
    az webapp create -n "$APP" -g "$RG" -p "${APP}-plan" \
        -i "${ACR}.azurecr.io/artesanica-web:${TAG}" -o none
fi

# ---------------------------------------------------------------------------
step "Identidad gestionada con permiso de lectura al ACR (sin contraseñas)"
az webapp identity assign -n "$APP" -g "$RG" -o none
PRINCIPAL_ID="$(az webapp identity show -n "$APP" -g "$RG" --query principalId -o tsv)"
ACR_ID="$(az acr show -n "$ACR" -g "$RG" --query id -o tsv)"
az role assignment create --assignee "$PRINCIPAL_ID" --scope "$ACR_ID" \
    --role acrPull -o none 2>/dev/null || echo "    (el permiso acrPull ya estaba asignado)"
az webapp config set -n "$APP" -g "$RG" \
    --generic-configurations '{"acrUseManagedIdentityCreds":true,"healthCheckPath":"/healthz"}' -o none

# ---------------------------------------------------------------------------
step "Variables ocultas (Application Settings)"
SETTINGS=(
    "WEBSITES_PORT=4321"
    "NODE_ENV=production"
    "HOST=0.0.0.0"
    "PORT=4321"
    "POCKETBASE_URL=${PB_URL}"
    "PUBLIC_POCKETBASE_URL=${PB_URL}"
    "PUBLIC_SITE_ORIGIN=${PUBLIC_SITE_ORIGIN}"
    "POCKETBASE_ADMIN_EMAIL=${PB_ADMIN_EMAIL}"
    "POCKETBASE_ADMIN_PASSWORD=${PB_ADMIN_PASSWORD}"
    # La app es el borde en Azure: aplica ella misma la CSP y el resto de
    # cabeceras de seguridad (con nginx delante esto va sin definir).
    "SECURITY_HEADERS=app"
)
[ -n "$PUBLIC_ALLOWED_ORIGINS" ] && SETTINGS+=("PUBLIC_ALLOWED_ORIGINS=${PUBLIC_ALLOWED_ORIGINS}")
az webapp config appsettings set -n "$APP" -g "$RG" --settings "${SETTINGS[@]}" -o none
echo "    aplicadas: $(printf '%s ' "${SETTINGS[@]%%=*}")"

# ---------------------------------------------------------------------------
step "Red: HTTPS obligatorio, siempre activo y CORS si aplica"
az webapp update -n "$APP" -g "$RG" --https-only true -o none
az webapp config set -n "$APP" -g "$RG" --always-on true -o none
if [ -n "$CORS_ORIGINS" ]; then
    IFS=',' read -r -a origins <<< "$CORS_ORIGINS"
    az webapp cors add -n "$APP" -g "$RG" --allowed-origins "${origins[@]}" -o none
    echo "    CORS del borde: ${origins[*]}"
    echo "    (la app en sí es de un solo origen: esto solo afecta a clientes externos)"
else
    echo "    CORS del borde: sin cambios (la app es de un solo origen)"
fi

# ---------------------------------------------------------------------------
step "Reinicio y comprobación"
az webapp restart -n "$APP" -g "$RG" -o none
URL="https://${APP}.azurewebsites.net"
for i in $(seq 1 20); do
    code="$(curl -s -o /dev/null -w '%{http_code}' -m 10 "${URL}/healthz" || echo 000)"
    [ "$code" = "200" ] && break
    printf '    esperando… /healthz -> %s\n' "$code"; sleep 6
done
echo
for path in /healthz /login /productos; do
    printf '    %-11s -> %s\n' "$path" \
        "$(curl -s -o /dev/null -w '%{http_code}' -m 20 "${URL}${path}" || echo 'sin respuesta')"
done

cat <<EOF

Listo. Web App: ${URL}
  logs:      az webapp log tail -n ${APP} -g ${RG}
  actualizar: TAG=v2 bash infra/azure/deploy.sh
  parar:     az webapp stop -n ${APP} -g ${RG}
  borrar:    az group delete -n ${RG}

Recordatorio: el navegador descarga los archivos de PocketBase directamente desde
${PB_URL}; comprueba que las imágenes cargan en /productos.
EOF
