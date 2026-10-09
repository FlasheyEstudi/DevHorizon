# Despliegue en Azure — ArtesaNica (App Service con contenedor)

Guía **desde cero** para publicar la app en **Azure App Service (Linux) con contenedor**,
usando la imagen que ya construye el `Dockerfile` del repositorio (adaptador
`@astrojs/node`, servidor standalone en `dist/server/entry.mjs`).

Los dos requisitos que cubre este documento:

- **Conexión y CORS**: toda la configuración entra por **variables ocultas**
  (*Application Settings*, con opción de Key Vault) y los permisos de red quedan
  explícitos (CORS del borde, lista de orígenes del CSRF y CORS de PocketBase).
- **Compilación final**: la imagen se construye **en la nube** con `az acr build`
  (no hace falta Docker local), en modo producción y comprimida por el borde.

> El despliegue con nginx + Docker del repositorio (`infra/`, `docs/INFRA_PRODUCCION.md`)
> sigue siendo válido y no se toca. Este es el camino para Azure, sin proxy propio.

---

## 1. Qué se despliega

```
navegador ──► Azure App Service (contenedor)
              ├── servidor Node (Astro SSR)         · /, /api/*, /healthz
              └── llama a PocketBase en PocketHost  · https://<tu-instancia>.pockethost.io
```

- La app es **de un solo origen**: las páginas y `/api/*` salen del mismo host, así
  que **no necesita CORS para funcionar**.
- El navegador habla con PocketBase solo para archivos/imágenes (las URLs las
  genera `PUBLIC_POCKETBASE_URL`); PocketBase responde `Access-Control-Allow-Origin: *`
  (verificado), así que ese acceso cruzado funciona sin tocar nada.
- Los **secretos** (superusuario de PocketBase) entran como *Application Settings*
  y **nunca** dentro de la imagen: `src/lib/env.ts` los lee en ejecución.

## 2. Requisitos

- Cuenta de Azure con una suscripción activa y `az` CLI (`az login`).
- `az extension add --name containerapp` no hace falta (usamos App Service).
- Region sugerida: `eastus2` (o `brazilsouth`, más cerca de Nicaragua). El plan
  **B1** es el mínimo que soporta contenedores (F1 gratuito **no** sirve).

## 3. Despliegue en 6 comandos

El script `infra/azure/deploy.sh` hace exactamente esto, con comprobaciones:

```bash
cd ~/Artesa_Nica
export RG=artesanica-rg
export APP=artesanica-web-flashey          # debe ser único en todo Azure
export PB_URL=https://<tu-instancia>.pockethost.io
bash infra/azure/deploy.sh
```

Y los pasos a mano, si prefieres verlos uno a uno:

```bash
az login
az group create -n $RG -l eastus2

# 1) Registro de contenedores y compilación EN LA NUBE (sin Docker local)
az acr create -n ${APP}acr -g $RG --sku Basic
az acr build -r ${APP}acr -g $RG -t artesanica-web:v1 \
  --build-arg PUBLIC_POCKETBASE_URL="$PB_URL" \
  .

# 2) Plan (Linux, B1) y Web App con esa imagen
az appservice plan create -n ${APP}-plan -g $RG --is-linux --sku B1
az webapp create -n $APP -g $RG -p ${APP}-plan -i ${APP}acr.azurecr.io/artesanica-web:v1

# 3) Permitir que la Web App baje la imagen con identidad gestionada (sin contraseñas)
az webapp identity assign -n $APP -g $RG
az role assignment create \
  --assignee "$(az webapp identity show -n $APP -g $RG --query principalId -o tsv)" \
  --scope "$(az acr show -n ${APP}acr -g $RG --query id -o tsv)" \
  --role acrPull
az webapp config set -n $APP -g $RG \
  --generic-configurations '{"acrUseManagedIdentityCreds":true,"healthCheckPath":"/healthz"}'

# 4) Variables ocultas (Application Settings)
az webapp config appsettings set -n $APP -g $RG --settings \
  WEBSITES_PORT=4321 \
  NODE_ENV=production HOST=0.0.0.0 PORT=4321 \
  POCKETBASE_URL="$PB_URL" \
  PUBLIC_POCKETBASE_URL="$PB_URL" \
  PUBLIC_SITE_ORIGIN="https://$APP.azurewebsites.net" \
  SECURITY_HEADERS=app \
  POCKETBASE_ADMIN_EMAIL="admin@artesa-nica.local" \
  POCKETBASE_ADMIN_PASSWORD="<tu-clave-del-superusuario>"

# 5) HTTPS obligatorio y arranque siempre activo (evita el cold start de B1)
az webapp update -n $APP -g $RG --https-only true
az webapp config set -n $APP -g $RG --always-on true

# 6) Reiniciar y ver
az webapp restart -n $APP -g $RG
curl -s "https://$APP.azurewebsites.net/healthz"
```

`PUBLIC_POCKETBASE_URL` va **dos veces a propósito**:

| Momento | Por qué |
| :--- | :--- |
| `--build-arg` | Vite lo sustituye dentro del bundle del **navegador** (las `<img>` y el SDK del cliente). Si falta, el navegador buscaría `/pb`, que en Azure no existe. |
| `--settings` | Lo lee el **servidor** en ejecución (`runtimeEnv`), así cambiarlo no obliga a reconstruir. |

## 4. Variables de entorno (todas ocultas)

| Variable | Obligatoria | Secreto | Valor / notas |
| :--- | :---: | :---: | :--- |
| `WEBSITES_PORT` | Sí | No | `4321` — el puerto que expone la imagen; sin esto Azure busca el 80 y da error. |
| `NODE_ENV` | Sí | No | `production`. |
| `HOST` / `PORT` | Sí | No | `0.0.0.0` / `4321`. |
| `POCKETBASE_URL` | Sí | No | `https://<tu-instancia>.pockethost.io` (uso servidor). |
| `PUBLIC_POCKETBASE_URL` | Sí | No | Igual, y además **build-arg** (uso navegador). |
| `POCKETBASE_ADMIN_EMAIL` | Sí | **Sí** | Superusuario de PocketBase. Necesario para el 2FA. |
| `POCKETBASE_ADMIN_PASSWORD` | Sí | **Sí** | La misma clave. Si falta, `/api/auth/login` responde **503** (fallo cerrado). |
| `PUBLIC_SITE_ORIGIN` | Sí | No | `https://<app>.azurewebsites.net` (o tu dominio). Es la allowlist del CSRF: si no coincide con el origen real, los POST devuelven **403**. |
| `PUBLIC_ALLOWED_ORIGINS` | No | No | Orígenes extra separados por coma (por ejemplo si entras por IP y por dominio). |
| `SECURITY_HEADERS` | Sí | No | `app` — la app aplica CSP, `X-Frame-Options`, `nosniff`, `Referrer-Policy` y `Permissions-Policy`. El adaptador Node **no** usa el bloque `server.headers` del config, así que sin esta variable Azure no enviaría ninguna. |

Para no dejar los secretos en texto plano en la Web App (siguen siendo "ocultos"
pero visibles para quien tenga acceso al portal), usa **Key Vault**:

```bash
az keyvault create -n ${APP}-kv -g $RG -l eastus2
az keyvault secret set --vault-name ${APP}-kv -n pb-admin-password --value '<clave>'
az webapp config appsettings set -n $APP -g $RG --settings \
  POCKETBASE_ADMIN_PASSWORD="@Microsoft.KeyVault(SecretUri=https://${APP}-kv.vault.azure.net/secrets/pb-admin-password/)"
```

(Requiere dar permiso de lectura a la identidad gestionada:
`az keyvault set-policy --name ${APP}-kv --object-id <principalId> --secret-permissions get`.)

## 5. CORS y permisos de red

Tres capas distintas, y conviene no confundirlas:

1. **La app (mismo origen) — no necesita CORS.** El navegador pide páginas y
   `/api/*` al mismo host. Por eso la imagen se construye con
   `PUBLIC_POCKETBASE_URL` apuntando a PocketBase pero **sin** `credentials`
   cruzadas: nada llama a `/api/*` desde otro dominio.
2. **PocketBase (cross-origin) — ya permite todo.** Verificado en la instancia:
   `Access-Control-Allow-Origin: *`, `Allow-Methods: GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS`
   y `Vary: Origin`. Si algún día autoalojas PocketBase, el camino recomendado en
   este repo es publicarlo bajo `/pb` con nginx: así desaparece el CORS.
3. **Azure App Service CORS — solo si algo externo llama a tu API.** Por ejemplo
   una app móvil o un front en otro dominio:
   ```bash
   az webapp cors add -n $APP -g $RG --allowed-origins "https://mi-app-movil.example"
   az webapp cors show -n $APP -g $RG          # ver lo permitido
   az webapp cors remove -n $APP -g $RG --allowed-origins "*"   # nunca uses *
   ```
   Con `*` el navegador no envía cookies, así que **no sirve** para la sesión
   (nuestra API usa cookies HttpOnly). Si necesitas cookies cruzadas, hay que
   pasar a un origen explícito y añadir el dominio a `PUBLIC_ALLOWED_ORIGINS`
   para que el CSRF de la app también lo acepte.

> Nota de red: PocketHost limita por IP. Las llamadas del **servidor** salen todas
> por la IP de egreso de Azure (cuota compartida entre usuarios); las del
> **navegador** salen con la IP de cada visitante (cuota individual).

## 6. Comprobación del despliegue

```bash
APP=artesanica-web-flashey
curl -s -o /dev/null -w '/healthz   -> %{http_code}\n' "https://$APP.azurewebsites.net/healthz"
curl -s -o /dev/null -w '/login     -> %{http_code}\n' "https://$APP.azurewebsites.net/login"
curl -s -o /dev/null -w '/productos -> %{http_code}\n' "https://$APP.azurewebsites.net/productos"
curl -sI "https://$APP.azurewebsites.net/login" | grep -iE 'content-security-policy|strict-transport'   # cabeceras del borde
az webapp log tail -n $APP -g $RG            # logs en vivo
```

Si `/login` responde 503 → faltan o no coinciden `POCKETBASE_ADMIN_*`.
Si un POST responde 403 → `PUBLIC_SITE_ORIGIN` no coincide con el origen real.

## 7. Actualizar la app

```bash
az acr build -r ${APP}acr -g $RG -t artesanica-web:v2 \
  --build-arg PUBLIC_POCKETBASE_URL="$PB_URL" .
az webapp config container set -n $APP -g $RG \
  --docker-custom-image-name ${APP}acr.azurecr.io/artesanica-web:v2 \
  --docker-registry-server-url https://${APP}acr.azurecr.io
az webapp restart -n $APP -g $RG
```

## 8. Costes y limpieza

- App Service **B1 Linux** ≈ 13–15 USD/mes; ACR **Basic** ≈ 5 USD/mes. PocketHost,
  según su plan. Un plan **B1** permite varias Web Apps.
- Para parar el gasto sin perder la configuración: `az webapp stop -n $APP -g $RG`
  (el plan sigue facturando) o `az group delete -n $RG` (borra todo).

## 9. Cosas que hay que saber

1. **`PUBLIC_POCKETBASE_URL` es de compilación** (bundle del navegador): si cambias
   de instancia de PocketBase, hay que reconstruir la imagen con el nuevo
   `--build-arg`.
2. **`SECURITY_HEADERS=app`**: en Azure la app es el borde, así que envía ella
   misma la CSP y `X-Frame-Options` desde el middleware
   (`src/lib/security-headers.ts`). Es una variable de ejecución: cambiarla solo
   requiere reiniciar la Web App. Con nginx delante se deja sin definir (las pone
   el proxy) y en Vercel las pone `astro.config.mjs`.
3. **El puerto lo manda `WEBSITES_PORT`**: la imagen escucha en 4321; sin esa
   variable Azure no encuentra nada y el contenedor se reinicia en bucle.
4. **HTTPS lo termina Azure**; las cookies ya se emiten `Secure` en producción
   (`import.meta.env.PROD`) y SameSite=Lax. No desactives `--https-only true`.
5. **Cold start**: con B1 y `--always-on true` el contenedor se mantiene caliente;
   sin él, la primera petición tras un rato de inactividad tarda unos segundos.
6. **La app no comprime** por sí misma: en el camino con nginx lo hace el proxy.
   En Azure, activa compresión en el borde (Front Door/CDN) o sirve los estáticos
   precomprimidos. Ver la revisión de "compilación final" en `docs/RENDIMIENTO.md`.
7. **`/healthz`** existe en la app (`src/pages/healthz.ts`): es la ruta del
   `healthCheckPath` y del `HEALTHCHECK` de la imagen. Es barata: no consulta
   PocketBase.
