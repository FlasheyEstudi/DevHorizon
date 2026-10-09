# ArtesaNica — Marketplace de Artesanías Nicaragüenses

Frontend SSR de **ArtesaNica** construido con **Astro 7**, arquitectura de islas reactivas en **React 19**, diseño moderno con **Tailwind CSS v4** y **PocketBase** como backend relacional y servicio de autenticación con conmutación automática local / nube.

---

## 🚀 Stack Tecnológico

- **[Astro 7](https://astro.build)** — Framework SSR híbrido con islas cliente (`output: 'static'` con endpoints dinámicos `prerender = false`).
- **[React 19](https://react.dev)** — Islas interactivas (`@astrojs/react`) para el mapa interactivo, perfil del artesano, checkout y valoraciones.
- **[Tailwind CSS v4](https://tailwindcss.com)** — Motor CSS-first con `@theme` semántico y tokens oficiales inspirados en Nicaragua (Terracota `#B85536`, Azul Añil `#285375`, Ocre Ámbar `#E2A349`). Consulta [DESIGN.md](DESIGN.md).
- **[PocketBase](https://pocketbase.io) (SDK v0.27)** — Base de datos relacional, Auth (Usuarios / Superusuarios), Storage y conmutación automática de host (servidor local ↔ PocketHost cloud).
- **[Leaflet](https://leafletjs.com) & React Leaflet** — Mapa interactivo geolocalizado con clustering (`react-leaflet-cluster`, Haversine formula) para ubicar talleres de artesanos en Nicaragua.
- **[@astrojs/vercel](https://docs.astro.build/en/guides/integrations-guide/vercel/)** — Adaptador para despliegue serverless en Vercel.
- **[Nanostores](https://github.com/nanostores/nanostores)** — Estado global cliente ultraligero y sincronizado (carrito persistente, sesión de usuario, notificaciones toast).
- **[Zod](https://zod.dev)** — Validación estricta de esquemas de datos y payloads en endpoints API.
- **[Astro i18n](https://docs.astro.build/en/guides/internationalization/)** — Enrutamiento bilingüe completo nativo (Español `/` e Inglés `/en/`).
- **[Radix UI](https://www.radix-ui.com/) & [Lucide Icons](https://lucide.dev)** — Primitivas de accesibilidad (Avatares, Dropdown Menus, Scroll Areas) y sistema de iconografía SVG vía `astro-icon`.

---

## 📋 Requisitos Previos

- **Node.js**: `>= 22.12.0`
- **Gestor de paquetes**: `npm` o `pnpm`
- **PocketBase**: Corriendo localmente en `http://127.0.0.1:8090` (opcional; si no se detecta local, el cliente conmuta automáticamente al entorno en la nube `https://vapor-invented.pockethost.io`).

---

## 🛠️ Instalación y Setup Local

```bash
# 1. Clonar el repositorio y acceder a la raíz
git clone https://github.com/moises717/Artesa_Nica.git
cd Artesa_Nica

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env

# 4. Iniciar servidor de desarrollo
npm run dev
# → Servidor disponible en http://localhost:4321

# Para ejecutar en segundo plano con Astro CLI:
# npx astro dev --background

# 5. Build para producción (.vercel/output/)
npm run build
```

---

## 📐 Documentación Técnica & Entregables (Hackathon 2026)

- 📊 **Diagrama Entidad-Relación (3FN)**: [docs/DIAGRAMA_ER.md](docs/DIAGRAMA_ER.md) | [Descargar PDF](docs/DIAGRAMA_ER.pdf)
- 🏛️ **Arquitectura del Sistema y Flujos de Secuencia**: [docs/DIAGRAMA_ARQUITECTURA.md](docs/DIAGRAMA_ARQUITECTURA.md) | [Descargar PDF](docs/DIAGRAMA_ARQUITECTURA.pdf)
- 💰 **Plan Financiero y Presupuesto de Infraestructura**: [docs/PRESUPUESTO_HACKATHON.md](docs/PRESUPUESTO_HACKATHON.md)
- 🎨 **Sistema de Tokenización y Guía de Estilos**: [DESIGN.md](DESIGN.md)
- 📄 **Documento de Entregables (Word)**: [docs/ENTREGABLES_HACKATHON.docx](docs/ENTREGABLES_HACKATHON.docx)
- 🐳 **Infraestructura de producción (proxy inverso + contenedores)**: [docs/INFRA_PRODUCCION.md](docs/INFRA_PRODUCCION.md)

---

## 📁 Estructura del Proyecto

```
Artesa_Nica/
├── src/
│   ├── components/            # Componentes Astro y React
│   │   ├── auth/              # Formularios y paneles de autenticación
│   │   ├── header/            # Navegación, barra de búsqueda y selector de idioma
│   │   ├── maps/              # Componentes Leaflet (MapCanvas, MapExperience, MapBottomSheet, MapFAB)
│   │   ├── pages/             # Contenedores de vista SSR (HomeContent, MapaContent)
│   │   ├── profile/           # Panel interactivo del artesano (Dashboard, Tienda, Productos, Pedidos)
│   │   ├── reviews/           # Sistema de reseñas y valoraciones de productos
│   │   ├── ui/                # Componentes base reutilizables (Avatar, Dropdown, Skeleton, Toast)
│   │   ├── Header.astro       # Cabecera global responsiva
│   │   └── Footer.astro       # Pie de página institucional
│   ├── layouts/               # Layouts globales (BaseLayout con fuentes y CSP)
│   ├── pages/                 # File-based routing (Astro SSR)
│   │   ├── index.astro        # Página principal (SSR)
│   │   ├── login.astro        # Inicio de sesión
│   │   ├── registro.astro     # Registro de usuarios
│   │   ├── perfil.astro       # Panel del perfil / artesano
│   │   ├── carrito.astro      # Carrito de compras con sincronización
│   │   ├── mapa.astro         # Mapa interactivo de artesanos en Nicaragua
│   │   ├── onboarding.astro   # Flujo inicial de bienvenida y configuración de perfil
│   │   ├── recuperar.astro    # Solicitud de recuperación de contraseña
│   │   ├── restablecer.astro  # Cambio y restablecimiento de contraseña
│   │   ├── noticias/          # Portal de noticias y artículos culturales ([slug].astro)
│   │   ├── productos/         # Catálogo general y ficha de detalle del producto
│   │   ├── tiendas/           # Directorio y perfil público de tiendas de artesanos
│   │   ├── en/                # Rutas bilingües en inglés (/en/map, /en/products, etc.)
│   │   └── api/               # Endpoints server-side (REST API)
│   │       ├── auth/          # login, register, logout, me, forgot-password, reset-password
│   │       │   └── 2fa/       # Enrolamiento TOTP: setup, enable, verify, disable, status
│   │       ├── products/      # CRUD de productos y filtros por artesano
│   │       ├── stores/        # Directorio, CRUD de tiendas, /mine y /geo
│   │       ├── cart/          # Gestión del carrito de compras sincronizado
│   │       ├── orders/        # Procesamiento y consulta de órdenes de compra
│   │       ├── reviews/       # Creación y listado de opiniones con rating
│   │       ├── dashboard/     # Métricas y estadísticas de ventas para artesanos
│   │       └── users/         # Gestión de perfil de usuario y avatar
│   ├── lib/                   # Utilidades y configuración central
│   │   ├── auth/              # Núcleo de seguridad: totp.ts (RFC 6238), twofactor.ts,
│   │   │                      #   cookie.ts, csrf.ts, guards.ts, refresh.ts, logger.ts
│   │   ├── pb-url.ts          # Resolución de URL y conmutación de PocketBase (Local ↔ Cloud)
│   │   ├── pocketbase.ts      # Cliente SDK de PocketBase (per-request & admin)
│   │   ├── geo.ts             # Coordenadas y metadatos departamentales de Nicaragua
│   │   ├── haversine.ts       # Cálculo de distancias geográficas
│   │   ├── csrf-client.ts     # Cabeceras de protección CSRF para el cliente
│   │   ├── hooks/             # Custom hooks de React (useGeolocation, useSortedStores)
│   │   ├── stores/            # Nanostores reactivos (cart, auth, toast)
│   │   └── types/             # Tipado TypeScript de colecciones y modelos
│   ├── styles/
│   │   └── global.css         # Estilos globales y tokens semánticos de Tailwind CSS v4
│   └── i18n/
│       ├── ui.ts              # Diccionario bilingüe de strings de interfaz (ES / EN)
│       └── utils.ts           # Helpers de traducción y extracción de idioma
├── docs/                      # Documentación técnica, ER 3FN y presupuesto
├── infra/                     # Despliegue autoalojado (nginx + Docker)
│   ├── nginx/                 # nginx.conf, vhost :80, plantilla TLS, snippets
│   ├── docker/                # Dockerfile de PocketBase y entrypoint
│   ├── install-host.sh        # nginx + Docker + configuración (requiere sudo)
│   ├── up.sh                  # levanta el stack de contenedores
│   └── verify.sh              # verificación del despliegue (6 bloques)
├── docker-compose.yml         # web (Astro SSR) + PocketBase en red interna
├── Dockerfile                 # Imagen del frontend (adaptador @astrojs/node)
├── astro.config.docker.mjs    # Config del build autoalojado (Vercel intacto)
├── public/                    # Activos estáticos, logos e iconografía
├── astro.config.mjs           # Configuración de Astro, Tailwind v4, i18n y CSP
├── components.json            # Configuración de componentes de UI
└── tsconfig.json              # Configuración TypeScript estricta y path aliases
```

---

## 🔐 Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto tomando como referencia `.env.example`:

| Variable | Server-side | Cliente | Descripción |
| :--- | :---: | :---: | :--- |
| `POCKETBASE_URL` | Sí | No | URL interna del servidor PocketBase (ej. `http://127.0.0.1:8090`). Si falla, conmuta a PocketHost. |
| `PUBLIC_POCKETBASE_URL` | Sí | Sí | URL pública de PocketBase accesible desde el navegador. |
| `POCKETBASE_ADMIN_EMAIL` | Sí | No | Email de superusuario para operaciones administrativas server-side (seed, scripts). Requerido también para el 2FA. |
| `POCKETBASE_ADMIN_PASSWORD` | Sí | No | Contraseña del superusuario (nunca expuesta al cliente). Requerido también para el 2FA. |

> **Nota 2FA:** el estado de la verificación en dos pasos vive en campos `hidden` de la colección `users`, por lo que solo el cliente de superusuario puede leerlo. Si `POCKETBASE_ADMIN_EMAIL`/`POCKETBASE_ADMIN_PASSWORD` no están configurados, `/api/auth/login` responde `503 auth_backend_unavailable` (fallo cerrado) en lugar de emitir una sesión sin poder comprobar el segundo factor.

---

## 🔐 Seguridad y Buenas Prácticas

| Control | Implementación |
| :--- | :--- |
| **Autenticación en dos pasos (2FA)** | TOTP RFC 6238 (HMAC-SHA1, 30 s, 6 dígitos, ventana ±1) implementado sobre Web Crypto en `src/lib/auth/totp.ts`, sin dependencias externas. Enrolamiento con clave Base32 y URI `otpauth://`, 10 códigos de recuperación de un solo uso (solo hashes SHA-256 en BD) y bloqueo anti-replay por contador temporal. |
| **Roles y permisos** | Campo `role` (`user` / `seller` / `admin`) + guards SSR (`requireUser`, `requireRole`) y reglas de colección de PocketBase. |
| **Validación de datos** | Esquemas Zod en los 13 endpoints mutantes (body/campos) antes de tocar PocketBase. |
| **Control de sesión** | Cookie `pb_auth` HttpOnly + Secure(prod) + SameSite=Lax; rotación de JWT en middleware cuando al token le quedan <5 min; verificación de que el record en memoria corresponda al JWT. |
| **CSRF** | Doble envío (`csrf-token` cookie + `x-csrf-token`) + allowlist de `Origin`/`Referer` con comparación en tiempo constante. |
| **Cabeceras HTTP** | CSP, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` y HSTS en producción (ver `astro.config.mjs`). |
| **Manejo de errores** | Respuestas JSON `{ error }` con códigos estables, sin filtrar si un email existe; logs estructurados (`logAuthEvent`) con allowlist de campos y cero PII. |
| **Rate limiting** | Reglas de PocketBase para `authWithPassword` / reset de contraseña + limitador de intentos por usuario en el paso 2 del 2FA (5 intentos / 5 min). |
| **Verificación de correo** | Flujo `verify-email` + banners localizados en el login. |

### Activar la verificación en dos pasos

1. Inicia sesión y entra a **Perfil → Seguridad**.
2. Pulsa **Activar verificación en dos pasos**: se muestra la clave Base32 y el enlace `otpauth://` para agregarla a Google Authenticator, Authy, 1Password o Microsoft Authenticator.
3. Confirma el código de 6 dígitos y guarda los **10 códigos de recuperación** (se muestran una sola vez).
4. A partir de ese momento el login pide el código en un segundo paso. Para desactivarla se exige la contraseña actual más un código vigente.

---

## 🌐 Endpoints de la API

Todos los endpoints API están protegidos contra ataques CSRF y validan sus entradas con esquemas de Zod:

| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Inicia sesión, setea cookie HTTP-only `pb_auth`. |
| `POST` | `/api/auth/register` | Registro de nuevo usuario y auto-login. |
| `POST` | `/api/auth/logout` | Cierre de sesión y limpieza de cookies de autenticación. |
| `GET` | `/api/auth/me` | Retorna los datos del usuario autenticado actual. |
| `POST` | `/api/auth/forgot-password` | Envía correo con instrucciones para restablecer contraseña. |
| `POST` | `/api/auth/reset-password` | Valida token y establece una nueva contraseña. |
| `GET` | `/api/products` | Catálogo paginado con filtros (`?category=...&search=...&mine=true`). |
| `POST` | `/api/products` | Crea un nuevo producto (requiere rol de vendedor/artesano). |
| `GET` | `/api/products/[id]` | Retorna el detalle completo de un producto. |
| `PUT` | `/api/products/[id]` | Actualiza un producto existente (propiedad del artesano). |
| `DELETE`| `/api/products/[id]` | Elimina un producto. |
| `GET` | `/api/stores` | Directorio general de tiendas y talleres artesanales. |
| `POST` | `/api/stores` | Crea una nueva tienda y promueve al usuario a vendedor. |
| `GET` | `/api/stores/mine` | Obtiene los datos de la tienda del usuario autenticado. |
| `GET` | `/api/stores/geo` | Retorna tiendas con coordenadas válidas para renderizado en Leaflet. |
| `GET/PUT`| `/api/stores/[id]` | Consulta o actualiza los datos del taller/tienda. |
| `GET` | `/api/cart` | Obtiene los ítems del carrito del usuario activo. |
| `POST` | `/api/cart` | Agrega o incrementa un producto en el carrito (cola con debounce). |
| `DELETE`| `/api/cart/[productId]` | Elimina un producto del carrito. |
| `GET` | `/api/orders` | Historial de pedidos realizados por el usuario. |
| `POST` | `/api/orders` | Genera una orden de compra y vacía el carrito actual. |
| `GET` | `/api/reviews` | Obtiene reseñas y calificaciones de un producto (`?productId=...`). |
| `POST` | `/api/reviews` | Publica una reseña con valoración (1 a 5 estrellas). |
| `GET` | `/api/dashboard/stats` | Estadísticas del taller del artesano (ventas, pedidos, inventario). |
| `GET/PUT`| `/api/users/me` | Consulta o actualiza datos personales y avatar del usuario. |
| `POST` | `/api/auth/2fa/setup` | Inicia el enrolamiento TOTP: genera el secreto y el URI `otpauth://`. |
| `POST` | `/api/auth/2fa/enable` | Confirma un código de 6 dígitos y activa el 2FA (devuelve 10 códigos de recuperación, una sola vez). |
| `POST` | `/api/auth/2fa/verify` | Paso 2 del login: canjea la cookie de desafío `pb_2fa` por la sesión validando un código TOTP o de recuperación. |
| `POST` | `/api/auth/2fa/disable` | Desactiva el 2FA exigiendo contraseña actual + código vigente. |
| `GET` | `/api/auth/2fa/status` | Estado del 2FA del usuario (`enabled`, `pendingSetup`, códigos de recuperación restantes). |

---

## 🚢 Despliegue en Vercel (escenario A — gestionado)

1. Conecta el repositorio directamente en el dashboard de **Vercel**.
2. **Root Directory**: Deja la raíz del repositorio (`./`).
3. Configura las variables de entorno en el panel de Vercel (`POCKETBASE_URL`, `PUBLIC_POCKETBASE_URL`, `POCKETBASE_ADMIN_EMAIL`, `POCKETBASE_ADMIN_PASSWORD`).
4. **Build settings automáticos**:
   - **Framework Preset**: Astro
   - **Build Command**: `npm run build`
   - **Output Directory**: `.vercel/output`
   - **Node Version**: `22.x`

---

## 🐳 Despliegue autoalojado (escenario B — proxy inverso + contenedores)

Alternativa completa para ejecutar ArtesaNica en un servidor propio (Arch/CachyOS)
con **nginx** como proxy inverso y **Docker** para el aislamiento. No afecta al
despliegue en Vercel: usa `astro.config.docker.mjs` (adaptador `@astrojs/node`)
en lugar de `astro.config.mjs`.

```bash
sudo bash infra/install-host.sh     # nginx + Docker + configuración + firewall
cp .env.docker.example .env.docker  # credenciales del superusuario
bash infra/up.sh                    # construye y levanta los contenedores
bash infra/verify.sh                # 6 bloques de comprobación
```

| Puerto | Servicio | Expuesto a | Función |
| :--- | :--- | :--- | :--- |
| **80 / 443** | nginx (borde) | Internet/LAN | Única entrada pública (CSP, rate limit, gzip, caché de estáticos). |
| 4322 | contenedor `web` (Astro SSR) | sólo `127.0.0.1` | Renderizado SSR y `/api/*` (4321 dentro del contenedor). |
| 8091 | contenedor `pocketbase` | sólo `127.0.0.1` | Datos, auth y archivos (8090 dentro del contenedor; el navegador los consume vía `/pb/api/files/`). |

Los puertos del host son **4322** y **8091** (no 4321/8090) para poder convivir
con el entorno de desarrollo, que ya usa esos números.

Reglas clave: ningún contenedor publica puertos a la red (sólo loopback), el
navegador nunca habla directo con PocketBase (imágenes por `/pb/`, mismo origen)
y los secretos se leen en tiempo de ejecución, así que no quedan dentro de la
imagen.

📖 **Detalle completo** (mapa de puertos, variables, operación, TLS con certbot,
solución de problemas y checklist): [docs/INFRA_PRODUCCION.md](docs/INFRA_PRODUCCION.md).

---

## 📌 Estado del Proyecto & Roadmap

El progreso y ciclo de vida de las tareas se gestiona activamente mediante el tablero **Desarrollo** en Trello.

### ✅ Hitos Completados
- [x] Migración completa a arquitectura SSR híbrida con Astro 7.
- [x] Integración de React 19 para componentes interactivos clave.
- [x] Sistema de diseño con Tailwind CSS v4 y tokens oficiales nicaragüenses ([DESIGN.md](DESIGN.md)).
- [x] Mapa interactivo Leaflet con geolocalización, clustering y distancias Haversine.
- [x] Soporte bilingüe completo (i18n Español / Inglés) en rutas y componentes.
- [x] Portal de noticias culturales dinámico conectado a la colección `news` de PocketBase.
- [x] Modularización del monolito legacy de JavaScript en nanostores y componentes desacoplados.
- [x] Pedido directo a WhatsApp (Click-to-WhatsApp) adaptado al mercado nicaragüense con totales en Córdobas (C$).
- [x] Sincronización asíncrona de carrito con mitigación de race conditions y debouncing.
- [x] Sistema de notificaciones flotantes (Toasts) y estados de carga con esqueletos animados (Skeletons).
- [x] Resiliencia de base de datos con conmutación automática local ↔ PocketHost cloud.
- [x] Autenticación en dos pasos (TOTP RFC 6238) con códigos de recuperación, validación anti-replay y UI en el perfil.

### 📋 En Desarrollo / Backlog Próximo
- [ ] **Filtros Avanzados en Catálogo**: Filtro por departamento de origen (Masaya, León, Granada, etc.) y rangos de precio.
- [ ] **Página de Recibo y Confirmación**: Vista `/orden/[id]` con resumen descargable en PDF.
- [ ] **Sello de Autenticidad Artesanal**: Código digital de verificación de origen 100% hecho a mano.
- [ ] **La Ruta del Artesano**: Recorrido turístico interactivo geolocalizado por talleres tradicionales.
- [ ] **Historias Detrás del Barro / Telar**: Micro-historias multimedia del proceso artesanal en la ficha de tienda.
- [ ] **Recomendador de Recuerdos y Regalos**: Asistente guiado interactivo por presupuesto y ocasión.
- [ ] **Generador de Catálogo y Código QR**: Exportación de fichas y QR imprimibles para ferias artesanales.
- [ ] **Pruebas Automatizadas**: Cobertura de tests E2E con Playwright.
- [ ] **Optimización SEO**: Generación automática de `sitemap.xml`, directivas `robots.txt` y metaetiquetas Open Graph enriquecidas.
