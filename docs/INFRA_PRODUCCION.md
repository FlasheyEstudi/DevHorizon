# Infraestructura de producción — Proxy inverso y contenedores

Documentación operativa del despliegue **autoalojado** de ArtesaNica: qué corre
dónde, qué puertos se usan, qué variables hacen falta y qué debes saber antes de
ponerlo en marcha.

Este escenario cumple dos requisitos de infraestructura:

| Requisito | Cómo se cumple |
| :--- | :--- |
| **Proxy inverso** | **nginx** recibe todo el tráfico web en `:80` (y `:443` con TLS). Nunca se expone el código ni la base de datos directamente a internet: Astro y PocketBase escuchan **sólo en loopback**. |
| **Contenedores** | **Docker Compose** ejecuta el frontend (Astro SSR) y la base de datos (PocketBase) como contenedores aislados en una red interna propia, con volúmenes persistentes, healthchecks y usuarios sin privilegios. |

> El despliegue en Vercel sigue funcionando igual: `astro.config.mjs` y
> `@astrojs/vercel` no se tocaron. El contenedor usa `astro.config.docker.mjs`
> con `@astrojs/node`, de modo que cada entorno conserva su adaptador.

---

## 1. Arquitectura

```
                 INTERNET / LAN
                        │
                        ▼
        ┌───────────────────────────────────┐
        │   nginx  (HOST, systemd)          │   0.0.0.0:80      ← única entrada pública
        │   · CSP y cabeceras de seguridad  │   0.0.0.0:443     ← cuando actives TLS
        │   · límites de tasa en el borde    │
        │   · gzip + caché de estáticos      │
        └───────┬───────────────────┬───────┘
                │                   │
      /, /api/* │                   │ /pb/api/files/*
                ▼                   ▼
   ┌────────────────────┐  ┌────────────────────────┐
   │ web (contenedor)   │  │ pocketbase (contenedor)│
   │ Astro SSR + Node   │─▶│ SQLite + auth + files  │
   │ 127.0.0.1:4322     │  │ 127.0.0.1:8091         │
   └────────────────────┘  └────────────────────────┘
        └────────── red interna de Docker (bridge) ──────────┘
```

Puntos clave:

- Los contenedores se comunican entre sí por **nombre de servicio** (`web` →
  `http://pocketbase:8090`) dentro de la red `interna`.
- Al host sólo se publican puertos **en loopback** (`127.0.0.1`), así que desde
  la red local o internet no se llega a ellos: hay que pasar por nginx.
- El navegador **nunca** habla con PocketBase: las imágenes se sirven en el
  mismo origen mediante `/pb/api/files/...` (proxy de nginx).

---

## 2. Mapa de puertos

| Puerto | Servicio | Escucha en | Quién lo alcanza | Para qué |
| :--- | :--- | :--- | :--- | :--- |
| **80** | nginx (borde) | `0.0.0.0` + `[::]` | Internet / LAN | Todo el tráfico web: páginas, API de la app y archivos. |
| **443** | nginx + TLS | `0.0.0.0` + `[::]` | Internet / LAN | Igual que el anterior, cifrado (tras activar Let's Encrypt). |
| **4322** | contenedor `web` (Astro SSR) | `127.0.0.1` | Sólo nginx (en el host) | Servidor Node que renderiza las páginas y atiende `/api/*` (4321 dentro del contenedor). |
| **8091** | contenedor `pocketbase` | `127.0.0.1` | Sólo nginx (en el host) | API de datos, autenticación y archivos (8090 dentro del contenedor). |
| 4321 / 8090 (interno) | `web` ↔ `pocketbase` | red Docker `interna` | Sólo entre contenedores | Puertos dentro de los contenedores: el servidor Astro consulta PocketBase por nombre de servicio. |
| 22 | SSH | `0.0.0.0` | Administración | Túnel para el panel de PocketBase (ver §9). |
| 4321 / 8090 (dev) | `astro dev` / PocketBase de desarrollo | `127.0.0.1` y `[::1]` | Sólo tu equipo | Desarrollo local (`iniciar.sh`): **no** forman parte de este despliegue. Son los mismos números que los puertos internos de los contenedores; por eso el host publica 4322/8091. |

Comprobación rápida de que nada se escapó a la red:

```bash
ss -ltn | grep -E ':(80|443|4322|8091)\b'
# 0.0.0.0:80 / [::]:80  -> correcto (nginx)
# 127.0.0.1:4322        -> correcto (web del stack, sólo loopback)
# 127.0.0.1:8091        -> correcto (pocketbase del stack, sólo loopback)
# 127.0.0.1:8090 o [::1]:4321 -> servidores de DESARROLLO (no son del stack)
# 0.0.0.0:4322 o *:8091 -> MAL: algo está expuesto
```

> **Por qué 4322 / 8091 y no 4321 / 8090.** El entorno de desarrollo del proyecto
> ya usa 4321 (`astro dev`, ver `iniciar.sh`) y 8090 (PocketBase local). Si el
> stack publicara esos mismos puertos en el host, `docker compose up` fallaría con
> *port is already allocated* y el navegador podría acabar hablando con el
> servidor de desarrollo. Dentro de los contenedores los puertos siguen siendo
> 4321 (web) y 8090 (pocketbase).

---

## 3. Qué corre dónde

| Componente | Dónde | Imagen / servicio | Persistencia |
| :--- | :--- | :--- | :--- |
| Proxy inverso | **Host** (systemd `nginx.service`) | paquete `nginx` 1.30 | configuración en `/etc/nginx` |
| Frontend ArtesaNica | Contenedor `artesanica-web` | `artesanica-web:latest` (multi-stage, usuario `node`) | ninguna (es stateless) |
| Base de datos | Contenedor `artesanica-pb` | `artesanica-pocketbase:0.27.2` (release oficial, usuario `pocketbase`) | volumen Docker **`artesanica_pb_data`** |
| Esquema y hooks | Montados en sólo lectura | `pb/pb_migrations`, `pb/pb_hooks` | versionados en Git |

---

## 4. Requisitos previos

| Requisito | Detalle |
| :--- | :--- |
| Sistema | CachyOS / Arch Linux con `systemd` (los scripts usan `pacman`). |
| Privilegios | `sudo` **una vez** para `infra/install-host.sh` (paquetes, servicios, firewall). |
| Versiones | nginx 1.30, Docker 29, docker compose 5, Node 22 (dentro de la imagen), PocketBase 0.27.2. |
| Puertos libres | 80 y 443. |
| Internet | Para instalar paquetes, descargar el binario de PocketBase y construir la imagen (ver §10). |
| Dominio (opcional) | Sólo necesario para HTTPS con Let's Encrypt. |

---

## 5. Puesta en marcha (3 comandos)

```bash
# 1) Host: instala nginx + Docker, copia la config del proxy y arranca servicios
sudo bash infra/install-host.sh

# 2) Credenciales del stack (superusuario de PocketBase y origen público)
cp .env.docker.example .env.docker
$EDITOR .env.docker

# 3) Construye y levanta los contenedores + comprueba el resultado
bash infra/up.sh
bash infra/verify.sh
```

`install-host.sh` hace exactamente 6 cosas: instala paquetes, activa el daemon
de Docker, copia la configuración a `/etc/nginx`, valida con `nginx -t`, añade tu
usuario al grupo `docker` y abre 80/443 en el firewall antes de arrancar nginx.

> nginx devuelve **502** hasta que los contenedores estén arriba: es lo esperado.

---

## 6. Variables de entorno

Se definen en **`.env.docker`** (ignorado por Git) y las consume
`docker-compose.yml`.

| Variable | Valor por defecto | Secreto | Para qué |
| :--- | :--- | :---: | :--- |
| `POCKETBASE_ADMIN_EMAIL` | — (obligatoria) | Sí | Superusuario de PocketBase: seed, métricas y el **estado 2FA** (verificación en dos pasos). |
| `POCKETBASE_ADMIN_PASSWORD` | — (obligatoria) | Sí | Contraseña del superusuario. |
| `PUBLIC_SITE_ORIGIN` | `http://localhost` | No | Origen permitido por la validación CSRF. |
| `PUBLIC_ALLOWED_ORIGINS` | vacío | No | Orígenes extra separados por coma (si accedes por IP y dominio a la vez). |
| `POCKETBASE_URL` | `http://pocketbase:8090` | No | URL **interna** que usa el servidor Astro (nombre del servicio en la red Docker). |
| `PUBLIC_POCKETBASE_URL` | `/pb` | No | URL **pública** (navegador) de archivos e imágenes: mismo origen, proxeada por nginx. |
| `HOST` / `PORT` | `0.0.0.0` / `4321` | No | Servidor Node del adaptador `@astrojs/node`. |

Cómo se leen: **en tiempo de ejecución** (`src/lib/env.ts` prioriza
`process.env` y cae a `import.meta.env`), así que puedes cambiar credenciales o
URLs sin reconstruir la imagen y **los secretos no quedan dentro de ella**.
La única excepción es `PUBLIC_POCKETBASE_URL`, que Vite incrusta en el bundle
del navegador durante el build (por eso entra como `build-arg` en el Dockerfile).

---

## 7. Operación diaria

```bash
# Estado y logs
bash infra/up.sh ps
bash infra/up.sh logs -f web
bash infra/up.sh logs -f pocketbase

# Reiniciar / parar / actualizar
bash infra/up.sh restart web
bash infra/up.sh down
bash infra/up.sh up -d --build          # reconstruye tras cambios de código

# nginx
sudo nginx -t && sudo systemctl reload nginx
sudo journalctl -u nginx -f             # logs del servicio
sudo tail -f /var/log/nginx/artesanica.access.log   # (o access.log)

# Copia de seguridad de los datos (SQLite + archivos)
docker run --rm -v artesanica_pb_data:/data -v "$PWD":/backup alpine \
    tar czf "/backup/pb_data_$(date +%F_%H%M).tar.gz" -C /data .

# Restauración
docker run --rm -v artesanica_pb_data:/data -v "$PWD":/backup alpine \
    sh -c 'rm -rf /data/* && tar xzf /backup/<archivo>.tar.gz -C /data'
bash infra/up.sh restart pocketbase
```

---

## 8. HTTPS con Let's Encrypt

```bash
sudo pacman -S certbot certbot-nginx

# Opción A (recomendada): certbot reescribe el vhost y añade el redirect
sudo certbot --nginx -d artesanica.com.ni -d www.artesanica.com.ni

# Opción B: sólo emite el certificado; el vhost lo pones tú
sudo certbot certonly --webroot -w /var/lib/letsencrypt -d artesanica.com.ni
sudo cp infra/nginx/conf.d/artesanica-tls.conf.example /etc/nginx/conf.d/artesanica-tls.conf
sudo $EDITOR /etc/nginx/conf.d/artesanica-tls.conf   # server_name + rutas del cert
sudo nginx -t && sudo systemctl reload nginx

# Renovación (timer de systemd que instala certbot)
sudo certbot renew --dry-run
```

Antes de emitir el certificado: el dominio debe resolver a la IP pública de esta
máquina y los puertos 80/443 deben estar abiertos en el router. La plantilla ya
incluye HSTS, TLS 1.2/1.3 y la configuración intermedia de Mozilla.

---

## 9. Panel de administración de PocketBase

Por seguridad, `/_/` y todo `/pb/*` salvo `/pb/api/files/` están **bloqueados**
desde el exterior. Para administrar la base de datos, entra por túnel SSH:

```bash
# 8090 es el puerto LOCAL del túnel; al otro lado hay que apuntar al 8091 del
# host, que es donde el contenedor publica PocketBase (ver §2).
ssh -L 8090:127.0.0.1:8091 usuario@servidor
# y abre en tu navegador:  http://127.0.0.1:8090/_/
```

Si necesitas publicar temporalmente la API cruda de PocketBase (no recomendado),
añade un `location /pb/api/` en `infra/nginx/conf.d/artesanica.conf` y recarga
nginx — pero recuerda que expone reglas y datos sin pasar por la aplicación.

---

## 10. Cosas que debes saber

1. **El build de la web necesita salida a internet.** La API de fuentes de Astro
   descarga **Poppins** al construir. Si tu red lo bloquea, el build falla con
   `cannot fetch font file`; en ese caso copia la caché
   `node_modules/.astro/fonts` (o `.astro/fonts`) al contexto del build.
2. **En el autoalojado todas las rutas se renderizan en el servidor**
   (`mode: server`): no hay HTML prerenderizado, porque las páginas leen
   PocketBase. Es el comportamiento correcto para un marketplace con datos
   vivos; nginx se encarga de la caché de estáticos (`/_astro/`, 1 año).
3. **`PUBLIC_POCKETBASE_URL=/pb`** es obligatorio para que las imágenes carguen:
   el servidor usa la URL interna (`http://pocketbase:8090`, no resoluble desde
   el navegador) y el navegador usa `/pb` (mismo origen). Si lo cambias a una URL
   absoluta, tendrás que añadir ese origen a la CSP de nginx.
4. **Los límites de tasa de PocketBase cuentan por IP vista por PocketBase.** Como
   todas las peticiones llegan desde el contenedor `web`, sus reglas
   (`auth-with-password`: 5/min) se comparten entre usuarios. Mitigación
   recomendada (pendiente de implementar, no urgente): activar `trustedProxy` en
   los ajustes de PocketBase y reenviar la IP real desde
   `src/lib/pocketbase.ts`. Mientras tanto, el borde limita por IP con nginx.
5. **El superusuario de PocketBase es imprescindible**: sin
   `POCKETBASE_ADMIN_EMAIL`/`PASSWORD` el contenedor avisa y el **2FA** (más las
   métricas del dashboard) dejan de funcionar. El entrypoint las aplica en cada
   arranque de forma idempotente.
6. **Migraciones**: se aplican automáticamente al arrancar PocketBase y quedan
   registradas en su tabla `_migrations`. Para añadir una nueva, créala en
   `pb/pb_migrations/` y reinicia el contenedor; el rollback se hace con la
   función `down` de la propia migración.
7. **Docker sin sudo**: tras `install-host.sh`, cierra y abre sesión (grupo
   `docker`). Mientras tanto, `infra/up.sh` funciona igual usando `sg docker`.
8. **Vercel sigue siendo el otro escenario de despliegue.** Si publicas en
   Vercel no necesitas nada de esta carpeta: allí manda `astro.config.mjs`.
9. **El `node_modules` del host no entra en la imagen** (`.dockerignore`): la
   imagen se construye con sus propias dependencias, así que un `node_modules`
   "sucio" no puede romper el despliegue.
10. **PocketBase corre como usuario sin privilegios** (uid 1000) y el volumen de
    datos hereda esos permisos. Si restauras una copia de seguridad generada por
    otro usuario, revisa la propiedad (`chown -R 1000:1000`).

---

## 11. Solución de problemas

| Síntoma | Causa probable | Solución |
| :--- | :--- | :--- |
| **502 Bad Gateway** en todas las rutas | Los contenedores no están arriba | `bash infra/up.sh ps` y `bash infra/up.sh logs web` |
| **502** sólo en `/_astro/*` | El contenedor `web` arrancó pero el build falló | Revisa `bash infra/up.sh logs web` y reconstruye |
| **404** en `/pb/api/files/...` (imágenes rotas) | La CSP o `PUBLIC_POCKETBASE_URL` mal configurados | Confirma `PUBLIC_POCKETBASE_URL=/pb` y recarga nginx |
| **403 CSRF** al hacer login o comprar | Origen no permitido | Ajusta `PUBLIC_SITE_ORIGIN` (y `PUBLIC_ALLOWED_ORIGINS`) en `.env.docker` y `bash infra/up.sh up -d` |
| **429 Too Many Requests** al iniciar sesión | Límites de nginx o de la app | Espera al `Retry-After`; ajusta `limit_req` en `artesanica.conf` |
| **401/503 al iniciar sesión en cuentas con 2FA** | Superusuario sin definir en el contenedor | Revisa `POCKETBASE_ADMIN_*` y los logs de `artesanica-pb` |
| Contenedor `pocketbase` reiniciándose | Permisos del volumen o migración fallida | `bash infra/up.sh logs pocketbase`; verifica el `chown` del volumen |
| `docker: permission denied` | Tu usuario no está en el grupo `docker` | Cierra sesión y entra de nuevo, o usa `bash infra/up.sh` (usa `sg docker`) |
| `nginx -t` falla tras copiar los snippets | Falta `/etc/nginx/snippets` | `sudo mkdir -p /etc/nginx/snippets` y vuelve a copiar |
| El build falla con `cannot fetch font file` | Sin salida a internet para las fuentes | Ver §10.1 |

---

## 12. Checklist antes de dar por desplegado

```bash
bash infra/verify.sh      # 6 bloques de comprobación; debe terminar en verde
```

- [ ] `nginx -t` válido y `systemctl is-active nginx` → `active`
- [ ] Contenedores `artesanica-web` y `artesanica-pb` en `running` y `healthy`
- [ ] Puertos 4322 y 8091 escuchando **sólo** en `127.0.0.1`
- [ ] `http://<host>/` , `/tiendas` y `/login` responden 200
- [ ] `/api/stores` responde 200 y `/api/auth/2fa/status` responde 401 sin sesión
- [ ] `/pb/api/collections/...` y `/_/` responden 404 (superficie cerrada)
- [ ] Cabeceras `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` y `Permissions-Policy` presentes
- [ ] Registro, login, carrito y pedido probados a través del dominio
- [ ] **2FA probado de extremo a extremo**: activar, cerrar sesión, entrar con código y usar un código de recuperación
- [ ] Copia de seguridad del volumen `artesanica_pb_data` hecha y restauración ensayada
- [ ] `PUBLIC_SITE_ORIGIN` apunta al dominio real
- [ ] (Si aplica) Certificado TLS emitido y `certbot renew --dry-run` correcto

---

## 13. Archivos de esta infraestructura

| Archivo | Función |
| :--- | :--- |
| `docker-compose.yml` | Stack: `web` + `pocketbase`, red interna, puertos sólo en loopback, healthchecks y volumen. |
| `Dockerfile` | Imagen del frontend Astro SSR (multi-stage, usuario sin privilegios, build con `astro.config.docker.mjs`). |
| `astro.config.docker.mjs` | Config del adaptador `@astrojs/node` (standalone) que hereda todo lo demás del config base. |
| `infra/docker/pocketbase.Dockerfile` | Imagen de PocketBase desde la release oficial + usuario sin privilegios. |
| `infra/docker/pb-entrypoint.sh` | Crea el superusuario y arranca `serve` con migraciones y hooks. |
| `infra/nginx/nginx.conf` | Configuración global del borde (gzip, rate limits, logs, `user http`). |
| `infra/nginx/conf.d/artesanica.conf` | Vhost `:80` con el proxy inverso y los bloqueos (`/pb/`, `/_/`). |
| `infra/nginx/conf.d/artesanica-tls.conf.example` | Plantilla HTTPS con Let's Encrypt (inactiva hasta copiarla sin `.example`). |
| `infra/nginx/snippets/*.conf` | Cabeceras de seguridad y cabeceras comunes de proxy. |
| `infra/install-host.sh` | Instalación del host (nginx + Docker + configuración + firewall). |
| `infra/up.sh` / `infra/verify.sh` | Levantar el stack y verificar el despliegue (12 bloques de comprobación). |
| `.dockerignore` / `.env.docker.example` | Contexto de build limpio y plantilla de variables. |
