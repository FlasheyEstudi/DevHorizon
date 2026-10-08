// =============================================================================
// useSortedStores.ts — Filter + sort stores for the mapa sidebar/list.
// =============================================================================
// Pure derivation. No efectos, no DOM. Memoizado con useMemo.
//
// Sort strategy:
//   1. Si hay userCoords (geolocation granted):
//      - Pre-filtra por category + department si estan activos.
//      - Ordena por Haversine ascending (mas cercano primero).
//      - Incluye distancia en km en cada item.
//   2. Fallback (sin coords o outOfNI):
//      - Mismos filtros.
//      - Orden alfabetico por name.
//      - Sin distancia.
//
// El store DTO lleva `category` opcional para filtro (ver types abajo).
// =============================================================================

import { useMemo } from 'react';
import { haversineKm } from '@/lib/haversine';
import type { GeoPointRecord } from '@/lib/types/geo';

export interface StoreListItem {
  id: string;
  name: string;
  slug: string;
  location: GeoPointRecord;
  department?: string;
  address_text?: string;
  category?: string;
  logo?: string;
  /** Solo presente cuando hay geolocalizacion del usuario. */
  distanceKm?: number;
}

interface UseSortedStoresInput {
  stores: StoreListItem[];
  userCoords: { lat: number; lon: number } | null;
  category: string | 'all';
  department: string | 'all';
  searchQuery: string;
}

export function useSortedStores({
  stores,
  userCoords,
  category,
  department,
  searchQuery,
}: UseSortedStoresInput): StoreListItem[] {
  return useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    // Filtros: AND logico entre category, department y search.
    const filtered = stores.filter((s) => {
      if (category !== 'all' && s.category !== category) return false;
      if (department !== 'all' && s.department !== department) return false;
      if (query) {
        const haystack = `${s.name} ${s.department ?? ''} ${s.address_text ?? ''}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });

    // Orden inmutable.
    if (userCoords) {
      const userPoint: GeoPointRecord = { lat: userCoords.lat, lon: userCoords.lon };
      return filtered
        .map((s) => ({
          ...s,
          distanceKm: haversineKm(userPoint, s.location),
        }))
        .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
    }

    return filtered
      .map((s) => ({
        ...s,
        distanceKm: undefined,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }, [stores, userCoords, category, department, searchQuery]);
}
