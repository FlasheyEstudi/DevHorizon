// =============================================================================
// useCatalogLiveFilter.ts — React Hook for dynamic catalog filtering & state.
// =============================================================================
// Keeps client state synchronized with URL search params seamlessly:
//   - Allows instant filter updates.
//   - Updates browser history with window.history.pushState (no hard reload).
//   - Preserves bookmarkability and shareable URLs with 100% SEO integrity.
// =============================================================================

import { useCallback, useEffect, useState } from 'react';

export interface CatalogFilterState {
  department: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  sort: string;
  searchQuery: string | null;
  category: string | null;
}

interface UseCatalogLiveFilterProps {
  initialDepartment?: string | null;
  initialMin?: number | null;
  initialMax?: number | null;
  initialSort?: string;
  initialSearch?: string | null;
  initialCategory?: string | null;
}

export function useCatalogLiveFilter({
  initialDepartment = null,
  initialMin = null,
  initialMax = null,
  initialSort = '-created_at',
  initialSearch = null,
  initialCategory = null,
}: UseCatalogLiveFilterProps = {}) {
  const [filters, setFilters] = useState<CatalogFilterState>({
    department: initialDepartment,
    minPrice: initialMin,
    maxPrice: initialMax,
    sort: initialSort,
    searchQuery: initialSearch,
    category: initialCategory,
  });

  // Sincronizar estado cuando el usuario navega con atrás/adelante en el navegador
  useEffect(() => {
    const handlePopState = () => {
      const url = new URL(window.location.href);
      const params = url.searchParams;

      const minVal = params.get('min');
      const maxVal = params.get('max');

      setFilters({
        department: params.get('departamento') || null,
        minPrice: minVal && !isNaN(Number(minVal)) ? Number(minVal) : null,
        maxPrice: maxVal && !isNaN(Number(maxVal)) ? Number(maxVal) : null,
        sort: params.get('sort') || '-created_at',
        searchQuery: params.get('q') || null,
        category: params.get('categoria') || null,
      });
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Actualizar URL sin recarga completa
  const pushUrlUpdate = useCallback((nextFilters: CatalogFilterState) => {
    if (typeof window === 'undefined') return;

    try {
      const url = new URL(window.location.href);

      if (nextFilters.department && nextFilters.department !== 'all') {
        url.searchParams.set('departamento', nextFilters.department);
      } else {
        url.searchParams.delete('departamento');
      }

      if (nextFilters.minPrice !== null && !isNaN(nextFilters.minPrice)) {
        url.searchParams.set('min', String(nextFilters.minPrice));
      } else {
        url.searchParams.delete('min');
      }

      if (nextFilters.maxPrice !== null && !isNaN(nextFilters.maxPrice)) {
        url.searchParams.set('max', String(nextFilters.maxPrice));
      } else {
        url.searchParams.delete('max');
      }

      if (nextFilters.sort && nextFilters.sort !== '-created_at') {
        url.searchParams.set('sort', nextFilters.sort);
      } else {
        url.searchParams.delete('sort');
      }

      if (nextFilters.searchQuery && nextFilters.searchQuery.trim()) {
        url.searchParams.set('q', nextFilters.searchQuery.trim());
      } else {
        url.searchParams.delete('q');
      }

      if (nextFilters.category) {
        url.searchParams.set('categoria', nextFilters.category);
      } else {
        url.searchParams.delete('categoria');
      }

      const newUrl = `${url.pathname}${url.search}`;
      if (newUrl !== `${window.location.pathname}${window.location.search}`) {
        window.history.pushState({}, '', newUrl);
        // Despachar evento para que componentes reactivos escuchen el cambio si lo necesitan
        window.dispatchEvent(new Event('catalog:filter-changed'));
      }
    } catch {
      // Fallback
    }
  }, []);

  const setDepartment = useCallback((dept: string | null) => {
    setFilters((prev) => {
      const next = { ...prev, department: dept === 'all' ? null : dept };
      pushUrlUpdate(next);
      return next;
    });
  }, [pushUrlUpdate]);

  const setPriceRange = useCallback((min: number | null, max: number | null) => {
    setFilters((prev) => {
      const next = { ...prev, minPrice: min, maxPrice: max };
      pushUrlUpdate(next);
      return next;
    });
  }, [pushUrlUpdate]);

  const setSort = useCallback((sort: string) => {
    setFilters((prev) => {
      const next = { ...prev, sort };
      pushUrlUpdate(next);
      return next;
    });
  }, [pushUrlUpdate]);

  const setSearchQuery = useCallback((q: string | null) => {
    setFilters((prev) => {
      const next = { ...prev, searchQuery: q };
      pushUrlUpdate(next);
      return next;
    });
  }, [pushUrlUpdate]);

  const clearAll = useCallback(() => {
    setFilters({
      department: null,
      minPrice: null,
      maxPrice: null,
      sort: '-created_at',
      searchQuery: null,
      category: null,
    });
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', window.location.pathname);
      window.dispatchEvent(new Event('catalog:filter-changed'));
    }
  }, []);

  const hasActiveFilters = Boolean(
    filters.department ||
    filters.minPrice !== null ||
    filters.maxPrice !== null ||
    filters.searchQuery ||
    filters.category
  );

  return {
    filters,
    setDepartment,
    setPriceRange,
    setSort,
    setSearchQuery,
    clearAll,
    hasActiveFilters,
  };
}
