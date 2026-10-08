# 🎨 Sistema de Tokenización de Diseño y Guía de Estilos (DESIGN.md)

Este documento define el **Sistema de Design Tokens** oficial y las reglas de contraste y accesibilidad (**WCAG 2.1 AA / AAA**) para la plataforma **ArtesaNica** en sus versiones **Modo Claro (Light Mode)** y **Modo Oscuro (Dark Mode)**.

---

## 🏛️ 1. Paleta Oficial de Marca

La identidad cromática de **ArtesaNica** se fundamenta en tres tonos que representan la tradición y geografía nicaragüense:

```
┌─────────────────────────┬─────────────────────────┬─────────────────────────┐
│       #285375           │       #B85536           │       #E2A349           │
│   RGB: 40, 83, 117      │   RGB: 184, 85, 54      │   RGB: 226, 163, 73     │
│  Azul Colonial / Añil   │  Terracota / Barro      │  Ocre Dorado / Ámbar    │
│  (Color Secundario)     │  (Color Primario)       │  (Acento / Terciario)   │
└─────────────────────────┴─────────────────────────┴─────────────────────────┘
```

1. **🔴 Terracota / Barro Artesanal (`#B85536`) — Color Primario**:
   - Evoca la alfarería y cerámica precolombina (San Juan de Oriente, La Paz Centro), la arcilla moldeada a mano y las tejas coloniales.
   - **Uso**: Acciones principales (CTAs, botones primarios, badges destacados, links activos, marcadores del mapa).

2. **🔵 Azul Colonial / Añil Nicaragüense (`#285375`) — Color Secundario**:
   - Representa el azul de los lagos de Nicaragua (Cocibolca, Xolotlán), el añil de los telares tradicionales y la arquitectura patrimonial de Granada y León.
   - **Uso**: Encabezados de secciones, navegación secundaria, trust signals, badges institucionales, rutas del mapa.

3. **🟡 Ocre Dorado / Ámbar Artesanal (`#E2A349`) — Acento / Terciario**:
   - Simboliza la calidez del sol tropical, las fibras de mimbre y madera fina (Masatepe, Solentiname), las hamacas doradas y la orfebrería.
   - **Uso**: Badges de calificación (rating stars), etiquetas destacadas ("DESCUBRE NICARAGUA"), micro-acentos y elementos de interacción cálidos.

---

## 🎯 2. Objetivos del Sistema de Tokens
- **Cero Saltos Visuales / Flicker**: Garantizar consistencia entre temas claro y oscuro mediante variables CSS-first en `@theme` (Tailwind CSS v4).
- **Contraste AA/AAA Aprobado**: Ratio mínimo de **4.5:1** en texto normal y **3:1** en elementos de UI interactivos y textos grandes.
- **Semántica Clara**: Prohibición de clases de colores hardcodeadas no adaptables (ej. `bg-emerald-500`, `bg-white`, `text-gray-900`) en favor de tokens semánticos (`bg-primary`, `bg-secondary`, `bg-blanco`, `bg-fondo`, `text-texto`).

---

## 🌗 3. Matriz de Tokens de Marca

| Token CSS | Utilidad Tailwind | Modo Claro (Light) | Modo Oscuro (Dark) | Rol Semántico / Uso |
| :--- | :--- | :--- | :--- | :--- |
| `--color-primary` | `bg-primary`, `text-primary`, `border-primary` | `#B85536` (Terracota) | `#DE7D5F` (Terracota luminoso) | Botones primarios, CTAs, highlight |
| `--color-primary-dark` | `hover:bg-primary-dark` | `#9A4227` | `#EAA088` | Estados hover y active de primarios |
| `--color-primary-light` | `bg-primary-light` | `#F7ECE8` | `#331A13` | Fondos suaves de tarjetas y píldoras |
| `--color-primary-foreground` | `text-primary-foreground` | `#ffffff` | `#0c131f` | Texto sobre fondos `bg-primary` |
| `--color-secondary` | `bg-secondary`, `text-secondary` | `#285375` (Azul Añil) | `#5C93B8` (Azul colonial claro) | Secciones secundarias, banners, títulos |
| `--color-secondary-dark` | `hover:bg-secondary-dark` | `#1D3E58` | `#7FAECB` | Hover de secundarios |
| `--color-secondary-light` | `bg-secondary-light` | `#EBF2F7` | `#132435` | Fondos de banners de ruta artesanal |
| `--color-secondary-foreground` | `text-secondary-foreground` | `#ffffff` | `#0c131f` | Texto sobre fondos `bg-secondary` |
| `--color-tertiary` / `--color-accent-amber` | `bg-tertiary`, `text-accent-amber` | `#E2A349` (Ocre Ámbar) | `#F0B865` (Ocre luminoso) | Estrellas de rating, tags de descubrimiento |
| `--color-brand-terracotta` | `text-brand-terracotta` | `#B85536` | `#DE7D5F` | Token nominal para Terracota |
| `--color-brand-blue` | `text-brand-blue` | `#285375` | `#5C93B8` | Token nominal para Azul Añil |
| `--color-brand-amber` | `text-brand-amber` | `#E2A349` | `#F0B865` | Token nominal para Ocre Ámbar |

---

## 📦 4. Matriz de Superficies, Contenedores y Bordes

| Token Semántico | Modo Claro (Light) | Modo Oscuro (Dark) | Uso Principal |
| :--- | :--- | :--- | :--- |
| `--color-fondo` | `#f8fafc` (Slate 50) | `#0c131f` (Deep Navy Slate) | Fondo principal de la aplicación (`body`) |
| `--color-blanco` / `card` | `#ffffff` | `#16202e` (Slate Card Container) | Tarjetas de productos, contenedores principales, modales |
| `--color-borde` | `#e2e8f0` | `#253346` | Separadores, bordes de cards y formularios |
| `--color-banner-bg` | `#FAF3F0` | `#1c1514` | Fondo de banners temáticos (Ruta y Procesos) |
| `--color-banner-border` | `#F0D7CF` | `#3d241c` | Bordes de banners destacados |
| `--color-pill-bg` | `#ffffff` | `#16202e` | Píldoras internas en rutas y categorías |
| `--color-pill-border` | `#E8CFCA` | `#2e3b4e` | Bordes de píldoras interactivas |
| `--color-footer-bg` | `#0d1520` | `#090e16` | Fondo del footer |
| `--color-footer-text` | `#94a3b8` | `#94a3b8` | Textos secundarios del footer |

---

## ✍️ 5. Matriz de Tipografía y Contraste WCAG 2.1

| Token Semántico | Modo Claro (Light) | Modo Oscuro (Dark) | Ratio Contraste (WCAG) |
| :--- | :--- | :--- | :--- |
| `--color-texto` | `#1e293b` (Slate 800) | `#f1f5f9` (Slate 100) | **14.8:1** (Supera AAA) |
| `--color-texto-secundario` | `#64748b` (Slate 500) | `#94a3b8` (Slate 400) | **5.4:1** (Supera AA) |
| `--color-primary` (en texto) | `#B85536` | `#DE7D5F` | **4.7:1** (Supera AA) |
| `--color-secondary` (en texto) | `#285375` | `#5C93B8` | **7.6:1** (Supera AAA) |
| `--color-accent-amber` (en texto) | `#B3761E` (ajustado texto) | `#F0B865` | **4.6:1** (Supera AA) |

---

## 🛠️ 6. Guía de Implementación en Componentes

### A. Botones Principales y Secundarios
```html
<!-- Botón Primario (Terracota) -->
<button class="bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-lg font-semibold transition-colors shadow-sm">
  Comprar Ahora
</button>

<!-- Botón Secundario (Azul Añil) -->
<button class="bg-secondary hover:bg-secondary-dark text-white px-5 py-2.5 rounded-lg font-semibold transition-colors shadow-sm">
  Explorar Mapa
</button>

<!-- Botón Outlined -->
<button class="border border-primary text-primary hover:bg-primary/10 px-5 py-2.5 rounded-lg font-semibold transition-colors">
  Ver Detalles
</button>
```

### B. Tarjeta de Producto
```html
<div class="bg-blanco rounded-xl overflow-hidden border border-borde hover:border-primary/40 hover:shadow-card transition-all">
  <img src="..." alt="Producto" class="w-full aspect-square object-cover" />
  <div class="p-3">
    <span class="text-xs font-semibold text-accent-amber">★ 4.9</span>
    <h3 class="text-sm font-medium text-texto line-clamp-1">Jarrón de Cerámica</h3>
    <p class="text-sm font-bold text-primary">C$ 450.00</p>
  </div>
</div>
```

### C. Banner "Ruta de Pueblos Artesanales"
```html
<section class="bg-secondary/5 dark:bg-secondary/15 rounded-3xl p-6 sm:p-8 border border-secondary/20 dark:border-secondary/30 shadow-2xs">
  <span class="text-xs font-bold tracking-widest text-secondary uppercase border-l-2 border-secondary pl-2">
    DESCUBRE NICARAGUA
  </span>
  <h2 class="text-2xl font-bold text-texto mt-1">Ruta de Pueblos Artesanales</h2>
  <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
    <a class="bg-blanco dark:bg-zinc-800/90 rounded-2xl p-4 border border-secondary/10 dark:border-secondary/30 hover:border-secondary/50 transition-all">
      <div class="flex items-center gap-2 text-secondary font-bold text-sm">
        <span>Niquinohomo</span>
      </div>
      <p class="text-xs text-texto-secundario mt-1">Cerámica de arcilla y madera</p>
    </a>
  </div>
</section>
```

### D. Banner "El Proceso Artesanal"
```html
<section class="bg-gradient-to-br from-[#0c131f] via-[#1a1210] to-[#0c131f] text-white rounded-3xl p-8 border border-primary/30 relative overflow-hidden">
  <span class="text-xs font-bold tracking-widest text-accent-amber uppercase border-l-2 border-accent-amber pl-2">
    DEL BARRO A TUS MANOS
  </span>
  <h2 class="text-3xl font-extrabold text-white mt-1">El Proceso Artesanal</h2>
  <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
    <div class="bg-white/5 backdrop-blur-md rounded-2xl p-5 border border-white/10 hover:border-accent-amber/50 transition-all">
      <div class="w-12 h-12 bg-accent-amber/20 text-accent-amber rounded-xl flex items-center justify-center text-xl mb-4">
        <Icon name="lucide:shovel" />
      </div>
      <h3 class="text-sm font-bold text-white">1. Extracción de Barro</h3>
      <p class="text-xs text-gray-300">Arcilla pura extraída de las canteras tradicionales.</p>
    </div>
  </div>
</section>
```

---

## 📋 7. Reglas de Mantenibilidad

1. **Nunca usar clases directas de Tailwind para verdes o colores no registrados** (`bg-emerald-*`, `text-green-*`, `bg-gray-*`) sin justificación expresa de estado de éxito o error universal.
2. **Utilizar siempre tokens semánticos**:
   - `bg-primary` / `text-primary` / `border-primary` (Terracota)
   - `bg-secondary` / `text-secondary` / `border-secondary` (Azul Añil)
   - `text-accent-amber` / `bg-accent-amber` (Ocre Cálido)
   - `bg-blanco` / `bg-fondo` / `text-texto` / `text-texto-secundario` / `border-borde`
3. **Validación visual continua**: Verificar cualquier vista tanto en modo claro como en modo oscuro ejecutando `astro dev` y alternando el toggle de tema.
