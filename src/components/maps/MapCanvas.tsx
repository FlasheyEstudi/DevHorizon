// =============================================================================
// MapCanvas.tsx — Leaflet map with branded store markers and popups.
// =============================================================================
// Responsabilidad: solo el mapa. No maneja filtros (vienen del padre),
// no maneja sort (idem). Solo:
//   - TileLayer OSM
//   - MarkerClusterGroup con iconCreateFunction custom (color primary)
//   - Marker por store con divIcon custom + ping si highlighted
//   - Popup rediseñado (StorePopup)
// Bidireccionalidad con el padre:
//   - hoveredId / selectedId recibidos como props
//   - onMarkerHover / onMarkerClick emitidos via callbacks
// =============================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';

if (typeof window !== 'undefined' && !(window as any).L) {
  (window as any).L = L;
}

import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet/dist/leaflet.css';
import type { } from 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

import type { Lang } from '@/i18n/ui';
import { isValidLocation } from '@/lib/geo';
import { Plus, Minus, Layers, Crosshair, Check, Loader2 } from 'lucide-react';
import {
  createStoreIcon,
  createClusterIcon,
  createUserLocationIcon,
  type MarkerVisualState,
} from './storeIcon';
import type { ActiveRouteData, MapI18n, MapStore } from './mapShared';

const CENTER: [number, number] = [12.865, -85.207];

interface Props {
  stores: MapStore[];
  hoveredId: string | null;
  selectedId: string | null;
  userCoords: { lat: number; lon: number } | null;
  activeRoute?: ActiveRouteData | null;
  lang: Lang;
  i18n: MapI18n;
  onMarkerHover: (id: string | null) => void;
  onMarkerClick: (id: string) => void;
  onRequestRoute?: (storeId: string) => void;
  /** Recibe la instancia del mapa para que el padre pueda llamar flyTo. */
  onMapReady?: (map: L.Map | null) => void;
  onLocate?: () => void;
  geoPending?: boolean;
}

interface FloatingControlsProps {
  onLocate?: () => void;
  geoPending?: boolean;
  hasLocation?: boolean;
  layerMode: 'streets' | 'satellite';
  onToggleLayer: () => void;
  locateLabel: string;
}

/** Controles verticales: Recenter GPS, Zoom (+/-), Capas & Rosa de los vientos (Stitch Desktop Design) */
function MapFloatingControls({
  onLocate,
  geoPending = false,
  hasLocation = false,
  layerMode,
  onToggleLayer,
  locateLabel,
}: FloatingControlsProps) {
  const map = useMap();
  const [justLocated, setJustLocated] = useState(false);

  const handleLocateClick = () => {
    if (onLocate) {
      onLocate();
      if (hasLocation) {
        setJustLocated(true);
        setTimeout(() => setJustLocated(false), 1500);
      }
    }
  };

  return (
    <div
      role="group"
      aria-label="Controles del mapa"
      className="
        absolute z-[750] right-3 top-28 sm:top-32
        lg:right-6 lg:top-6
        flex flex-col gap-2.5 items-end select-none pointer-events-auto
      "
    >
      {/* 1. Desktop Layer Switcher Card (Stitch lines 414-427) */}
      <div className="hidden lg:flex flex-col gap-1 p-1 rounded-2xl bg-blanco/95 dark:bg-[#16202e]/95 backdrop-blur-md shadow-card border border-borde/80 dark:border-[#253346]">
        <button
          type="button"
          onClick={() => {
            if (layerMode !== 'streets') onToggleLayer();
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${layerMode === 'streets'
            ? 'bg-primary/10 dark:bg-primary/20 text-primary font-bold shadow-xs'
            : 'text-texto-secundario hover:text-texto hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
        >
          <Layers className="size-3.5" />
          <span>Rutas Artesanales</span>
        </button>
        <button
          type="button"
          onClick={() => {
            if (layerMode !== 'satellite') onToggleLayer();
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${layerMode === 'satellite'
            ? 'bg-primary/10 dark:bg-primary/20 text-primary font-bold shadow-xs'
            : 'text-texto-secundario hover:text-texto hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
        >
          <Layers className="size-3.5 text-secondary" />
          <span>Satélite Real</span>
        </button>
      </div>

      {/* 2. Mobile Compact Layer Toggle Button (< lg) */}
      <button
        type="button"
        onClick={onToggleLayer}
        aria-label={layerMode === 'streets' ? 'Cambiar a vista satelital' : 'Cambiar a vista callejero'}
        title={layerMode === 'streets' ? 'Vista Satelital' : 'Vista Callejero'}
        className={`
          lg:hidden size-10 rounded-xl bg-blanco/95 dark:bg-[#16202e]/95 backdrop-blur-md
          shadow-card hover:shadow-card-hover border border-borde/80 dark:border-[#253346]
          flex items-center justify-center active:scale-95 transition-all cursor-pointer
          ${layerMode === 'satellite' ? 'text-primary ring-2 ring-primary/40' : 'text-texto hover:bg-slate-100 dark:hover:bg-slate-800'}
        `}
      >
        <Layers className="size-4" />
      </button>

      {/* 3. Zoom Controls Group */}
      <div className="flex flex-col rounded-xl bg-blanco/95 dark:bg-[#16202e]/95 backdrop-blur-md shadow-card border border-borde/80 dark:border-[#253346] overflow-hidden">
        <button
          type="button"
          onClick={() => map.zoomIn()}
          aria-label="Acercar mapa"
          title="Acercar"
          className="size-10 flex items-center justify-center text-texto hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border-b border-borde/60 dark:border-[#253346] active:scale-95 cursor-pointer"
        >
          <Plus className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => map.zoomOut()}
          aria-label="Alejar mapa"
          title="Alejar"
          className="size-10 flex items-center justify-center text-texto hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors active:scale-95 cursor-pointer"
        >
          <Minus className="size-4" />
        </button>
      </div>

      {/* 4. Recenter GPS FAB (Stitch lines 439-441) */}
      {onLocate && (
        <button
          type="button"
          onClick={handleLocateClick}
          disabled={geoPending}
          aria-label={locateLabel}
          title={locateLabel}
          className="
            size-11 rounded-full bg-primary hover:bg-primary-dark
            text-primary-foreground flex items-center justify-center
            shadow-md transition-all active:scale-95 cursor-pointer
            disabled:opacity-60 disabled:cursor-wait group
          "
        >
          {geoPending ? (
            <Loader2 className="size-5 animate-spin text-primary-foreground" />
          ) : justLocated ? (
            <Check className="size-5 text-white animate-in zoom-in-75 duration-200" />
          ) : (
            <Crosshair className="size-5 group-hover:rotate-45 transition-transform" />
          )}
        </button>
      )}

    </div>
  );
}

/** Observa cambios en el tamaño del contenedor del mapa y llama a invalidateSize() */
function MapResizeWatcher() {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    if (!container || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(() => {
      map.invalidateSize();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [map]);
  return null;
}

/** Componente interno que ajusta los limites del mapa al trazado de la ruta activa. */
function RouteBoundsFitter({ activeRoute }: { activeRoute?: ActiveRouteData | null }) {
  const map = useMap();
  useEffect(() => {
    if (!activeRoute || activeRoute.route.coordinates.length === 0) return;
    try {
      const bounds = L.latLngBounds(activeRoute.route.coordinates);
      map.fitBounds(bounds, { padding: [80, 80], maxZoom: 15 });
    } catch (e) {
      console.error('Failed to fit route bounds', e);
    }
  }, [activeRoute, map]);
  return null;
}

/** Componente interno que expone la instancia L.Map al padre via callback. */
function MapReadyHandler({ onMapReady }: { onMapReady?: (map: L.Map | null) => void }) {
  const map = useMap();
  useEffect(() => {
    if (onMapReady) onMapReady(map);
    return () => {
      if (onMapReady) onMapReady(null);
    };
  }, [map, onMapReady]);
  return null;
}

/**
 * Efecto que centra el mapa en userCoords al tenerlo disponible.
 * Se monta una vez; no se vuelve a centrar en updates posteriores
 * (para no "robar" el zoom que el usuario haya hecho).
 *
 * Validacion defensiva: si las coords no son numeros finitos (NaN por
 * GPS degradado o cache corrupto), saltea el flyTo para no romper
 * Leaflet con "Invalid LatLng object: (NaN, NaN)".
 */
function FlyToUserOnFirstGrant({ coords }: { coords: { lat: number; lon: number } | null }) {
  const map = useMap();
  const centeredRef = useRef(false);
  useEffect(() => {
    if (!coords) {
      centeredRef.current = false;
      return;
    }
    if (centeredRef.current) return;
    if (!Number.isFinite(coords.lat) || !Number.isFinite(coords.lon)) return;
    centeredRef.current = true;
    map.flyTo([coords.lat, coords.lon], 11, { duration: 1.2 });
  }, [coords, map]);
  return null;
}

export default function MapCanvas({
  stores,
  hoveredId,
  selectedId,
  userCoords,
  activeRoute,
  i18n,
  onMarkerHover,
  onMarkerClick,
  onMapReady,
  onLocate,
  geoPending = false,
}: Props) {
  const [layerMode, setLayerMode] = useState<'streets' | 'satellite'>('streets');
  const toggleLayer = useCallback(() => {
    setLayerMode((prev) => (prev === 'streets' ? 'satellite' : 'streets'));
  }, []);

  const markerRefs = useRef<Map<string, L.Marker>>(new Map());
  const mapRef = useRef<L.Map | null>(null);
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);

  // Filtrar Null Island defensivamente (aunque SSR ya filtro).
  const validStores = useMemo(
    () => stores.filter((s) => isValidLocation(s.location)),
    [stores],
  );

  // Cuando selectedId cambia desde fuera: centrar suavemente en el marcador.
  useEffect(() => {
    if (!selectedId) return;
    const marker = markerRefs.current.get(selectedId);
    const map = mapRef.current;
    const cluster = clusterRef.current;
    if (!marker || !map) return;
    const store = validStores.find((s) => s.id === selectedId);
    if (!store) return;

    // Caso 1: el marker esta visible (no esta dentro de un cluster).
    const isInCluster = cluster && cluster.hasLayer(marker);

    if (!isInCluster) {
      map.flyTo(
        [store.location.lat, store.location.lon],
        Math.max(map.getZoom(), 13),
        { duration: 0.8 },
      );
      return;
    }

    // Caso 2: el marker esta dentro de un cluster. Usar zoomToShowLayer
    if (cluster) {
      cluster.zoomToShowLayer(marker);
    } else {
      map.flyTo(
        [store.location.lat, store.location.lon],
        Math.max(map.getZoom(), 15),
        { duration: 0.8 },
      );
    }
  }, [selectedId, validStores]);

  const handleMapReady = useCallback((map: L.Map | null) => {
    mapRef.current = map;
    if (onMapReady) onMapReady(map);
  }, [onMapReady]);

  // -------------------------------------------------------------------
  // Estabilizar iconos por store con soporte ternario (normal, hover, selected)
  // y limpieza de memoria cuando cambian los filtros (P-2).
  // -------------------------------------------------------------------
  const iconCache = useRef<Map<string, { state: MarkerVisualState; icon: L.DivIcon }>>(new Map());
  useEffect(() => {
    const validIds = new Set(validStores.map((s) => s.id));
    for (const id of iconCache.current.keys()) {
      if (!validIds.has(id)) iconCache.current.delete(id);
    }
  }, [validStores]);

  const getIcon = useCallback((storeId: string, name: string, category: string | undefined, logoUrl: string | undefined, visualState: MarkerVisualState): L.DivIcon => {
    const cached = iconCache.current.get(storeId);
    if (cached && cached.state === visualState) return cached.icon;
    const icon = createStoreIcon(visualState, name, category, logoUrl);
    iconCache.current.set(storeId, { state: visualState, icon });
    return icon;
  }, []);

  // Estabilizar cluster icon creator.
  const createClusterCustomIcon = useCallback((cluster: L.MarkerCluster) => {
    return createClusterIcon(cluster.getChildCount());
  }, []);

  // Handlers de cada marker estabilizados mediante refs y cache de handlers
  // para evitar rebind de Leaflet event listeners en cada render.
  const onMarkerClickRef = useRef(onMarkerClick);
  onMarkerClickRef.current = onMarkerClick;
  const onMarkerHoverRef = useRef(onMarkerHover);
  onMarkerHoverRef.current = onMarkerHover;

  const handlersRef = useRef<Map<string, { click: () => void; mouseover: () => void; mouseout: () => void }>>(new Map());

  const getMarkerHandlers = useCallback((id: string) => {
    let handlers = handlersRef.current.get(id);
    if (!handlers) {
      handlers = {
        click: () => onMarkerClickRef.current(id),
        mouseover: () => onMarkerHoverRef.current(id),
        mouseout: () => onMarkerHoverRef.current(null),
      };
      handlersRef.current.set(id, handlers);
    }
    return handlers;
  }, []);

  // -------------------------------------------------------------------
  // Hover highlighting via direct DOM class toggle.
  // Changing the DivIcon on hover caused a visual flash: Leaflet's
  // createIcon re-sets innerHTML, destroying/recreating the inner
  // .map-marker div and replaying CSS transitions from initial state.
  // By toggling the class directly we skip the innerHTML churn.
  // -------------------------------------------------------------------
  useEffect(() => {
    for (const [id, marker] of markerRefs.current) {
      const el = marker.getElement();
      if (!el) continue;
      const inner = el.querySelector('.map-marker') as HTMLElement | null;
      if (!inner) continue;
      // Selected markers own their highlight via icon HTML — don't touch.
      if (inner.classList.contains('is-selected')) continue;
      if (id === hoveredId) {
        inner.classList.add('is-highlighted');
      } else {
        inner.classList.remove('is-highlighted');
      }
    }
  }, [hoveredId]);

  // -------------------------------------------------------------------
  // Memoize all <Marker> elements so they only re-create when the store
  // list or selection changes — NOT on every hoveredId change.
  //
  // Without this, every hover triggers a React re-render of all markers.
  // react-leaflet sees the new position array reference
  // ([lat, lon] !== prev [lat, lon]) and calls marker.setLatLng(),
  // which fires a `move` event. The cluster group's _moveChild then
  // does removeLayer + addLayer, closing any open popup (flash).
  // -------------------------------------------------------------------
  const markerElements = useMemo(() =>
    validStores.map((store) => {
      const isSelected = selectedId === store.id;
      // Hover highlighting is handled via CSS class toggle (useEffect
      // above) to avoid icon replacement flash. Only selected state
      // swaps the icon.
      const visualState: MarkerVisualState = isSelected ? 'selected' : 'normal';
      const icon = getIcon(store.id, store.name, store.category, store.logoUrl, visualState);

      return (
        <Marker
          key={store.id}
          position={[store.location.lat, store.location.lon]}
          icon={icon}
          eventHandlers={getMarkerHandlers(store.id)}
        />
      );
    }),
    // hoveredId is intentionally excluded — hover is handled via DOM class toggle
    [validStores, selectedId, getIcon, getMarkerHandlers],
  );

  // Sync markerRefs from Marker instances after they mount.
  // We observe the cluster group's layers instead of using inline ref
  // callbacks (which would break the useMemo since a new function ref
  // means a new JSX element every render).
  useEffect(() => {
    const cluster = clusterRef.current;
    if (!cluster) return;

    // Clean stale refs
    const validIds = new Set(validStores.map((s) => s.id));
    for (const id of markerRefs.current.keys()) {
      if (!validIds.has(id)) markerRefs.current.delete(id);
    }

    // Populate refs by matching cluster layers to store positions
    cluster.eachLayer((layer: L.Layer) => {
      const marker = layer as L.Marker;
      const latlng = marker.getLatLng();
      for (const store of validStores) {
        if (latlng.lat === store.location.lat && latlng.lng === store.location.lon) {
          markerRefs.current.set(store.id, marker);
          break;
        }
      }
    });
  }, [validStores, markerElements]);

  return (
    <MapContainer
      center={CENTER}
      zoom={7}
      minZoom={6}
      maxZoom={18}
      scrollWheelZoom
      zoomControl={false}
      className="h-full w-full bg-[#f2efe9] dark:bg-[#1a1f2c]"
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        key={layerMode}
        url={
          layerMode === 'streets'
            ? 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
            : 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        }
        attribution={
          layerMode === 'streets'
            ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            : 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics'
        }
        maxNativeZoom={layerMode === 'streets' ? 19 : 18}
        maxZoom={18}
        keepBuffer={4}
      />

      <MapReadyHandler onMapReady={handleMapReady} />
      <MapResizeWatcher />
      <FlyToUserOnFirstGrant coords={userCoords} />
      <MapFloatingControls
        onLocate={onLocate}
        geoPending={geoPending}
        hasLocation={userCoords !== null}
        layerMode={layerMode}
        onToggleLayer={toggleLayer}
        locateLabel={i18n.fabLocate}
      />

      {/* Indicador de posición GPS del usuario */}
      {userCoords && Number.isFinite(userCoords.lat) && Number.isFinite(userCoords.lon) && (
        <Marker
          position={[userCoords.lat, userCoords.lon]}
          icon={createUserLocationIcon()}
          interactive={false}
        />
      )}

      {/* Trazado interactivo de ruta por carretera */}
      {activeRoute && activeRoute.route.coordinates.length > 0 && (
        <>
          {/* Halo blanco exterior para visibilidad sobre cualquier fondo */}
          <Polyline
            positions={activeRoute.route.coordinates}
            pathOptions={{
              color: '#ffffff',
              weight: 8,
              opacity: 0.9,
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
          {/* Línea principal en terracota artesanal */}
          <Polyline
            positions={activeRoute.route.coordinates}
            pathOptions={{
              color: '#C85A32',
              weight: 5,
              opacity: 0.95,
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
        </>
      )}

      {/* Auto-enfoque de cámara para abarcar origen y destino */}
      <RouteBoundsFitter activeRoute={activeRoute} />

      <MarkerClusterGroup
        ref={clusterRef}
        chunkedLoading
        iconCreateFunction={createClusterCustomIcon}
        maxClusterRadius={50}
        spiderfyOnMaxZoom
        showCoverageOnHover={false}
        zoomToBoundsOnClick
      >
        {markerElements}
      </MarkerClusterGroup>
    </MapContainer>
  );
}
