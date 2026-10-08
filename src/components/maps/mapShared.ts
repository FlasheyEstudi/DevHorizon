// =============================================================================
// mapShared.ts — Shared types + constants for MapExperience sub-components.
// =============================================================================
// Centraliza:
//   - Store list item shape (extiende la geometria de useSortedStores).
//   - Lista de categorias usadas por chips (single source of truth).
//   - Bundle de traducciones minimo que recibe la isla (lo resuelve
//     el wrapper Astro con useTranslations, no la isla).
// =============================================================================

import type { GeoPointRecord } from '@/lib/types/geo';
import type { Department } from '@/lib/geo';

export interface MapStore {
  id: string;
  name: string;
  slug: string;
  location: GeoPointRecord;
  department?: Department | string;
  address_text?: string;
  category?: string;
  logoUrl?: string;
  distanceKm?: number;
  description?: string;
  schedule?: any;
  schedule_text?: string;
  is_demonstrative?: boolean;
  total_products?: number;
  rating_avg?: number;
  total_reviews?: number;
}

export interface MapCategory {
  slug: string;
  label: string;
  icon?: string;
  count?: number;
}

export const MAP_CATEGORIES: MapCategory[] = [
  { slug: 'ceramica', label: 'Cerámica', icon: 'lucide:coffee' },
  { slug: 'textil', label: 'Textil', icon: 'lucide:shirt' },
  { slug: 'madera', label: 'Madera', icon: 'lucide:tree-pine' },
  { slug: 'cuero', label: 'Cuero', icon: 'lucide:shopping-bag' },
  { slug: 'joyeria', label: 'Joyería', icon: 'lucide:gem' },
  { slug: 'cesteria', label: 'Cestería', icon: 'lucide:shopping-basket' },
];

export interface MapI18n {
  title: string;
  subtitle: string;
  loading: string;
  empty: string;
  noResults: string;
  viewStore: string;
  fabLocate: string;
  fabLocating: string;
  geoDeniedTitle: string;
  geoDeniedDesc: string;
  geoDeniedRetry: string;
  geoOutOfNITitle: string;
  geoOutOfNIDesc: string;
  filterAllCategories: string;
  filterAllDepartments: string;
  searchPlaceholder: string;
  sheetExpand: string;
  sheetCollapse: string;
  distanceLabel: string;
  resultsLabel: string;
  clearFilters: string;
  kmSuffix: string;
  routeHowToGetThere: string;
  routeCalculating: string;
  routeDuration: string;
  routeDistance: string;
  routeClose: string;
  routeGoogleMaps: string;
  routeWaze: string;
  routeNeedLocation: string;
  routeError: string;
  // Extended keys
  workshopsIn: string;
  directoryTitle: string;
  listView: string;
  gridView: string;
  nearestOrder: string;
  alphabeticalOrder: string;
  foundCount: string;
  routeDestination: string;
  demonstrative: string;
  demonstrativeWorkshop: string;
  masterWorkshop: string;
  certifiedWorkshop: string;
  pieceSingle: string;
  piecePlural: string;
  productSingle: string;
  productPlural: string;
  startRoute: string;
  viewAction: string;
  viewDetailsAction: string;
  workshopSingle: string;
  workshopsPlural: string;
  openToday: string;
  nearRouteIn: string;
  allNicaragua: string;
  activeCountSuffix: string;
  allWorkshops: string;
  fromYou: string;
  calculatingRouteDesc: string;
  recommendedRoute: string;
}

import type { RouteResult } from '@/lib/routing';

export interface ActiveRouteData {
  store: MapStore;
  route: RouteResult;
}
