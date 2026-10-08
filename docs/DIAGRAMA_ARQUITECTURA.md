# Arquitectura del Sistema y Flujos de Datos — ArtesaNica

Este documento especifica la arquitectura de componentes, flujo de datos y secuencias de interacción para la plataforma **ArtesaNica** (Astro 7 + React 19 + PocketBase + Tailwind v4 + Leaflet).

---

## 🏛️ 1. Arquitectura General del Sistema

```mermaid
graph TD
    subgraph CLIENTE["🌐 Cliente (Navegador Web)"]
        UI["Astro HTML / SSR Hydrated"]
        REACT["Islas React 19 (@astrojs/react)"]
        LEAFLET["Mapa Leaflet + Clustering (React-Leaflet)"]
        STORES["Nanostores (Cart, Auth, Toast)"]
        CSS["Tailwind CSS v4 (@theme & Tokens Oficiales)"]
    end

    subgraph SERVIDOR["⚡ Vercel Edge / Serverless (Astro 7 SSR)"]
        ROUTER["i18n Enrutador (/ & /en/)"]
        MIDDLEWARE["Middleware per-request"]
        CSRF["Protección CSRF & Guards"]
        ZOD["Validación de Schemas con Zod"]
        API["REST API Endpoints (/api/*)"]
        RESOLVER["pb-url.ts (Health Check & Failover)"]
    end

    subgraph BACKEND["📦 Capa de Datos (PocketBase v0.27)"]
        PBLOCAL["PocketBase Local (127.0.0.1:8090)"]
        PBCLOUD["PocketHost Cloud (vapor-invented.pockethost.io)"]
        SQLITE[("SQLite 3FN Relacional")]
        AUTHSTORE["AuthStore (Usuarios & Superusuarios)"]
        STORAGE["Almacenamiento de Archivos e Imágenes"]
    end

    subgraph EXTERNOS["🌍 Servicios Externos"]
        OSM["OpenStreetMap Tile Server"]
        WHATSAPP["API Click-to-WhatsApp"]
    end

    UI --> REACT
    REACT --> LEAFLET
    REACT --> STORES
    UI --> STORES
    UI --> CSS

    UI -->|HTTP / Navegación| ROUTER
    REACT -->|Fetch JSON / Mutaciones| API
    
    ROUTER --> MIDDLEWARE
    MIDDLEWARE --> CSRF
    CSRF --> API
    API --> ZOD
    ZOD --> RESOLVER

    RESOLVER -->|Primario| PBLOCAL
    RESOLVER -.->|Fallback de Conmutación Automática| PBCLOUD

    PBLOCAL --> SQLITE
    PBLOCAL --> AUTHSTORE
    PBLOCAL --> STORAGE

    PBCLOUD --> SQLITE
    PBCLOUD --> AUTHSTORE
    PBCLOUD --> STORAGE

    LEAFLET -->|Carga de Tiles| OSM
    REACT -->|Generar pedido C$| WHATSAPP
```

---

## 🗺️ 2. Diagrama de Secuencia: Exploración y Geolocalización de Talleres

```mermaid
sequenceDiagram
    autonumber
    actor U as Usuario / Turista
    participant M as Mapa (/mapa)
    participant C as MapCanvas (Leaflet)
    participant H as useGeolocation Hook
    participant API as /api/stores/geo
    participant PB as PocketBase DB

    U->>M: Navega a /mapa
    M->>API: GET /api/stores/geo (SSR / Client)
    API->>PB: getFullList(stores con location != null)
    PB-->>API: Lista de tiendas con coordenadas
    API-->>M: Tiendas geolocalizadas JSON
    M->>C: Inicializa mapa y marcadores con Cluster
    C-->>U: Muestra talleres artesanales en Nicaragua

    U->>M: Clic en "Cerca de mí" (MapFAB)
    M->>H: Solicita coordenadas GPS del navegador
    H-->>M: Coordenadas usuario (lat, lon)
    M->>M: useSortedStores (Haversine Formula)
    M->>C: mapInstance.flyTo(coords, zoom 12)
    C-->>U: Centra mapa y ordena talleres por proximidad (km)
```

---

## 🛒 3. Diagrama de Secuencia: Checkout y Pedido Directo a WhatsApp

```mermaid
sequenceDiagram
    autonumber
    actor C as Comprador
    participant CART as Carrito (/carrito)
    participant STORE as Nanostores (cartItems)
    participant API as /api/orders
    participant PB as PocketBase
    participant WA as WhatsApp Web / App
    actor A as Artesano

    C->>CART: Clic en "Completar Compra vía WhatsApp"
    CART->>STORE: Obtiene ítems, cantidades y precios
    CART->>API: POST /api/orders (Crear registro de orden)
    API->>PB: Inserta orden en colección 'orders'
    PB-->>API: Orden creada con ID único
    API-->>CART: Confirmación de orden registrada
    CART->>STORE: cartItems.set([]) (Limpia carrito)
    CART->>CART: Genera link con mensaje codificado:
    Note over CART: Hola [Taller], deseo ordenar:<br/>- [Cant]x [Producto] (C$ Subtotal)<br/>Total: C$ [Monto]<br/>Envío a: [Dirección / Teléfono]
    CART->>WA: Abre enlace https://wa.me/[phone]?text=...
    WA->>A: Envía mensaje directo al artesano con el pedido en Córdobas
```
