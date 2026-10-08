// =============================================================================
// MapExperience.tsx — Orquestador del /mapa full-bleed experience.
// =============================================================================
// Combina todos los sub-componentes del mapa en una sola isla React.
// Estado compartido:
//
//   - hover/sync lista↔mapa: hoveredId, selectedId
//   - filtros: category, department, searchQuery
//   - sheet mobile: sheetExpanded
//   - geolocation: delegado a useGeolocation()
//   - sort + filtrado: useSortedStores()
//   - map instance: expuesto por MapCanvas via onMapReady (para FAB flyTo)
//
// Layout CSS (hijo de <main class="h-[100dvh] w-screen overflow-hidden">):
//   absolute inset-0 flex flex-col
//     TopBar (top, debajo del overlay header)
//     div flex-1 relative
//       MapCanvas (absolute inset-0)
//       Sidebar (hidden < lg, absolute right-0)
//       BottomSheet (lg:hidden, fixed bottom-0)
//     FAB (absolute bottom-right)
//     GeoBanner (absolute top del canvas, condicional)
//
// Bidireccionalidad lista ↔ mapa:
//   - Hover/click en lista  -> MapCanvas hace flyTo + abre popup.
//   - Hover/click en marker -> lista hace scrollIntoView.
// =============================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { AlertTriangle, MapPinOff, RefreshCw, X } from 'lucide-react';

import type { Lang } from '@/i18n/ui';
import { DEPARTMENTS } from '@/lib/geo';
import { useGeolocation } from '@/lib/hooks/useGeolocation';
import { useSortedStores } from '@/lib/hooks/useSortedStores';

import { MAP_CATEGORIES, type ActiveRouteData, type MapCategory, type MapI18n, type MapStore } from './mapShared';
import { fetchRoute } from '@/lib/routing';
import MapCanvas from './MapCanvas';
import MapTopBar from './MapTopBar';
import MapSidebar from './MapSidebar';
import MapBottomSheet from './MapBottomSheet';
import RouteInfoBanner from './RouteInfoBanner';

interface Props {
  stores: MapStore[];
  categories?: MapCategory[];
  lang: Lang;
  i18n: MapI18n;
}

export default function MapExperience({ stores, categories, lang, i18n }: Props) {
  // Filtros
  const [category, setCategory] = useState<string | 'all'>('all');
  const [department, setDepartment] = useState<string | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Sync lista ↔ mapa
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Navegación GPS interactiva ("¿Cómo llegar?")
  const [activeRoute, setActiveRoute] = useState<ActiveRouteData | null>(null);
  const [isRouting, setIsRouting] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  // Mobile sheet — drag-driven: sheetHeight es la altura actual en px.
  const PEEK_DEFAULT = 125; // peek con avatares y contador general de talleres
  const PEEK_SELECTED = 168; // peek enfocado con tarjeta específica del taller seleccionado
  const SHEET_RATIO = 0.65; // expanded = 65dvh
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const currentPeek = selectedId ? PEEK_SELECTED : PEEK_DEFAULT;
  const [sheetHeight, setSheetHeight] = useState(PEEK_DEFAULT);
  const [sheetMax, setSheetMax] = useState(() =>
    typeof window === 'undefined' ? 480 : Math.round(window.innerHeight * SHEET_RATIO),
  );

  const sheetExpandedRef = useRef(sheetExpanded);
  sheetExpandedRef.current = sheetExpanded;

  // Si cambia selectedId y la hoja está en peek, adaptar altura suavemente
  useEffect(() => {
    if (!sheetExpandedRef.current) {
      setSheetHeight(selectedId ? PEEK_SELECTED : PEEK_DEFAULT);
    }
  }, [selectedId]);

  // Recalcular max en resize/orientation change.
  useEffect(() => {
    const onResize = () => {
      const newMax = Math.round(window.innerHeight * SHEET_RATIO);
      setSheetMax(newMax);
      // Si estaba expanded, ajustar al nuevo max.
      if (sheetExpandedRef.current) setSheetHeight(newMax);
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  const toggleSheet = useCallback(() => {
    setSheetExpanded((prev) => {
      const next = !prev;
      setSheetHeight(next ? sheetMax : (selectedId ? PEEK_SELECTED : PEEK_DEFAULT));
      return next;
    });
  }, [sheetMax, selectedId]);

  // Map instance (para FAB flyTo)
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);

  // Geolocation (auto-request on mount)
  const geo = useGeolocation({ autoRequest: true });
  const userCoords = useMemo(
    () =>
      geo.status === 'granted' && geo.coords
        ? { lat: geo.coords.lat, lon: geo.coords.lon }
        : null,
    [geo.status, geo.coords?.lat, geo.coords?.lon],
  );

  // Sort + filtros
  const sortedStores = useSortedStores({
    stores,
    userCoords,
    category,
    department,
    searchQuery,
  });

  const selectedStore = useMemo(
    () => (selectedId ? sortedStores.find((s) => s.id === selectedId) ?? null : null),
    [sortedStores, selectedId],
  );

  const clearFilters = useCallback(() => {
    setCategory('all');
    setDepartment('all');
    setSearchQuery('');
  }, []);

  // Conteo dinámico de talleres activos por categoría
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    stores.forEach((s) => {
      if (s.category) {
        const key = s.category.toLowerCase().trim();
        counts[key] = (counts[key] || 0) + 1;
      }
    });
    return counts;
  }, [stores]);

  // Categorías dinámicas desde la DB con conteo en vivo (filtrando las que tienen >= 1 taller para evitar filtros vacíos)
  const activeCategories = useMemo(() => {
    const source = categories && categories.length > 0 ? categories : MAP_CATEGORIES;
    return source
      .map((cat) => ({
        ...cat,
        count: categoryCounts[cat.slug.toLowerCase().trim()] || 0,
      }))
      .filter((cat) => (cat.count ?? 0) > 0);
  }, [categories, categoryCounts]);

  // FAB: si hay coords validas + mapa, flyTo; si no, retry request.
  // Defensiva: Number.isFinite evita pasar NaN a Leaflet si el cache
  // de sessionStorage quedo con coordenadas corruptas (raro pero pasa).
  const geoRequest = geo.request;
  const handleLocate = useCallback(() => {
    if (
      userCoords &&
      Number.isFinite(userCoords.lat) &&
      Number.isFinite(userCoords.lon) &&
      mapInstance
    ) {
      mapInstance.flyTo([userCoords.lat, userCoords.lon], 13, { duration: 1.0 });
    } else {
      geoRequest();
    }
  }, [userCoords, mapInstance, geoRequest]);

  // Manejo de cálculo de ruta interactiva
  const handleRequestRoute = useCallback(
    async (storeId: string) => {
      const targetStore = stores.find((s) => s.id === storeId);
      if (!targetStore) return;

      setSelectedId(storeId);

      // Colapsar suavemente el sheet en móviles a modo vista previa enfocada para priorizar el mapa
      setSheetExpanded(false);
      setSheetHeight(PEEK_SELECTED);

      // Si aún no tenemos permisos GPS, solicitarlos y avisar
      if (!userCoords) {
        geoRequest();
        setRouteError(i18n.routeNeedLocation);
        return;
      }

      setIsRouting(true);
      setRouteError(null);

      try {
        const route = await fetchRoute(userCoords, {
          lat: targetStore.location.lat,
          lon: targetStore.location.lon,
        });

        setActiveRoute({
          store: targetStore,
          route,
        });
      } catch (err: any) {
        console.error('Route calculation error:', err);
        setRouteError(i18n.routeError);
      } finally {
        setIsRouting(false);
      }
    },
    [stores, userCoords, geoRequest, i18n.routeNeedLocation, i18n.routeError],
  );

  const handleCloseRoute = useCallback(() => {
    setActiveRoute(null);
    setRouteError(null);
    setIsRouting(false);
  }, []);

  return (
    <div className="absolute inset-0 flex flex-col bg-fondo animate-in fade-in duration-300">
      {/* Spacer para el MapOverlayHeader (fixed top-0). Mantiene el TopBar
          debajo del header en vez de superponerse. h-14 = 56px, h-16 = 64px. */}
      <div className="h-14 md:h-16 flex-shrink-0" aria-hidden="true" />

      {/* Floating TopBar capsule en móvil y pinned strip en desktop (Stitch Design) */}
      <div className="
        absolute top-16 sm:top-[70px] inset-x-3 pointer-events-none z-[650]
        lg:static lg:w-full lg:flex-shrink-0 lg:pointer-events-auto
        lg:bg-blanco/95 lg:dark:bg-[#16202e]/95 lg:backdrop-blur-md
        lg:border-b lg:border-borde lg:dark:border-[#253346]
        lg:px-6 lg:py-2.5 lg:shadow-xs
      ">
        <MapTopBar
          categories={activeCategories}
          departments={DEPARTMENTS}
          category={category}
          department={department}
          searchQuery={searchQuery}
          activeCount={sortedStores.length}
          totalCount={stores.length}
          i18n={i18n}
          onCategoryChange={setCategory}
          onDepartmentChange={setDepartment}
          onSearchChange={setSearchQuery}
          onClearFilters={clearFilters}
        />
      </div>

      {/* Area principal: Dual-Pane en Desktop (Directorio Izq + Mapa Der) / Fullbleed en Móvil */}
      <div className="flex-1 relative flex flex-row overflow-hidden">
        {/* LEFT PANE: Directorio Maestro de Talleres (Desktop, hidden < lg) */}
        <MapSidebar
          stores={sortedStores}
          hoveredId={hoveredId}
          selectedId={selectedId}
          onHover={setHoveredId}
          onSelect={setSelectedId}
          onRequestRoute={handleRequestRoute}
          i18n={i18n}
          lang={lang}
          department={department}
          hasLocation={userCoords !== null}
          onClearFilters={clearFilters}
        />

        {/* RIGHT PANE: Canvas Geoespacial interactivo */}
        <div className="flex-1 h-full relative overflow-hidden">
          {/* Banner de estado geolocation posicionado sobre el canvas */}
          <GeoStatusBanner status={geo.status} i18n={i18n} onRetry={geo.request} />

          <MapCanvas
            stores={sortedStores}
            hoveredId={hoveredId}
            selectedId={selectedId}
            userCoords={userCoords}
            activeRoute={activeRoute}
            lang={lang}
            i18n={i18n}
            onMarkerHover={setHoveredId}
            onMarkerClick={setSelectedId}
            onRequestRoute={handleRequestRoute}
            onMapReady={setMapInstance}
            onLocate={handleLocate}
            geoPending={geo.status === 'pending'}
          />

          {/* Tarjeta flotante con vista previa del taller (desktop) o métricas de ruta activa */}
          <RouteInfoBanner
            selectedStore={selectedStore}
            activeRoute={activeRoute}
            isCalculating={isRouting}
            error={routeError}
            i18n={i18n}
            lang={lang}
            onRequestRoute={handleRequestRoute}
            onClose={handleCloseRoute}
            onClosePreview={() => setSelectedId(null)}
            sheetHeight={sheetHeight}
          />
        </div>

        {/* MOBILE BOTTOM SHEET: Hoja gestual para dispositivos móviles (lg:hidden) */}
        <MapBottomSheet
          stores={sortedStores}
          hoveredId={hoveredId}
          selectedId={selectedId}
          expanded={sheetExpanded}
          sheetHeight={sheetHeight}
          minHeight={currentPeek}
          maxHeight={sheetMax}
          onSheetHeightChange={setSheetHeight}
          onToggleExpanded={toggleSheet}
          onSetExpanded={setSheetExpanded}
          onHover={setHoveredId}
          onSelect={(id) => {
            setSelectedId(id ? id : null);
          }}
          onRequestRoute={handleRequestRoute}
          i18n={i18n}
          lang={lang}
          department={department}
          onClearFilters={clearFilters}
        />
      </div>
    </div>
  );
}

// =====================================================================
// GeoStatusBanner
// =====================================================================
// Banner sutil sobre el canvas cuando la geolocation fallo. Solo se
// muestra para denied / outOfNI / unsupported / error.
// =====================================================================

interface BannerProps {
  status: ReturnType<typeof useGeolocation>['status'];
  i18n: MapI18n;
  onRetry: () => void;
}

function GeoStatusBanner({ status, i18n, onRetry }: BannerProps) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed || status === 'granted' || status === 'idle' || status === 'pending') return null;

  let icon = <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />;
  let title: string | null = null;
  let description: string | null = null;
  let showRetry = false;

  switch (status) {
    case 'denied':
      title = i18n.geoDeniedTitle;
      description = i18n.geoDeniedDesc;
      showRetry = true;
      break;
    case 'outOfNI':
      icon = <MapPinOff className="size-4 shrink-0" aria-hidden="true" />;
      title = i18n.geoOutOfNITitle;
      description = i18n.geoOutOfNIDesc;
      break;
    case 'unsupported':
    case 'error':
      title = i18n.geoDeniedTitle;
      description = i18n.geoDeniedDesc;
      break;
  }

  if (!title) return null;

  return (
    <div
      role="status"
      className="absolute top-[112px] sm:top-[118px] left-3 right-3 lg:left-6 lg:right-auto lg:w-[480px] z-[640] max-w-md bg-blanco/95 dark:bg-[#16202e]/95 backdrop-blur-md border border-borde/80 dark:border-[#253346] rounded-xl shadow-modal px-3.5 py-2.5 flex items-start gap-2.5 transition-all animate-in fade-in slide-in-from-top-2 duration-300 pointer-events-auto"
    >
      <div className="text-primary mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs sm:text-sm font-semibold text-texto leading-tight">{title}</p>
        {description && (
          <p className="text-[11px] text-texto-secundario mt-0.5 leading-snug">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {showRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="flex items-center gap-1 px-2.5 h-7 rounded-lg text-[11px] font-semibold bg-primary text-primary-foreground hover:bg-primary-dark transition-colors cursor-pointer"
          >
            <RefreshCw className="size-3" aria-hidden="true" />
            <span>{i18n.geoDeniedRetry}</span>
          </button>
        )}
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Cerrar aviso"
          className="size-7 rounded-lg text-texto-secundario hover:text-texto hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
