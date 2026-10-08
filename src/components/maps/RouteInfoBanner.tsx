// =============================================================================
// RouteInfoBanner.tsx — Floating workshop preview & 1-tap route navigation.
// =============================================================================
// Design System: ArtesaNica Desktop & Mobile Map (Stitch: 7878142276432040368)
// States:
//   1. Preview State (selectedStore):
//      - Triggered when user clicks a marker or sidebar card on desktop
//      - Replaces the intrusive Leaflet popup with a clean floating card in the
//        bottom-left canvas area (Stitch lines 450-462)
//      - Shows workshop title, category, address, distance & status
//      - Two 1-tap triggers: "¿Cómo llegar?" (starts routing) and "Ver tienda"
//   2. Active Route State (activeRoute / isCalculating / error):
//      - Triggered when user clicks "¿Cómo llegar?"
//      - Computes route with OSRM and shows polyline
//      - Displays driving time, total distance, road traffic strip
//      - 1-Tap navigation launcher buttons: Google Maps & Waze GPS
// =============================================================================

import {
  Navigation,
  Clock,
  X,
  ExternalLink,
  Loader2,
  Compass,
  Car,
  Store,
  MapPin,
} from 'lucide-react';
import type { Lang } from '@/i18n/ui';
import type { ActiveRouteData, MapI18n, MapStore } from './mapShared';
import { formatDistance, formatDuration } from '@/lib/routing';
import { getStoreScheduleStatus } from '@/lib/geo/schedule';

interface Props {
  selectedStore?: MapStore | null;
  activeRoute: ActiveRouteData | null;
  isCalculating: boolean;
  error?: string | null;
  i18n: MapI18n;
  lang: Lang;
  onClose: () => void;
  onClosePreview?: () => void;
  onRequestRoute: (storeId: string) => void;
  sheetHeight?: number;
}

function storeHref(slug: string, lang: Lang): string {
  return lang === 'es' ? `/tiendas/${slug}` : `/${lang}/tiendas/${slug}`;
}

export default function RouteInfoBanner({
  selectedStore = null,
  activeRoute,
  isCalculating,
  error,
  i18n,
  lang,
  onClose,
  onClosePreview,
  onRequestRoute,
  sheetHeight = 125,
}: Props) {
  const hasRouteState = activeRoute !== null || isCalculating || !!error;
  const hasPreviewState = !hasRouteState && selectedStore !== null;
  const scheduleStatus = selectedStore ? getStoreScheduleStatus(selectedStore, undefined, lang) : null;

  if (!hasRouteState && !hasPreviewState) return null;

  return (
    <div
      role="region"
      aria-label={hasRouteState ? i18n.routeHowToGetThere : 'Detalle de taller seleccionado'}
      style={{
        '--sheet-bottom': `${sheetHeight + 12}px`,
      } as React.CSSProperties}
      className={`
        ${hasPreviewState ? 'hidden lg:block' : 'block'}
        fixed left-3 right-3 bottom-[var(--sheet-bottom)]
        lg:absolute lg:!bottom-6 lg:!left-6 lg:!right-auto lg:w-[440px]
        max-w-[calc(100vw-1.5rem)]
        z-[750] pointer-events-auto
        transition-[bottom] duration-300 ease-out animate-in fade-in slide-in-from-bottom-3
      `}
    >
      <div className="p-3.5 sm:p-4 rounded-2xl bg-blanco/95 dark:bg-[#16202e]/95 backdrop-blur-xl shadow-modal border border-borde/80 dark:border-[#253346] flex flex-col gap-3">
        {/* ============================================================= */}
        {/* STATE 1: WORKSHOP DESTINATION PREVIEW CARD (Stitch lines 450-462) */}
        {/* ============================================================= */}
        {hasPreviewState && selectedStore ? (
          <>
            {/* Top row: Workshop destination + close button */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex-shrink-0 flex items-center justify-center shadow-xs overflow-hidden">
                  {selectedStore.logoUrl ? (
                    <img
                      src={selectedStore.logoUrl}
                      alt={selectedStore.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <Store className="size-5" aria-hidden="true" />
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-primary leading-none">
                    {selectedStore.category
                      ? selectedStore.category.toUpperCase()
                      : 'TALLER ARTESANAL'}
                  </span>
                  <h2 className="text-sm sm:text-base font-bold text-texto truncate leading-tight mt-0.5">
                    {selectedStore.name}
                  </h2>
                  <p className="text-xs text-texto-secundario truncate mt-0.5">
                    {selectedStore.department || 'Nicaragua'}
                    {selectedStore.address_text ? ` · ${selectedStore.address_text}` : ''}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClosePreview || onClose}
                aria-label="Cerrar detalle de taller"
                title="Cerrar"
                className="size-8 rounded-full bg-slate-100 dark:bg-slate-800 text-texto-secundario hover:text-texto flex items-center justify-center transition-colors cursor-pointer shrink-0"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Middle row: Distance & Status strip */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/90 dark:bg-slate-800/60 border border-borde/50 dark:border-slate-700/50 text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-texto tabular-nums">
                <MapPin className="size-3.5 text-primary shrink-0" />
                <span>
                  {selectedStore.distanceKm != null
                    ? `${selectedStore.distanceKm.toFixed(1)} km ${i18n.fromYou}`
                    : selectedStore.department || 'Nicaragua'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {scheduleStatus?.isDemonstrative && (
                  <span className="px-2 py-0.5 rounded-md bg-secondary/10 text-secondary dark:text-secondary-light font-bold text-[10px]">
                    {i18n.demonstrativeWorkshop}
                  </span>
                )}
                {scheduleStatus && (
                  <span
                    className={`flex items-center gap-1.5 font-medium ${scheduleStatus.textColorClass}`}
                    title={`${scheduleStatus.nextChangeText} (${scheduleStatus.scheduleSummary})`}
                  >
                    <span className={`inline-block size-1.5 rounded-full ${scheduleStatus.dotColorClass}`} />
                    <span>{scheduleStatus.statusText}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Bottom row: Action Buttons (¿Cómo llegar? + Ver tienda) */}
            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <button
                type="button"
                onClick={() => onRequestRoute(selectedStore.id)}
                className="
                  min-h-[40px] px-3 rounded-xl
                  bg-primary hover:bg-primary-dark text-white font-semibold text-xs
                  flex items-center justify-center gap-1.5 shadow-xs
                  transition-all active:scale-[0.98] cursor-pointer
                "
              >
                <Navigation className="size-3.5" />
                <span>{i18n.routeHowToGetThere}</span>
              </button>

              <a
                href={storeHref(selectedStore.slug, lang)}
                className="
                  min-h-[40px] px-3 rounded-xl
                  bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700
                  text-texto font-semibold text-xs
                  flex items-center justify-center gap-1.5 shadow-xs
                  transition-all active:scale-[0.98]
                "
              >
                <Store className="size-3.5 text-texto-secundario" />
                <span>{i18n.viewStore}</span>
                <ExternalLink className="size-3 opacity-60" />
              </a>
            </div>
          </>
        ) : isCalculating ? (
          /* ============================================================= */
          /* STATE 2A: CALCULATING ROUTE                                   */
          /* ============================================================= */
          <div className="flex items-center gap-3 py-1">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 animate-pulse">
              <Loader2 className="size-5 animate-spin" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-texto leading-snug">
                {i18n.routeCalculating}
              </p>
              <p className="text-xs text-texto-secundario mt-0.5">
                {i18n.calculatingRouteDesc}
              </p>
            </div>
          </div>
        ) : error ? (
          /* ============================================================= */
          /* STATE 2B: ROUTE CALCULATION ERROR                             */
          /* ============================================================= */
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-error/10 text-error flex items-center justify-center flex-shrink-0 mt-0.5">
              <X className="size-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-texto leading-snug">
                {i18n.routeError}
              </p>
              <p className="text-xs text-texto-secundario mt-0.5">{error}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={i18n.routeClose}
              className="size-8 rounded-full bg-slate-100 dark:bg-slate-800 text-texto-secundario hover:text-texto flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="size-4" />
            </button>
          </div>
        ) : activeRoute ? (
          /* ============================================================= */
          /* STATE 2C: ACTIVE ROUTE SUMMARY WITH EXTERNAL GPS BUTTONS      */
          /* ============================================================= */
          <>
            {/* Top row: Workshop destination + close */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex-shrink-0 flex items-center justify-center shadow-xs">
                  <Car className="size-5" aria-hidden="true" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-primary leading-none">
                    {i18n.recommendedRoute}
                  </span>
                  <h2 className="text-sm sm:text-base font-bold text-texto truncate leading-tight mt-0.5">
                    {activeRoute.store.name}
                  </h2>
                  <p className="text-xs text-texto-secundario truncate mt-0.5">
                    {activeRoute.store.department || 'Nicaragua'}
                    {activeRoute.store.address_text ? ` · ${activeRoute.store.address_text}` : ''}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={i18n.routeClose}
                title={i18n.routeClose}
                className="size-8 rounded-full bg-slate-100 dark:bg-slate-800 text-texto-secundario hover:text-texto flex items-center justify-center transition-colors cursor-pointer shrink-0"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Middle row: Duration & Distance Metrics */}
            <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-50/90 dark:bg-slate-800/60 border border-borde/50 dark:border-slate-700/50">
              <div className="flex items-center gap-2 min-w-0">
                <Clock className="size-4 text-secondary shrink-0" aria-hidden="true" />
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] text-texto-secundario uppercase font-semibold leading-none truncate">
                    {i18n.routeDuration}
                  </span>
                  <span className="text-sm sm:text-base font-bold text-texto tabular-nums leading-tight mt-0.5 truncate">
                    {formatDuration(activeRoute.route.durationMinutes)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 min-w-0">
                <Navigation className="size-4 text-primary shrink-0" aria-hidden="true" />
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] text-texto-secundario uppercase font-semibold leading-none truncate">
                    {i18n.routeDistance}
                  </span>
                  <span className="text-sm sm:text-base font-bold text-texto tabular-nums leading-tight mt-0.5 truncate">
                    {formatDistance(activeRoute.route.distanceKm)}
                  </span>
                </div>
              </div>
            </div>

            {/* Live Traffic & Advisory Strip */}
            <div className="flex items-center justify-between text-xs text-texto-secundario px-0.5">
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                <span className="inline-block size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Carretera fluida sin retenciones</span>
              </span>
              <span className="font-semibold tabular-nums text-[11px] text-texto-secundario">
                Ruta directa
              </span>
            </div>

            {/* Bottom row: 1-Tap Navigation Launchers (Google Maps & Waze) */}
            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <a
                href={activeRoute.route.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="
                  min-h-[40px] px-3 rounded-xl
                  bg-primary text-primary-foreground font-semibold text-xs
                  flex items-center justify-center gap-1.5 shadow-xs
                  hover:bg-primary-dark active:scale-[0.98] transition-all
                "
              >
                <Compass className="size-3.5" aria-hidden="true" />
                <span>{i18n.routeGoogleMaps}</span>
                <ExternalLink className="size-3 opacity-75" aria-hidden="true" />
              </a>

              <a
                href={activeRoute.route.wazeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="
                  min-h-[40px] px-3 rounded-xl
                  bg-secondary text-secondary-foreground font-semibold text-xs
                  flex items-center justify-center gap-1.5 shadow-xs
                  hover:bg-secondary-dark active:scale-[0.98] transition-all
                "
              >
                <Navigation className="size-3.5" aria-hidden="true" />
                <span>{i18n.routeWaze}</span>
                <ExternalLink className="size-3 opacity-75" aria-hidden="true" />
              </a>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
