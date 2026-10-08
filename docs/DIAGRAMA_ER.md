# Modelo Entidad-Relación (3FN) — ArtesaNica

Este documento contiene la especificación y diagramación formal del Modelo Entidad-Relación en Tercera Forma Normal (3FN) para la base de datos de **ArtesaNica** en PocketBase, como parte de los entregables técnicos de desarrollo del **Hackathon Nicaragua 2026**.

---

## 📐 Diagrama ER (Mermaid)

```mermaid
erDiagram
    USERS ||--o{ STORES : "es propietario de (1:N)"
    USERS ||--o{ ORDERS : "realiza (1:N)"
    USERS ||--o{ CART_ITEMS : "posee en carrito (1:N)"
    USERS ||--o{ REVIEWS : "escribe (1:N)"
    
    STORES ||--o{ PRODUCTS : "pertenecen a (1:N)"
    
    CATEGORIES ||--o{ CATEGORIES : "subcategoría de (1:N)"
    CATEGORIES ||--o{ PRODUCTS : "clasifica (N:M)"
    
    PRODUCTS ||--o{ CART_ITEMS : "contenido en (1:N)"
    PRODUCTS ||--o{ REVIEWS : "recibe (1:N)"

    USERS {
        string id PK
        string email UK
        string name
        string role "admin | seller | buyer"
        string phone
        string locale "es | en"
        string avatar
        datetime created
        datetime updated
    }

    STORES {
        string id PK
        string name
        string slug UK
        string description
        string logo
        string banner
        string owner FK "users.id"
        string department
        string address_text
        json location "lat, lon"
        datetime created
        datetime updated
    }

    CATEGORIES {
        string id PK
        string name
        string slug UK
        string description
        string icon
        string parent FK "categories.id (self-ref)"
        datetime created
        datetime updated
    }

    PRODUCTS {
        string id PK
        string name
        string slug UK
        string description
        number price
        number stock
        file images
        string store FK "stores.id"
        string categories FK "categories.id"
        json tags
        number rating_avg
        number rating_count
        string status "draft | published | archived"
        datetime created
        datetime updated
    }

    CART_ITEMS {
        string id PK
        string user FK "users.id"
        string product FK "products.id"
        number quantity
        datetime created
        datetime updated
    }

    ORDERS {
        string id PK
        string user FK "users.id"
        number total_amount
        string status "pending | completed | cancelled"
        json shipping_address
        string payment_method "cash | transfer | card | other"
        string notes
        datetime created
        datetime updated
    }

    REVIEWS {
        string id PK
        string user FK "users.id"
        string product FK "products.id"
        number rating
        string comment
        string user_name_snapshot
        datetime created
        datetime updated
    }

    NEWS {
        string id PK
        string title
        string slug UK
        string summary
        string content
        string image
        string status "draft | published"
        datetime created
        datetime updated
    }
```

---

## 📊 Justificación de Tercera Forma Normal (3FN)

1. **Primera Forma Normal (1FN)**:
   - Todos los atributos son atómicos. No existen listas repetitivas de atributos multivaluados en tablas relacionales primarias. Los archivos e imágenes se manejan en campos dedicados de PocketBase.
2. **Segunda Forma Normal (2FN)**:
   - Cumple con 1FN y todos los atributos no clave dependen totalmente de la clave primaria única (`id`) de cada entidad.
3. **Tercera Forma Normal (3FN)**:
   - Cumple con 2FN y no existen dependencias transitivas entre atributos no clave. Por ejemplo, los datos del usuario (`users`) no se duplican en las tiendas ni en las órdenes, manteniendo referencias por clave foránea (`owner`, `user`).

---

## 🛠️ Colecciones y Relaciones

| Colección | Descripción | Relaciones Clave |
|-----------|-------------|------------------|
| **`users`** | Usuarios registrados (compradores, artesanos, admins) | `STORES`, `ORDERS`, `CART_ITEMS`, `REVIEWS` |
| **`stores`** | Tiendas/Talleres artesanales | Propietario (`users.id`), Productos (`products.id`) |
| **`categories`** | Categorías de artesanías | Auto-referencial (`parent`), Productos (`products.id`) |
| **`products`** | Catálogo de productos artesanales | Pertenece a `stores.id`, Categorías `categories.id` |
| **`cart_items`** | Ítems del carrito de compras | Pertenece a `users.id` y `products.id` |
| **`orders`** | Registro de órdenes de compra | Pertenecen a `users.id` |
| **`reviews`** | Valoraciones de productos | Relaciona `users.id` con `products.id` |
| **`news`** | Publicaciones y noticias del portal | Independiente con filtro de estado |

---

## 🔐 Reglas de Seguridad y Acceso por Rol (Rules & Security)

- **Lectura Pública (`listRule` / `viewRule`)**:
  - `categories`, `stores`, `products` (solo publicados), `news` (solo publicadas) y `reviews` son de acceso público sin autenticación.
- **Acceso Restringido por Rol (`createRule` / `updateRule` / `deleteRule`)**:
  - `orders` y `cart_items`: Acceso exclusivo al usuario propietario autenticado (`@request.auth.id = user`).
  - `stores` y `products`: Edición permitida al artesano propietario (`store.owner = @request.auth.id`) o administradores.
