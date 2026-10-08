// =============================================================================
// storeIcon.ts — Custom Leaflet divIcon for artisan store markers & clusters.
// =============================================================================
// Replaces generic pins with branded, high-contrast category markers inspired
// by the Stitch mobile design system (Screen 9a2bdeee328f4cf78a9e9bc296d1d9d6):
//   - Category-colored circular badge with pointy tail.
//   - High-contrast pure white SVG icons for each craft category.
//   - Floating tooltip pill with workshop name and colored category dot on hover/select.
//   - Custom Stitch cluster node ('5+ Talleres') with animated halo.
//   - Colonial Blue GPS pulse beacon for user location.
// =============================================================================

import L from 'leaflet';

/** Tamaño en pixeles del marker (incluye tip/cola inferior). */
export const MARKER_SIZE: [number, number] = [38, 42];
/** Punto del marker que apunta a la coordenada exacta en el mapa (la punta inferior). */
export const MARKER_ANCHOR: [number, number] = [19, 42];

export type MarkerVisualState = 'normal' | 'hover' | 'selected';

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#39;';
      default: return c;
    }
  });
}

/**
 * Normaliza la categoría con soporte defensivo para acentos, variantes
 * e inferencia automática a partir del nombre del taller si la categoría
 * en base de datos es 'otro' o vacía.
 */
export function normalizeCategory(cat?: string, name?: string): string {
  const cleanCat = (cat || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (cleanCat.includes('ceram') || cleanCat.includes('barro') || cleanCat.includes('alfarer')) return 'ceramica';
  if (cleanCat.includes('textil') || cleanCat.includes('tela') || cleanCat.includes('hamaca') || cleanCat.includes('guayabera')) return 'textil';
  if (cleanCat.includes('mader') || cleanCat.includes('tall') || cleanCat.includes('carpint')) return 'madera';
  if (cleanCat.includes('cuer') || cleanCat.includes('talabart') || cleanCat.includes('calzad') || cleanCat.includes('faja')) return 'cuero';
  if (cleanCat.includes('joy') || cleanCat.includes('orfebr') || cleanCat.includes('filigran') || cleanCat.includes('plata') || cleanCat.includes('oro')) return 'joyeria';
  if (cleanCat.includes('cest') || cleanCat.includes('mimbre') || cleanCat.includes('pita') || cleanCat.includes('palma')) return 'cesteria';

  // Si category es 'otro' o indefinido, inferir del nombre del taller:
  if (name) {
    const cleanName = name
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    if (cleanName.includes('ceram') || cleanName.includes('barro') || cleanName.includes('alfarer')) return 'ceramica';
    if (cleanName.includes('textil') || cleanName.includes('tela') || cleanName.includes('hamaca') || cleanName.includes('tej') || cleanName.includes('telar')) return 'textil';
    if (cleanName.includes('mader') || cleanName.includes('tall') || cleanName.includes('carpint')) return 'madera';
    if (cleanName.includes('cuer') || cleanName.includes('talabart') || cleanName.includes('calzad') || cleanName.includes('faja')) return 'cuero';
    if (cleanName.includes('joy') || cleanName.includes('orfebr') || cleanName.includes('filigran') || cleanName.includes('plata') || cleanName.includes('oro')) return 'joyeria';
    if (cleanName.includes('cest') || cleanName.includes('mimbre') || cleanName.includes('pita') || cleanName.includes('palma')) return 'cesteria';
  }

  return 'otro';
}

export const CATEGORY_STYLES: Record<
  string,
  {
    bg: string;
    darkBg: string;
    name: string;
  }
> = {
  ceramica: {
    bg: '#B85536', // Terracota / Barro (Primary brand)
    darkBg: '#9A4227',
    name: 'Cerámica',
  },
  textil: {
    bg: '#285375', // Azul Colonial / Añil (Secondary brand)
    darkBg: '#1D3E58',
    name: 'Textil',
  },
  madera: {
    bg: '#984025', // Madera Cálida / Caoba
    darkBg: '#7A321B',
    name: 'Madera',
  },
  cuero: {
    bg: '#78350F', // Cuero Tostado / Talabartería
    darkBg: '#5A2609',
    name: 'Cuero',
  },
  joyeria: {
    bg: '#B45309', // Ámbar Precolombino / Oro
    darkBg: '#92400E',
    name: 'Joyería',
  },
  cesteria: {
    bg: '#654321', // Fibras Naturales
    darkBg: '#4A3018',
    name: 'Cestería',
  },
  otro: {
    bg: '#B85536', // Brand Primary
    darkBg: '#9A4227',
    name: 'Taller Artesanal',
  },
};

/** SVGs de categoría de alto contraste (Blanco puro con drop-shadow) */
export const CATEGORY_ICONS: Record<string, string> = {
  // Cerámica: Potted plant / Maceta y brote artesanal (Stitch icon exacto)
  ceramica: `
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <path d="M19 19.5c0 .8-.7 1.5-1.5 1.5h-11C5.7 21 5 20.3 5 19.5L6.2 10h11.6L19 19.5zM6 8.5C6 7.7 6.7 7 7.5 7h9c.8 0 1.5.7 1.5 1.5S17.3 10 16.5 10h-9C6.7 10 6 9.3 6 8.5z" />
      <path d="M12 2c-.6 0-1 .4-1 1v3.5h2V3c0-.6-.4-1-1-1z" />
      <path d="M10.8 5.6C9.9 5.6 8.5 5.2 8 4.5 7.3 3.6 7.4 2.5 7.4 2.5s1.1 0 1.9.8c.8.8 1.5 1.8 1.5 2.3z" />
      <path d="M13.2 5.6c.9 0 2.3-.4 2.8-1.1.7-.9.6-2 .6-2s-1.1 0-1.9.8c-.8.8-1.5 1.8-1.5 2.3z" />
    </svg>
  `,
  // Textil: Franjas diagonales en telar de alto contraste (Stitch texture icon reforzado)
  textil: `
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3.5" y="3.5" width="17" height="17" rx="3.5" stroke-width="2.2" fill="none"/>
      <line x1="3.5" y1="9.5" x2="9.5" y2="3.5" />
      <line x1="3.5" y1="16" x2="16" y2="3.5" />
      <line x1="8" y1="20.5" x2="20.5" y2="8" />
      <line x1="14.5" y1="20.5" x2="20.5" y2="14.5" />
    </svg>
  `,
  // Madera: Sierra de carpintero artesanal (Stitch carpenter icon)
  madera: `
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <path d="M19.7 13.3l-9-9c-.4-.4-1-.4-1.4 0L7.6 6c-.4.4-.4 1 0 1.4l1.2 1.2-5.5 5.5c-.8.8-.8 2 0 2.8l2.8 2.8c.8.8 2 .8 2.8 0l5.5-5.5 1.2 1.2c.4.4 1 .4 1.4 0l1.7-1.7c.4-.4.4-1 0-1.4zM6.8 16.8c-.4.4-1 .4-1.4 0s-.4-1 0-1.4l3.5-3.5 1.4 1.4-3.5 3.5z" />
      <path d="M10.2 3.2l10.6 10.6-2.1 2.1-1.2-1.2-1.5 1.5-1.2-1.2-1.5 1.5-1.2-1.2-1.5 1.5-1.5-1.5z" />
    </svg>
  `,
  // Cuero: Bolso artesanal de cuero con broche (Stitch shopping_bag / leather satchel)
  cuero: `
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <path d="M19 6h-2.5V4.5C16.5 3.1 15.4 2 14 2h-4C8.6 2 7.5 3.1 7.5 4.5V6H5C3.9 6 3 6.9 3 8v11c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zM9.5 4.5c0-.3.2-.5.5-.5h4c.3 0 .5.2.5.5V6h-5V4.5zM19 19H5V8h2.5v1.5c0 .6.4 1 1 1s1-.4 1-1V8h5v1.5c0 .6.4 1 1 1s1-.4 1-1V8H19v11z"/>
      <rect x="9.5" y="11.5" width="5" height="3" rx="1"/>
    </svg>
  `,
  // Joyería: Diamante facetado (Stitch diamond)
  joyeria: `
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <path d="M16.5 3h-9L3 9l9 12 9-12-4.5-6zm-7.6 2h6.2l3 4H5.9l3-4zm-4.7 5h4.6l-2.9 8.2L4.2 10zm6.2 0h5.8L12 18.2 10.4 10zm7.4 0h4.6l-4 8.2-2.9-8.2z"/>
    </svg>
  `,
  // Cestería: Canasta tejida con asa
  cesteria: `
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <path d="M17.2 9H6.8l-.8-4.5c-.1-.6.3-1.1.9-1.2.6-.1 1.1.3 1.2.9L8.7 7h6.6l.6-2.8c.1-.6.6-1 1.2-.9.6.1 1 .6.9 1.2L17.2 9zm2.8 2H4c-.6 0-1 .4-1 1v1c0 .6.4 1 1 1h.7l1.5 6.3c.2.8.9 1.4 1.8 1.4h8c.9 0 1.6-.6 1.8-1.4l1.5-6.3H20c.6 0 1-.4 1-1v-1c0-.6-.4-1-1-1zm-4.2 8H8.2l-1.2-5h10l-1.2 5z"/>
    </svg>
  `,
  // Otro: Herramientas de taller artesanal (Handyman / Craft tools)
  otro: `
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <path d="M21.71 20.29l-1.42 1.42a1 1 0 0 1-1.41 0L14 16.83l1.42-1.42 4.88 4.88h.01c.39.39 1.01.39 1.4 0zM13.25 15.42L8.37 10.54c-.39-.39-1.01-.39-1.4 0L2.29 15.22a1 1 0 0 0 0 1.42l1.42 1.42a1 1 0 0 0 1.41 0l4.88-4.88 1.42 1.42-4.88 4.88a3 3 0 0 1-4.24 0l-1.42-1.42a3 3 0 0 1 0-4.24l4.68-4.68c-.68-1.57-.42-3.48.81-4.71 1.57-1.57 4-1.8 5.86-.71l-3.15 3.15 2.83 2.83 3.15-3.15c1.09 1.86.86 4.29-.71 5.86-1.23 1.23-3.14 1.49-4.71.81l-1.56 1.56 1.42 1.42z"/>
    </svg>
  `,
};

export function createStoreIcon(
  state: MarkerVisualState | boolean,
  label: string,
  category?: string,
  logoUrl?: string,
): L.DivIcon {
  const visualState: MarkerVisualState =
    typeof state === 'boolean' ? (state ? 'hover' : 'normal') : state;
  const safeLabel = escapeHtml(label);
  const isSelected = visualState === 'selected';
  const isHovered = visualState === 'hover';
  const isHighlighted = isSelected || isHovered;

  const catKey = normalizeCategory(category, label);
  const style = CATEGORY_STYLES[catKey] ?? CATEGORY_STYLES.otro;
  const iconSvg = CATEGORY_ICONS[catKey] ?? CATEGORY_ICONS.otro;

  const hasLogo = Boolean(logoUrl && logoUrl.trim().length > 0);
  const safeLogoUrl = hasLogo ? escapeHtml(logoUrl!.trim()) : '';

  // Contenido interno del círculo del pin:
  // Si la tienda tiene logo en la DB -> avatar circular con el logo y fallback al icono si falla.
  // Si no tiene logo -> icono SVG vectorial de categoría en alto contraste.
  const innerContent = hasLogo
    ? `
      <div class="map-marker-logo-disc">
        <img src="${safeLogoUrl}"
             alt="${safeLabel}"
             class="map-marker-logo-img"
             loading="lazy"
             onerror="this.style.display='none'; if (this.nextElementSibling) this.nextElementSibling.style.display='flex';" />
        <span class="map-marker-icon map-marker-fallback-icon" style="display: none; background-color: ${style.bg};">
          ${iconSvg}
        </span>
      </div>
    `
    : `
      <span class="map-marker-icon">
        ${iconSvg}
      </span>
    `;

  const html = `
    <div class="map-marker ${isHighlighted ? 'is-highlighted' : ''} ${isSelected ? 'is-selected' : ''} ${hasLogo ? 'has-custom-logo' : ''}"
         data-category="${catKey}"
         aria-label="${safeLabel}">
      <!-- Tooltip Pill (Stitch Pin Tooltip: "Los Briones") -->
      <div class="map-marker-pill">
        <span class="map-marker-pill-dot" style="background-color: ${style.bg};"></span>
        <span class="map-marker-pill-text">${safeLabel}</span>
      </div>

      <!-- Pin Body (Circular badge + tip inferior) -->
      <div class="map-marker-body">
        <div class="map-marker-circle ${hasLogo ? 'is-logo-badge' : ''}" style="background-color: ${style.bg};">
          ${innerContent}
        </div>
        <div class="map-marker-tip" style="background-color: ${style.bg};"></div>
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'map-marker-wrapper',
    iconSize: MARKER_SIZE,
    iconAnchor: MARKER_ANCHOR,
    popupAnchor: [0, -42],
  });
}

/** Crea un icono cluster con el diseño artesanal de Stitch ('5+ Talleres'). */
export function createClusterIcon(count: number): L.DivIcon {
  const label = count >= 50 ? '50+' : `${count}+`;
  const html = `
    <div class="map-cluster-node">
      <div class="map-cluster-halo"></div>
      <div class="map-cluster-core">
        <span class="map-cluster-count">${label}</span>
        <span class="map-cluster-label">TALLERES</span>
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'map-cluster-wrapper',
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}

/** Icono para la ubicación actual del usuario con pulso GPS colonial azul (Stitch Design). */
export function createUserLocationIcon(): L.DivIcon {
  const html = `
    <div class="user-gps-marker" style="position: relative; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; pointer-events: none;">
      <span style="position: absolute; width: 36px; height: 36px; border-radius: 9999px; background-color: rgba(40, 83, 117, 0.35); animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
      <span style="position: absolute; width: 24px; height: 24px; border-radius: 9999px; background-color: rgba(40, 83, 117, 0.25);"></span>
      <div style="width: 14px; height: 14px; border-radius: 9999px; background-color: #285375; border: 2.5px solid #ffffff; box-shadow: 0 2px 5px rgba(0,0,0,0.35); position: relative; z-index: 10; display: flex; align-items: center; justify-content: center;">
        <span style="width: 4px; height: 4px; border-radius: 9999px; background-color: #ffffff;"></span>
      </div>
    </div>
  `;
  return L.divIcon({
    html,
    className: 'user-location-marker-container',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}
