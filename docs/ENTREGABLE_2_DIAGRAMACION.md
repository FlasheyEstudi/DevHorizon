# Entregable 2 — Diagramación de Base de Datos y UML

**Proyecto:** ArtesaNica · marketplace de artesanía nicaragüense
**Hackathon Nicaragua 2026**
**Motor de datos:** PocketBase 0.27.2 (SQLite) · frontend Astro 7 con SSR
**Fecha de esta revisión:** 2026-10-08

---

## Ficha del entregable

| Punto del requisito | Dónde está |
| :--- | :--- |
| Modelo Entidad-Relación normalizado (3FN) | [§2](#2-modelo-entidad-relación-3fn) |
| Diagramas UML: **Casos de Uso** | [§3](#3-uml-1--diagrama-de-casos-de-uso) |
| Diagramas UML: **Actividades** | [§4](#4-uml-2--diagramas-de-actividades) |
| Diagramas UML: **Clases** | [§5](#5-uml-3--diagrama-de-clases) |
| Extra: **Secuencia** del login con 2FA | [§6](#6-extra--diagrama-de-secuencia-login-con-2fa) |
| Cómo visualizar los diagramas | [§7](#7-cómo-visualizar-estos-diagramas) |

**Criterio de verdad de este documento:** el modelo ER **no está dibujado a mano**.
Se generó leyendo el esquema **real en vivo** de la base (`_collections`, `_migrations`,
índices y reglas de acceso de PocketBase) el 2026-10-08. Los conteos de registros
que aparecen son los reales de ese momento.

---

## 1. Resumen del modelo

- **8 colecciones de negocio** (más las de sistema de PocketBase: `_superusers`,
  `_authOrigins`, `_externalAuths`, `_mfas`, `_otps`).
- **3 vistas SQL** de solo lectura para consultas agregadas del catálogo y del mapa.
- **9 relaciones** con integridad referencial declarada (3 de ellas con borrado en cascada).
- **17 índices**, de los cuales **8 son únicos**: 6 de identidad funcional (`email`, `slug` de cada entidad) y 2 compuestos de regla de negocio (un carrito y una reseña por usuario y producto).
- **Reglas de acceso por rol** en las 8 colecciones (nada queda abierto de más).

| Entidad | Propósito | Campos | Registros hoy |
| :--- | :--- | ---: | ---: |
| `users` | Cuentas con rol `user` / `seller` / `admin` + estado 2FA | 20 | 11 |
| `stores` | Talleres artesanos, con ubicación y horario | 15 | 6 |
| `products` | Piezas publicadas por cada taller | 15 | 8 |
| `categories` | Categorías jerárquicas del catálogo | 8 | 1 |
| `orders` | Pedidos con instantánea de las líneas | 10 | 16 |
| `cart_items` | Carrito persistente por usuario | 6 | 0 |
| `reviews` | Reseñas y valoración por producto | 8 | 1 |
| `news` | Noticias y contenido editorial | 9 | 0 |

---

## 2. Modelo Entidad-Relación (3FN)

### 2.1 Diagrama ER

```mermaid
erDiagram
    USERS ||--o{ STORES : "es dueño de"
    USERS ||--o{ ORDERS : "realiza"
    USERS ||--o{ CART_ITEMS : "agrega"
    USERS ||--o{ REVIEWS : "escribe"
    STORES ||--o{ PRODUCTS : "publica"
    PRODUCTS ||--o{ CART_ITEMS : "se agrega al carrito"
    PRODUCTS ||--o{ REVIEWS : "recibe"
    PRODUCTS }o--o{ CATEGORIES : "se clasifica en"
    CATEGORIES ||--o{ CATEGORIES : "depende de"

    USERS {
        string id PK
        string email UK "único, verificado"
        string password "hash, oculto"
        string tokenKey "rotación de sesión, oculto"
        string name
        string role "user | seller | admin"
        string phone
        string locale "es | en"
        bool   verified
        file   avatar
        bool   totp_enabled "2FA activo"
        string totp_secret "oculto"
        string totp_pending_secret "enrolamiento, oculto"
        json   totp_recovery_codes "hashes SHA-256, oculto"
        int    totp_last_counter "anti-replay, oculto"
        date   created_at
        date   updated_at
    }

    STORES {
        string id PK
        string name
        string slug UK
        string description
        string category "rubro del taller"
        string owner FK "-> users"
        file   logo
        string department "17 departamentos"
        string address_text
        geopt  location "punto geográfico"
        json   schedule "horario semanal"
        string schedule_text
        bool   is_demonstrative
        date   created_at
        date   updated_at
    }

    PRODUCTS {
        string id PK
        string name
        string slug UK
        string description
        float  price
        int    stock
        file   images "hasta 8"
        string store FK "-> stores"
        string categories FK "hasta 5, -> categories"
        json   tags
        float  rating_avg "cache de reseñas"
        int    rating_count "cache de reseñas"
        string status "draft | published | archived"
        date   created_at
        date   updated_at
    }

    CATEGORIES {
        string id PK
        string name
        string slug UK
        string description
        string icon
        string parent FK "-> categories"
        date   created_at
        date   updated_at
    }

    ORDERS {
        string id PK
        string user FK "-> users"
        json   items "instantánea de líneas"
        float  total
        string status "pending | paid | shipped | delivered | cancelled"
        json   shipping_address "instantánea"
        string payment_method "cash | transfer | card | other"
        string notes
        date   created_at
        date   updated_at
    }

    CART_ITEMS {
        string id PK
        string user FK "-> users"
        string product FK "-> products"
        int    quantity
        date   created_at
        date   updated_at
    }

    REVIEWS {
        string id PK
        string user FK "-> users"
        string product FK "-> products"
        int    rating "1 a 5"
        string comment
        string user_name_snapshot "nombre al momento de reseñar"
        date   created_at
        date   updated_at
    }

    NEWS {
        string id PK
        string title
        string slug UK
        string summary
        string content "editor enriquecido"
        file   image
        string status "draft | published"
        date   created_at
        date   updated_at
    }
```

### 2.2 Relaciones, cardinalidad e integridad

| # | Relación | Cardinalidad | FK | Borrado en cascada | Regla de negocio |
| :-- | :--- | :--- | :--- | :--: | :--- |
| 1 | `users` → `stores` | 1 : N | `stores.owner` | **Sí** | Un taller pertenece a un artesano; si se borra la cuenta, se borra el taller. |
| 2 | `users` → `orders` | 1 : N | `orders.user` | **No** | El histórico de pedidos se conserva aunque se borre la cuenta (integridad contable). Es la razón por la que el borrado se bloquea con *required relation*. |
| 3 | `users` → `cart_items` | 1 : N | `cart_items.user` | **Sí** | El carrito es datos de sesión persistida. |
| 4 | `users` → `reviews` | 1 : N | `reviews.user` | **Sí** | La reseña es autoría de quien la escribió. |
| 5 | `stores` → `products` | 1 : N | `products.store` | **Sí** | Una pieza existe dentro de un taller. |
| 6 | `products` → `cart_items` | 1 : N | `cart_items.product` | **Sí** | Si la pieza desaparece, sale del carrito. |
| 7 | `products` → `reviews` | 1 : N | `reviews.product` | **Sí** | Las reseñas no sobreviven a la pieza. |
| 8 | `products` ↔ `categories` | N : M | `products.categories` (hasta 5) | No | Una pieza puede estar en varias categorías (evita duplicar fichas). |
| 9 | `categories` → `categories` | 1 : N | `categories.parent` | No | Jerarquía autorreferente (tipo → subtipo). |

### 2.3 Índices y restricciones de unicidad

| Índice | Tipo | Para qué |
| :--- | :--- | :--- |
| `idx_email__pb_users_auth_` | Único | Identidad de la cuenta (`email`), solo si no está vacío. |
| `idx_tokenKey__pb_users_auth_` | Único | Rotación de token de sesión. |
| `idx_categories_slug` | Único | URL estable `/categoria/{slug}`. |
| `idx_products_slug` | Único | URL estable `/productos/{slug}`. |
| `idx_stores_slug` | Único | URL estable `/tiendas/{slug}`. |
| `idx_news_slug` | Único | URL estable `/noticias/{slug}`. |
| `idx_cart_user_product` | Único compuesto | **Regla de negocio:** un solo renglón por (usuario, producto); la cantidad vive en `quantity`. |
| `idx_reviews_user_product` | Único compuesto | **Regla de negocio:** una reseña por usuario y producto. |
| `idx_products_status_price` | Compuesto | Ordenar/filtrar el catálogo publicado por precio sin escanear toda la tabla. |
| `idx_products_status`, `idx_products_store` | Simple | Filtro por estado y por taller. |
| `idx_orders_status`, `idx_orders_user` | Simple | Panel de pedidos por estado y por cliente. |
| `idx_reviews_product` | Simple | Cálculo de la valoración media de una pieza. |
| `idx_stores_department`, `idx_stores_is_demonstrative` | Simple | Mapa por departamento y separación de datos de demostración. |
| `idx_news_status` | Simple | Solo las noticias publicadas. |

> Total contabilizado en el esquema en vivo: **17 índices** (8 únicos) en las 8 colecciones de negocio. La tabla agrupa varios índices por finalidad.

### 2.4 Normalización 1FN · 2FN · 3FN

**1FN — atributos atómicos.** Ninguna tabla guarda listas separadas por comas en
campos escalares: lo que es multivaluado se modela aparte (`cart_items`, `reviews`)
o con el tipo `file`/`json` del motor, que almacena la colección de forma
estructurada (`products.images`, `products.tags`, `stores.schedule`). No hay campos
repetidos tipo `imagen1`, `imagen2`.

**2FN — dependencia funcional completa de la clave.** Todas las tablas usan clave
primaria simple (`id` de 15 caracteres que genera PocketBase), así que no existe un
atributo que dependa solo de parte de una clave compuesta. Las dos claves
compuestas que sí existen son **restricciones de unicidad**, no claves primarias:

- `cart_items (user, product)` → `quantity` depende de la pareja completa
  (el mismo producto en dos carritos distintos tiene cantidades distintas).
- `reviews (user, product)` → `rating`, `comment` dependen de la pareja completa.

**3FN — sin dependencias transitivas.** Los atributos derivables no se almacenan
como fuente de verdad:

- `stores.total_products`, `stores.rating_avg`, `stores.total_reviews`,
  `categories.total_stores`, `categories.min_price`… **no existen como columnas**:
  se calculan en las vistas `view_stores_directory`, `view_category_stats` y
  `view_products_catalog` (ver §2.5). Así el conteo nunca puede quedar desfasado.
- `products.store_name`, `products.store_department`, `products.category_name`
  tampoco se copian en `products`: se resuelven por JOIN en la vista del catálogo
  (evita la dependencia transitiva `producto → taller → departamento`).

**Desnormalizaciones conscientes (documentadas y justificadas).** Romper 3FN solo
donde el costo de recalcular supera al de mantener el dato:

| Campo | Tipo | Por qué se acepta |
| :--- | :--- | :--- |
| `products.rating_avg`, `products.rating_count` | *caché agregado* | Se recalculan en cada alta/baja de reseña mediante el hook `pb_hooks/on-reviews-change.pb.js`. Sirven listados y ordenaciones sin agregar en cada lectura. La fuente de verdad sigue siendo `reviews`. |
| `orders.items` y `orders.shipping_address` (JSON) | *instantánea histórica* | Un pedido debe conservar el precio y la dirección **del momento de la compra**. Si el artesano cambia el precio o el cliente cambia su dirección, el pedido no debe mutar. Es una decisión de negocio, no una omisión. |
| `orders.total` | *caché* | Se congela junto con la instantánea para auditoría y para las métricas del panel. |
| `reviews.user_name_snapshot` | *instantánea* | La reseña muestra el nombre tal como estaba al escribirla; evita JOIN y evita que un cambio de nombre reescriba el historial. |
| `stores.is_demonstrative` | *bandera* | Separa datos de demostración de datos reales sin duplicar tablas. |
| `users.totp_*` (5 campos) | *estado de seguridad* | Campos `hidden`: solo el cliente de superusuario los lee/escribe, así que un `PATCH` normal del usuario no puede falsear el 2FA. |

### 2.5 Vistas SQL (datos derivados, siempre consistentes)

| Vista | Rol en la aplicación | Lee de |
| :--- | :--- | :--- |
| `view_products_catalog` | Catálogo con nombre/slug/departamento del taller y de la categoría + `rating_avg` recalculado; alimenta `/productos`. | `products` ⋈ `stores` ⋈ `categories` ⋈ `reviews` |
| `view_stores_directory` | Directorio de talleres con `total_products`, `rating_avg` y `total_reviews` reales; alimenta `/tiendas` y el mapa. | `stores` ⋈ `products` ⋈ `reviews` |
| `view_category_stats` | Conteo de talleres y rango de precios por categoría; alimenta la portada. | `categories` ⋈ `stores` ⋈ `products` |

Las tres son **de solo lectura** y reproducen la misma lógica que usaría un
`GROUP BY`, con el filtro `p.status = 'published'` incorporado: nunca exponen
borradores ni piezas archivadas.

### 2.6 Reglas de acceso por colección

PocketBase aplica las reglas en el servidor, así que ninguna API puede saltarlas
(el frontend no necesita comprobarlas para estar protegido).

| Colección | list / view | create | update | delete |
| :--- | :--- | :--- | :--- | :--- |
| `users` | propio usuario (`id = @request.auth.id`) | abierto (registro) | propio usuario | propio usuario |
| `stores` | público | `seller` o `admin` | dueño o `admin` | dueño o `admin` |
| `products` | publicadas o `admin` o dueño del taller | `seller` o `admin` | `admin` o dueño del taller | `admin` o dueño del taller |
| `categories` | público | `admin` | `admin` | `admin` |
| `orders` | el cliente dueño, el `seller` implicado o `admin` | autenticado | `admin`, o `seller` mientras no esté `paid` | `admin` |
| `cart_items` | solo el dueño | autenticado | solo el dueño | solo el dueño |
| `reviews` | público | autenticado | autor | autor o `admin` |
| `news` | solo `status = 'published'` | `admin` | `admin` | `admin` |

---

## 3. UML 1 — Diagrama de Casos de Uso

> Mermaid no tiene un tipo de diagrama de casos de uso propio; se representa con el
> estándar de facto en la herramienta: actores como nodos y casos de uso como elipses
> (`([…])`), con asociaciones hacia lo que cada actor puede hacer.

```mermaid
flowchart LR
    subgraph ACTORES
        VIS["👤 Visitante"]
        USR["👤 Usuario registrado"]
        ART["🧑‍🎨 Artesano · seller"]
        ADM["🛡️ Administrador"]
    end

    subgraph CASOS["Casos de uso"]
        UC01(["Explorar catálogo"])
        UC02(["Buscar y filtrar piezas"])
        UC03(["Ver ficha de producto"])
        UC04(["Ver talleres en el mapa"])
        UC05(["Registrarse e iniciar sesión"])
        UC06(["Activar verificación en dos pasos"])
        UC07(["Gestionar carrito"])
        UC08(["Realizar pedido"])
        UC09(["Escribir reseña"])
        UC10(["Publicar y mantener taller"])
        UC11(["Publicar piezas"])
        UC12(["Atender pedidos"])
        UC13(["Consultar métricas del taller"])
        UC14(["Administrar categorías y noticias"])
        UC15(["Moderar reseñas y pedidos"])
    end

    VIS --> UC01
    VIS --> UC03
    VIS --> UC04
    VIS --> UC05

    USR --> UC01
    USR --> UC02
    USR --> UC03
    USR --> UC05
    USR --> UC06
    USR --> UC07
    USR --> UC08
    USR --> UC09

    ART --> UC05
    ART --> UC06
    ART --> UC10
    ART --> UC11
    ART --> UC12
    ART --> UC13

    ADM --> UC14
    ADM --> UC15

    UC08 -.->|"include"| UC07
    UC08 -.->|"include"| UC05
    UC06 -.->|"extend"| UC05
    UC09 -.->|"include"| UC05
    UC12 -.->|"include"| UC05
```

**Actores y permisos (según las reglas reales de §2.6):**

- **Visitante** — todo lo público: catálogo, ficha de pieza, directorio de talleres y mapa.
- **Usuario registrado** (`role = user`) — además: carrito, pedidos, reseñas y 2FA.
- **Artesano** (`role = seller`) — además: su taller, sus piezas, sus pedidos y sus métricas.
- **Administrador** (`role = admin`) — categorías, noticias, moderación y acceso total.

---

## 4. UML 2 — Diagramas de Actividades

### 4.1 Inicio de sesión con verificación en dos pasos (2FA)

```mermaid
flowchart TD
    INI([Inicio]) --> FORM["Introducir correo y contraseña"]
    FORM --> POST["POST /api/auth/login"]
    POST --> CSRF{"¿Origen y token CSRF válidos?"}
    CSRF -->|No| E403["403 · Solicitud rechazada"] --> FIN([Fin])
    CSRF -->|Sí| PB["Autenticar contra PocketBase"]

    PB --> CRED{"¿Credenciales correctas?"}
    CRED -->|No| E401["401 · Credenciales inválidas"] --> FIN
    CRED -->|Sí| ADMIN{"¿Se pudo consultar el estado 2FA?"}
    ADMIN -->|No| E503["503 · Servicio no disponible (fallo cerrado)"] --> FIN
    ADMIN -->|Sí| TOTP{"¿La cuenta tiene 2FA activo?"}

    TOTP -->|No| SES["Emitir cookie de sesión pb_auth"] --> HOME["Redirigir a la vista solicitada"] --> FIN

    TOTP -->|Sí| CHAL["Guardar desafío en cookie HttpOnly pb_2fa (5 min)"]
    CHAL --> PASO2["Mostrar segundo paso en /login"]
    PASO2 --> COD["Introducir código de 6 dígitos o código de recuperación"]
    COD --> RATE{"¿Menos de 5 intentos en 5 min?"}
    RATE -->|No| E429["429 · Demasiados intentos"] --> FIN
    RATE -->|Sí| VAL{"¿Código válido y no reutilizado?"}
    VAL -->|No| CONT["Contar el intento fallido"] --> PASO2
    VAL -->|Sí| CANJE["Canjear el desafío por la sesión real"]
    CANJE --> ROT["Rotar token y limpiar el desafío"]
    ROT --> HOME
```

### 4.2 Compra: del carrito al pedido

```mermaid
flowchart TD
    INI([Inicio]) --> EXPL["Explorar catálogo (vista view_products_catalog)"]
    EXPL --> FICHA["Abrir ficha de la pieza"]
    FICHA --> ADD{"¿Agregar al carrito?"}
    ADD -->|No| EXPL
    ADD -->|Sí| LOGIN{"¿Hay sesión iniciada?"}
    LOGIN -->|No| AUTH["Iniciar sesión (actividad 4.1)"] --> ADD
    LOGIN -->|Sí| UPSERT["Insertar o sumar cantidad (cart_items · único por usuario+producto)"]
    UPSERT --> MAS{"¿Seguir comprando?"}
    MAS -->|Sí| EXPL
    MAS -->|No| CHECK["Abrir carrito y revisar totales"]
    CHECK --> DATOS["Completar datos de envío y método de pago"]
    DATOS --> VAL{"¿Datos válidos (Zod)?"}
    VAL -->|No| ERR["Marcar campos con error"] --> DATOS
    VAL -->|Sí| ORDEN["Crear orders con instantánea de items y dirección<br/>estado: pending"]
    ORDEN --> HOOK["Hook on-orders-create: avisar al taller"]
    HOOK --> ENTREGA{"¿Cómo se cierra el pedido?"}
    ENTREGA -->|"Pago en línea"| PAGO["Estado: paid"]
    ENTREGA -->|"Coordinación directa"| WA["Abrir WhatsApp con el detalle del pedido"]
    PAGO --> VACIA["Vaciar carrito del usuario"]
    WA --> VACIA
    VACIA --> SEG["Cliente y artesano siguen el estado<br/>pending → paid → shipped → delivered"]
    SEG --> FIN([Fin])
```

### 4.3 Publicación de una pieza (artesano)

```mermaid
flowchart TD
    INI([Inicio]) --> LOG["Iniciar sesión como seller"]
    LOG --> TALLER{"¿Tiene taller registrado?"}
    TALLER -->|No| CREAR["Crear taller: nombre, rubro, departamento, ubicación, horario"]
    CREAR --> VALGEO{"¿Ubicación dentro de Nicaragua?"}
    VALGEO -->|No| CREAR
    VALGEO -->|Sí| GUARDA["Guardar stores (owner = usuario)"]
    TALLER -->|Sí| FORM
    GUARDA --> FORM["Formulario de nueva pieza"]

    FORM --> DATOS["Nombre, descripción, precio, stock, categorías, fotos (máx. 8)"]
    DATOS --> VAL["Validación en el cliente y en el servidor (Zod + reglas)"]
    VAL --> OK{"¿Válido?"}
    OK -->|No| ERR["Mostrar errores por campo"] --> DATOS
    OK -->|Sí| SUBE["Subir imágenes a PocketBase (jpeg/png/webp, hasta 5 MB)"]
    SUBE --> ESTADO{"¿Publicar ahora o guardar borrador?"}
    ESTADO -->|Borrador| DRAFT["products.status = draft"]
    ESTADO -->|Publicar| PUB["products.status = published"]
    DRAFT --> VISIBLE["Solo lo ve el dueño y el admin"]
    PUB --> PUBLICO["Aparece en catálogo, ficha y mapa<br/>(regla: status = published)"]
    VISIBLE --> FIN([Fin])
    PUBLICO --> FIN
```

---

## 5. UML 3 — Diagrama de Clases

Modelo de clases del dominio (espejo de las colecciones) más las clases de servicio
que ya existen en el código (`src/lib`), con los métodos reales.

```mermaid
classDiagram
    direction LR

    class User {
        +String id
        +String email
        +String name
        +Role role
        +String phone
        +Locale locale
        +Boolean verified
        +Boolean totpEnabled
        +Date createdAt
        +esArtesano() Boolean
        +esAdministrador() Boolean
        +puedeVender() Boolean
    }

    class Store {
        +String id
        +String name
        +String slug
        +String description
        +Rubro category
        +Departamento department
        +String addressText
        +GeoPoint location
        +Boolean isDemonstrative
        +productosPublicados() Int
        +valoracionMedia() Float
    }

    class Product {
        +String id
        +String name
        +String slug
        +Float price
        +Int stock
        +EstadoProducto status
        +Float ratingAvg
        +Int ratingCount
        +estaPublicado() Boolean
        +hayStock(cantidad) Boolean
        +precioTotal(cantidad) Float
    }

    class Category {
        +String id
        +String name
        +String slug
        +String icon
        +esRaiz() Boolean
        +subcategorias() List
    }

    class Order {
        +String id
        +Float total
        +EstadoPedido status
        +MetodoPago paymentMethod
        +Json items
        +Json shippingAddress
        +Date createdAt
        +recalcularTotal() Float
        +puedeEditarArtesano() Boolean
        +siguienteEstado() EstadoPedido
    }

    class CartItem {
        +String id
        +Int quantity
        +subtotal() Float
        +sumar(cantidad) void
    }

    class Review {
        +String id
        +Int rating
        +String comment
        +String userNameSnapshot
        +esValida() Boolean
    }

    class News {
        +String id
        +String title
        +String slug
        +EstadoNoticia status
        +Date createdAt
        +estaPublicada() Boolean
    }

    class Role {
        <<enumeration>>
        user
        seller
        admin
    }
    class EstadoProducto {
        <<enumeration>>
        draft
        published
        archived
    }
    class EstadoPedido {
        <<enumeration>>
        pending
        paid
        shipped
        delivered
        cancelled
    }
    class MetodoPago {
        <<enumeration>>
        cash
        transfer
        card
        other
    }

    class PocketBaseGateway {
        <<service>>
        +pocketbaseFor(request) PocketBase
        +pocketbaseWithAuth(cookieHeader) PocketBase
        +ensureAdminAuth() PocketBase
    }
    class UrlResolver {
        <<service>>
        +getPocketBaseUrl() Promise~string~
        +getPocketBaseUrlSync() String
        +pbFileUrl(collectionId, recordId, filename) String
    }
    class SessionManager {
        <<service>>
        +setAuthCookie(cookies, token, record) void
        +clearAuthCookie(cookies) void
        +setPendingTwoFactorCookie(cookies, token) void
        +readPendingTwoFactorToken(cookies) String
    }
    class CsrfGuard {
        <<service>>
        +issueCsrfCookie(cookies) String
        +validateCsrf(request, cookies) Response
        +validateCsrfFromForm(request, cookies) Promise~bool~
    }
    class Guard {
        <<service>>
        +requireUser(context) GuardResult
        +requireRole(context, roles) GuardResult
    }
    class TotpService {
        <<service>>
        +generateTotpSecret() String
        +totp(secret, counter) String
        +verifyTotp(secret, code, counter) TotpVerifyResult
        +buildOtpauthUrl(params) String
        +generateRecoveryCodes(count) List
        +consumeRecoveryCode(hashes, code) RecoveryVerifyResult
    }
    class TwoFactorService {
        <<service>>
        +readUserSecurity(userId) UserSecurityState
        +updateUserSecurity(userId, patch) void
        +clearUserSecurity(userId) void
        +verifyUserCode(userId, code) CodeVerification
        +registerTwoFactorFailure(userId) void
        +resetTwoFactorAttempts(userId) void
    }
    class SecurityHeaders {
        <<service>>
        +contentSecurityPolicy() String
        +withSecurityHeaders(response) Response
    }
    class RuntimeEnv {
        <<service>>
        +runtimeEnv(name, fallback) String
    }
    class AuthLogger {
        <<service>>
        +logAuthEvent(event, data) void
    }

    User "1" --> "*" Store : posee
    User "1" --> "*" Order : realiza
    User "1" --> "*" CartItem : agrega
    User "1" --> "*" Review : escribe
    Store "1" --> "*" Product : publica
    Product "1" --> "*" CartItem : seAgrega
    Product "1" --> "*" Review : recibe
    Product "*" --> "*" Category : clasificadoEn
    Category "1" --> "*" Category : padre
    Order "*" --> "1" User : perteneceA
    Order "1" *-- "*" CartItem : instantaneaDe
    Review "*" --> "1" Product : sobre

    User ..> Role
    Product ..> EstadoProducto
    Order ..> EstadoPedido
    Order ..> MetodoPago

    TwoFactorService ..> TotpService : usa
    TwoFactorService ..> PocketBaseGateway : persiste
    PocketBaseGateway ..> UrlResolver : resuelve URL
    Guard ..> SessionManager : lee sesión
    CsrfGuard ..> SessionManager : emite cookie
    Guard ..> AuthLogger : registra
    UrlResolver ..> RuntimeEnv : configuración
    SecurityHeaders ..> RuntimeEnv : configuración
```

---

## 6. Extra — Diagrama de Secuencia: login con 2FA

(Complementa al Entregable 2 con el flujo entre capas; los diagramas de secuencia de
la arquitectura general están en `docs/DIAGRAMA_ARQUITECTURA.md`.)

```mermaid
sequenceDiagram
    autonumber
    actor U as Usuario
    participant L as /login (Astro)
    participant API as /api/auth/login
    participant TF as TwoFactorService
    participant PB as PocketBase

    U->>L: correo + contraseña
    L->>API: POST (cookie CSRF + x-csrf-token)
    API->>API: validateCsrf(request, cookies)
    alt origen o token inválidos
        API-->>L: 403
    else válidos
        API->>PB: auth-with-password
        alt credenciales incorrectas
            PB-->>API: 400
            API-->>L: 401 credenciales inválidas
        else correctas
            API->>TF: readUserSecurity(userId) (cliente superusuario)
            alt sin 2FA
                API-->>L: setAuthCookie(pb_auth) + 200
            else con 2FA activo
                API-->>L: setPendingTwoFactorCookie(pb_2fa) + 200 twoFactorRequired
                L-->>U: formulario del segundo paso
                U->>API: POST /api/auth/2fa/verify { code }
                API->>TF: verifyUserCode(userId, code)
                TF->>PB: leer totp_secret / hashes de recuperación
                alt código inválido o reutilizado
                    TF->>TF: registerTwoFactorFailure(userId)
                    API-->>L: 401 con intentos restantes
                else válido
                    TF->>PB: actualizar totp_last_counter
                    API->>API: canjear desafío por sesión real
                    API-->>L: setAuthCookie + limpiar pb_2fa
                end
            end
        end
    end
    L-->>U: vista solicitada
```

---

## 7. Cómo visualizar estos diagramas

Los bloques marcados con el lenguaje `mermaid` se renderizan directamente en:

| Herramienta | Cómo |
| :--- | :--- |
| **GitHub / GitLab** | Al ver este `.md` en el repositorio, los diagramas se dibujan solos. |
| **VS Code** | Extensión *Markdown Preview Mermaid Support* (vista previa con `Ctrl+Shift+V`). |
| **mermaid.live** | Pegar cada bloque para editar y **exportar SVG/PNG**. |
| **CLI (para el PDF/documento)** | `npx -y @mermaid-js/mermaid-cli -i este.md -o diagramas.pdf` (o `-i bloque.mmd -o pieza.png`). |
| **Word** | Exportar a PNG/SVG desde mermaid.live e insertar; las tablas del §2 se pegan tal cual. |

---

## 8. Trazabilidad y mantenimiento

- **Fuente del modelo ER:** esquema en vivo de la base (`_collections`: campos, tipos,
  `required`, `hidden`, relaciones, `cascadeDelete`, índices y reglas) e historial de
  migraciones versionadas en `pb/pb_migrations/` (25 archivos, de `1700000000` a
  `1700000024`). Si el esquema cambia, se añade una migración; este documento se
  regenera igual.
- **Fuente de los diagramas UML:** flujos reales del código (`src/middleware.ts`,
  `src/pages/api/auth/*`, `src/lib/auth/*`, `src/components/pages/*`) y las reglas de
  acceso de §2.6.
- **Coherencia con el resto de la entrega:**
  - `docs/DIAGRAMA_ER.md` — versión resumida del ER para el README.
  - `docs/DIAGRAMA_ARQUITECTURA.md` — arquitectura y secuencias de mapa/checkout.
  - `docs/ENTREGABLES_HACKATHON.docx` — documento Word con los 6 entregables (sección 2).
  - `DESIGN.md` — tokens de color y tipografía usados en las pantallas de estos flujos.
