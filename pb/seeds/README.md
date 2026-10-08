# ArtesaNica — PocketBase Seed Data

Seed completo para todas las colecciones del backend de ArtesaNica.
Reemplaza y amplía el viejo `pb/seed_geo_stores.js` (que solo sembraba
stores); ahora se siembran las 7 colecciones con sus relaciones.

## Cómo correr

1. Asegurate de tener PocketBase corriendo:

   ```bash
   ./pocketbase.exe serve
   ```

2. Definí la contraseña del admin en `.env` o como variable de entorno:

   ```env
   POCKETBASE_URL=http://127.0.0.1:8090
   POCKETBASE_ADMIN_EMAIL=admin@artesa-nica.local
   POCKETBASE_ADMIN_PASSWORD=tu_password
   ```

3. Desde la raíz del proyecto:

   ```bash
   node pb/seeds/index.js
   ```

El script es **idempotente**: si corrés dos veces, los registros que ya
existen (por `slug`, `email`, o `(user, product)`) se saltean con un
`SKIP`. Es seguro re-ejecutarlo.

## Estructura

```
pb/seeds/
├── index.js              Orquestador: lee los JSON y crea los registros
├── seed.js               Utilidades: carga .env, resolución de referencias
├── README.md             Este archivo
└── collections/
    ├── users.json        20 usuarios (1 admin, 15 sellers, 4 buyers)
    ├── categories.json   10 categorías
    ├── stores.json       15 tiendas en 12 departamentos de Nicaragua
    ├── products.json     30 productos (2 por tienda)
    ├── cart_items.json    5 items en carritos
    ├── orders.json        6 órdenes en distintos estados
    └── reviews.json      16 reseñas distribuidas en productos
```

## Orden de siembra

El script respeta las dependencias y procesa las colecciones en este
orden: `users → categories → stores → products → cart_items → orders →
reviews`. No hay que cambiar el orden de los archivos.

## Sistema de referencias

Los archivos JSON usan un esquema declarativo: en lugar de los IDs que
asigna PocketBase, se usan **claves legibles** (`_key`) y referencias
tipadas (`_userRef`, `_productRef`, etc.). El orquestador resuelve las
referencias a IDs reales al momento de crear cada registro.

### Convención de campos

| En el JSON              | Se transforma a         | Notas                            |
| ----------------------- | ----------------------- | -------------------------------- |
| `_key`                  | (solo interno)          | Identificador legible para refs  |
| `_userRef`              | `user: <PB id>`         | Relación simple                  |
| `_ownerRef`             | `owner: <PB id>`        | Relación simple                  |
| `_storeRef`             | `store: <PB id>`        | Relación simple                  |
| `_productRef`           | `product: <PB id>`      | Relación simple                  |
| `_parentRef`            | `parent: <PB id>`       | Self-ref en `categories`         |
| `_categoryRefs`         | `categories: [<id>...]` | Relación múltiple (max 5)        |
| `_itemsRefs`            | `items: [{...}]`        | Snapshot JSON de orden           |

Cualquier otro campo (ej: `name`, `slug`, `price`) se mapea **directo**
a PocketBase.

### Auto-poblado

- `reviews.user_name_snapshot` se llena solo con el nombre del usuario
  que dejó la reseña (necesario porque la regla de vista de `users`
  bloquea `expand=user` desde el endpoint público de reviews).
- `orders.total` se calcula desde `items` si no se especifica en el JSON.
- `products.rating_avg` y `products.rating_count` se recalculan al final
  a partir de las reseñas insertadas.

## Credenciales de demo

Todos los passwords cumplen los requisitos de PocketBase
(mayúscula + minúscula + número + símbolo, ≥ 8 caracteres).

| Rol        | Email                                    | Password       |
| ---------- | ---------------------------------------- | -------------- |
| admin      | `admin@artesa-nica.local`                | `Admin1234!`   |
| seller     | `<nombre>.<apellido>@artesa-nica.local`  | `Seller1234!`  |
| user       | `<nombre>@artesa-nica.local`             | `Buyer1234!`   |

**Importante**: estos son credenciales de **desarrollo local**. Cambialos
o eliminalos antes de cualquier deploy.

## Colecciones cubiertas

| Colección   | # seed | Notas                                                   |
| ----------- | ------ | ------------------------------------------------------- |
| users       | 20     | 1 admin, 15 sellers (dueños de tienda), 4 buyers        |
| categories  | 10     | Plano, sin jerarquía — la soporta pero no la usamos     |
| stores      | 15     | Una por departamento, con `geoPoint` válido             |
| products    | 30     | 2 por tienda; todos en estado `published`               |
| cart_items  | 5      | Buyers con productos en carrito                         |
| orders      | 6      | Mix de `pending`, `paid`, `shipped`, `delivered`        |
| reviews     | 16     | Distribución realista (4-5 estrellas, comentarios)      |

## Migración desde el seed viejo

El viejo `pb/seed_geo_stores.js` sigue funcionando, pero queda
**superado**. Las dos versiones son idempotentes por `slug`, así que
podés correr ambas sin duplicar registros. Cuando termines de migrar
a este nuevo sistema podés borrar el viejo.

## Agregar un nuevo seed

1. Si tu colección no existe todavía, agregá una migración en
   `pb/pb_migrations/`.
2. Si la colección **nueva** necesita ser sembrada en un orden
   específico, agregá su nombre a `COLLECTION_ORDER` en `index.js`.
3. Creá `pb/seeds/collections/<coleccion>.json` con el array de registros.
4. Si tu colección usa relaciones, agregá la entrada correspondiente
   en `SINGLE_REFS` o extendé `resolveRefs` en `seed.js`.
5. Corré `node pb/seeds/index.js` desde la raíz del proyecto.