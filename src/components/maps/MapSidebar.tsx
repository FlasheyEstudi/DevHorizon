// =============================================================================
// MapSidebar.tsx — Desktop Master Workshop Directory (lg+).
// =============================================================================
// Design System: ArtesaNica Desktop Map (Stitch: 7878142276432040368 / 7604dc6d)
// Features:
//   - Left-docked Master Directory pane (380px - 420px)
//   - Directory header: Dynamic regional title, artisanal subtitle, list/grid toggle,
//     distance sorting indicator & active results counter pill
//   - Dual-state workshop cards stream:
//     * Prominent Selected Card: "Destino en Ruta" badge, terracotta accent ring,
//       thumbnail with generation badge, star rating, status, excerpt, and 1-tap actions
//       (Iniciar Ruta, Ver catálogo / tienda, Compartir)
//     * Regular Workshop Cards: hover polish, thumbnail, category badge, distance,
//       rating, and "Ver detalle ↗" trigger
//   - Auto-scroll sync: marker click on map smoothly scrolls to card in stream
//   - Bottom offline data indicator strip
// =============================================================================

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  MapPin,
  Navigation,
  Star,
  List,
  LayoutGrid,
  Store,
  Share2,
  Check,
  Award,
} from 'lucide-react';
import clsx from 'clsx';
import type { Lang } from '@/i18n/ui';
import type { MapI18n, MapStore } from './mapShared';
import { getStoreScheduleStatus } from '@/lib/geo/schedule';
import MapEmptyState from './MapEmptyState';

interface Props {
  stores: MapStore[];
  hoveredId: string | null;
  selectedId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  lang: Lang;
  i18n: MapI18n;
  department?: string | 'all';
  hasLocation?: boolean;
  onClearFilters?: () => void;
  onRequestRoute?: (storeId: string) => void;
}

function storeHref(slug: string, lang: Lang): string {
  return lang === 'es' ? `/tiendas/${slug}` : `/${lang}/tiendas/${slug}`;
}

/** Genera subtitulo evocador segun el departamento seleccionado */
function getDepartmentSubtitle(dept: string | 'all'): string {
  switch (dept) {
    case 'Masaya':
      return 'Pueblos Blancos & Laguna de Apoyo';
    case 'Granada':
      return 'Isletas & Tradición Colonial';
    case 'León':
      return 'Filigrana, Platería y Tradición';
    case 'Estelí':
      return 'Marmolina, Barro Negro y Miraflor';
    case 'Matagalpa':
      return 'Café, Cerámica Negra y Neblina';
    case 'Managua':
      return 'Talleres Urbanos y Artesanías del Pacífico';
    case 'Rivas':
      return 'Maderas del Sur y Brisa Marina';
    default:
      return 'Rutas artesanales';
  }
}

export default function MapSidebar({
  stores,
  hoveredId,
  selectedId,
  onHover,
  onSelect,
  i18n,
  lang,
  department = 'all',
  hasLocation = false,
  onClearFilters,
  onRequestRoute,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Auto-scroll al item seleccionado (cuando se hace clic en el marker del mapa).
  useLayoutEffect(() => {
    if (!selectedId || !selectedRef.current || !containerRef.current) return;
    selectedRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [selectedId]);

  // Persistir posicion del scroll a traves de view-transitions o recargas
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const saved = Number(sessionStorage.getItem('artesa-map-sidebar-scroll') ?? '0');
    if (saved > 0) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (containerRef.current) {
            containerRef.current.scrollTop = saved;
          }
        });
      });
    }

    let scrollTimer: number | undefined;
    const onScroll = () => {
      if (scrollTimer !== undefined) clearTimeout(scrollTimer);
      scrollTimer = window.setTimeout(() => {
        try {
          sessionStorage.setItem('artesa-map-sidebar-scroll', String(el.scrollTop));
        } catch {
          /* sessionStorage disabled */
        }
      }, 150);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      if (scrollTimer !== undefined) clearTimeout(scrollTimer);
      el.removeEventListener('scroll', onScroll);
    };
  }, []);

  const handleShare = async (store: MapStore, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}${storeHref(store.slug, lang)}`;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: store.name,
          text: `Conoce ${store.name} en el Mapa Artesanal de ArtesaNica`,
          url,
        });
        return;
      } catch {
        /* usuario canceló o error de share nativo */
      }
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(url);
        setCopiedId(store.id);
        setTimeout(() => setCopiedId(null), 2000);
      } catch {
        /* fallback silencioso */
      }
    }
  };

  const headerTitle =
    department && department !== 'all'
      ? `${i18n.workshopsIn} ${department}`
      : i18n.directoryTitle;
  const headerSubtitle = getDepartmentSubtitle(department);

  return (
    <aside
      className="
        hidden lg:flex flex-col
        w-95 xl:w-105 shrink-0 h-full
        bg-blanco/95 dark:bg-[#16202e]/95 backdrop-blur-md
        border-r border-borde dark:border-[#253346] shadow-[4px_0_24px_rgba(0,0,0,0.06)]
        z-[500] overflow-hidden select-none
      "
      aria-label={i18n.directoryTitle}
    >
      {/* 1. Directory Control Header (Stitch lines 68-90) */}
      <div className="p-4 bg-blanco/80 dark:bg-[#16202e]/80 border-b border-borde/70 dark:border-[#253346] flex flex-col gap-2 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex flex-col min-w-0 pr-2">
            <h2 className="font-bold text-base text-primary tracking-tight truncate">
              {headerTitle}
            </h2>
            <p className="text-xs text-texto-secundario truncate mt-0.5">
              {headerSubtitle}
            </p>
          </div>

          {/* Toggle Vista Lista / Cuadricula */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              title={i18n.listView}
              aria-label={i18n.listView}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${viewMode === 'list'
                ? 'bg-blanco dark:bg-slate-700 text-primary shadow-xs'
                : 'text-texto-secundario hover:text-texto'
                }`}
            >
              <List className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              title={i18n.gridView}
              aria-label={i18n.gridView}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${viewMode === 'grid'
                ? 'bg-blanco dark:bg-slate-700 text-primary shadow-xs'
                : 'text-texto-secundario hover:text-texto'
                }`}
            >
              <LayoutGrid className="size-4" />
            </button>
          </div>
        </div>

        {/* Subrow: Orden de clasificacion & Contador de resultados */}
        <div className="flex items-center justify-between pt-1 text-xs text-texto-secundario">
          <span className="flex items-center gap-1">
            <Navigation className="size-3 text-secondary" />
            <span>
              {hasLocation ? i18n.nearestOrder : i18n.alphabeticalOrder}
            </span>
          </span>
          <span className="px-2 py-0.5 rounded-full bg-primary/10 dark:bg-primary/20 text-primary font-bold tabular-nums text-[11px]">
            {stores.length} {i18n.foundCount}
          </span>
        </div>
      </div>

      {/* 2. Scrollable Cards Stream (Stitch lines 91-259) */}
      <div
        ref={containerRef}
        role="feed"
        aria-label="Lista de talleres artesanales"
        className={`flex-1 overflow-y-auto p-3.5 scroll-smooth ${viewMode === 'grid'
          ? 'grid grid-cols-2 gap-2.5 content-start'
          : 'flex flex-col gap-3.5'
          }`}
      >
        {stores.length === 0 ? (
          <div className={viewMode === 'grid' ? 'col-span-2' : ''}>
            <MapEmptyState
              message={i18n.noResults}
              clearLabel={i18n.clearFilters}
              onClearFilters={onClearFilters}
            />
          </div>
        ) : (
          stores.map((store) => {
            const isHovered = hoveredId === store.id;
            const isSelected = selectedId === store.id;
            const scheduleStatus = getStoreScheduleStatus(store, undefined, lang);

            // Métricas calculadas desde view_stores_directory
            const hasReviews = (store.total_reviews ?? 0) > 0;
            const ratingScore = hasReviews
              ? (store.rating_avg ?? 0).toFixed(1)
              : null;
            const reviewsCount = store.total_reviews ?? 0;
            const totalProducts = store.total_products ?? 0;
            const categoryBadge = store.category
              ? store.category.toUpperCase()
              : (i18n.workshopSingle || 'TALLER ARTESANAL').toUpperCase();

            // CARD 1: ACTIVE / SELECTED WORKSHOP CARD (Stitch lines 93-143)
            if (isSelected) {
              return (
                <div
                  key={store.id}
                  ref={selectedRef}
                  role="article"
                  aria-current="true"
                  onMouseEnter={() => onHover(store.id)}
                  onMouseLeave={() => onHover(null)}
                  className={`
                    relative rounded-2xl bg-blanco dark:bg-[#1e293b] p-3.5
                    shadow-md ring-2 ring-primary transition-all
                    ${viewMode === 'grid' ? 'col-span-2' : ''}
                  `}
                >
                  {/* Floating Destino en Ruta Badge */}
                  <div className="absolute -top-2.5 right-3 bg-primary text-primary-foreground px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-sm">
                    <Navigation className="size-3" />
                    <span>{i18n.routeDestination}</span>
                  </div>

                  <div className="flex gap-3 items-start">
                    {/* Thumbnail con badge de generacion */}
                    <div className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0 shadow-inner bg-slate-100 dark:bg-slate-800">
                      {store.logoUrl ? (
                        <img
                          src={store.logoUrl}
                          alt={store.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-primary/60">
                          <MapPin className="size-8" />
                        </div>
                      )}
                      <div className="absolute bottom-1 right-1 bg-blanco/95 dark:bg-[#16202e]/95 backdrop-blur-xs text-primary px-1.5 py-0.5 rounded text-[9px] font-bold shadow-xs">
                        {scheduleStatus.isDemonstrative ? i18n.demonstrative : i18n.masterWorkshop}
                      </div>
                    </div>

                    {/* Metadata Header */}
                    <div className="flex-1 min-w-0 flex flex-col">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-primary truncate">
                          {categoryBadge}
                        </span>
                        {hasReviews ? (
                          <span className="flex items-center gap-0.5 text-[11px] font-bold text-amber-800 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-950/60 px-1.5 py-0.5 rounded-md shrink-0">
                            <Star className="size-3 fill-amber-500 text-amber-500" />
                            <span>{ratingScore}</span>
                            <span className="text-texto-secundario font-normal text-[10px]">
                              ({reviewsCount})
                            </span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md shrink-0">
                            <span>{totalProducts > 0 ? `${totalProducts} ${totalProducts === 1 ? i18n.pieceSingle : i18n.piecePlural}` : i18n.certifiedWorkshop}</span>
                          </span>
                        )}
                      </div>

                      <h3 className="font-bold text-sm sm:text-base text-texto tracking-tight mt-0.5 truncate leading-snug">
                        {store.name}
                      </h3>

                      <p className="text-xs text-texto-secundario flex items-center gap-1 truncate mt-0.5">
                        <MapPin className="size-3.5 text-secondary shrink-0" />
                        <span className="truncate">
                          {store.address_text || store.department || 'Nicaragua'}
                        </span>
                      </p>

                      <div className="mt-1 flex items-center gap-1.5 text-xs flex-wrap">
                        {store.distanceKm != null && (
                          <>
                            <span className="text-primary font-bold tabular-nums">
                              {store.distanceKm.toFixed(1)} km
                            </span>
                            <span className="text-texto-secundario">·</span>
                          </>
                        )}
                        <span className={clsx("font-medium flex items-center gap-1", scheduleStatus.textColorClass)}>
                          <span className={clsx("inline-block size-1.5 rounded-full shrink-0", scheduleStatus.dotColorClass)} />
                          <span>{scheduleStatus.statusText}</span>
                        </span>
                        <span className="text-texto-secundario/60">·</span>
                        <span className="text-texto-secundario truncate">{scheduleStatus.nextChangeText}</span>
                      </div>
                    </div>
                  </div>

                  {/* Reseña / Descripcion */}
                  <p className="mt-2.5 text-xs text-texto-secundario line-clamp-2 leading-relaxed">
                    {store.description || 'Especialistas en técnicas artesanales tradicionales y preservación de la herencia cultural nicaragüense.'}
                  </p>

                  {/* Fila de acciones (Stitch lines 131-142) */}
                  <div className="mt-3 pt-2.5 border-t border-borde/60 dark:border-slate-700/60 flex items-center gap-2">
                    {onRequestRoute && (
                      <button
                        type="button"
                        onClick={() => onRequestRoute(store.id)}
                        className="
                          flex-1 py-2 px-3 rounded-xl bg-primary hover:bg-primary-dark
                          text-primary-foreground text-xs font-semibold
                          flex items-center justify-center gap-1.5 shadow-sm
                          transition-transform active:scale-95 cursor-pointer
                        "
                      >
                        <Navigation className="size-3.5" />
                        <span>{i18n.startRoute}</span>
                      </button>
                    )}

                    <a
                      href={storeHref(store.slug, lang)}
                      title="Ver catálogo y perfil"
                      aria-label={`Ver perfil de ${store.name}`}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-texto-secundario hover:text-texto transition-colors"
                    >
                      <Store className="size-4" />
                    </a>

                    <button
                      type="button"
                      onClick={(e) => handleShare(store, e)}
                      title="Compartir taller"
                      aria-label={`Compartir ${store.name}`}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-texto-secundario hover:text-texto transition-colors cursor-pointer"
                    >
                      {copiedId === store.id ? (
                        <Check className="size-4 text-emerald-500" />
                      ) : (
                        <Share2 className="size-4" />
                      )}
                    </button>
                  </div>
                </div>
              );
            }

            // CARD 2: GRID VIEW (Compact 2-column card)
            if (viewMode === 'grid') {
              return (
                <div
                  key={store.id}
                  role="article"
                  onMouseEnter={() => onHover(store.id)}
                  onMouseLeave={() => onHover(null)}
                  onClick={() => onSelect(store.id)}
                  className={`
                    group rounded-2xl bg-blanco dark:bg-[#1e293b] p-2.5
                    border transition-all cursor-pointer flex flex-col justify-between
                    ${isHovered
                      ? 'border-primary/60 shadow-md translate-y-[-1px]'
                      : 'border-borde/70 dark:border-[#253346] shadow-xs hover:shadow-sm'
                    }
                  `}
                >
                  <div className="flex flex-col">
                    {/* Imagen superior con badges flotantes */}
                    <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 shadow-inner">
                      {store.logoUrl ? (
                        <img
                          src={store.logoUrl}
                          alt={store.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-texto-secundario">
                          <MapPin className="size-8 text-primary/40" />
                        </div>
                      )}
                      <span className="absolute top-1.5 left-1.5 text-[8px] font-bold uppercase tracking-wider text-secondary bg-blanco/95 dark:bg-[#16202e]/95 backdrop-blur-xs px-1.5 py-0.5 rounded shadow-xs max-w-[70%] truncate">
                        {categoryBadge}
                      </span>
                      <span className="absolute top-1.5 right-1.5 text-[9px] font-bold text-amber-700 dark:text-amber-300 bg-blanco/95 dark:bg-[#16202e]/95 backdrop-blur-xs px-1.5 py-0.5 rounded shadow-xs">
                        {hasReviews ? `★ ${ratingScore}` : totalProducts > 0 ? `${totalProducts} ${totalProducts === 1 ? i18n.pieceSingle : i18n.piecePlural}` : i18n.workshopSingle}
                      </span>
                    </div>

                    {/* Metadata resumida */}
                    <h4 className="font-bold text-xs text-texto tracking-tight mt-2 truncate group-hover:text-primary transition-colors leading-snug">
                      {store.name}
                    </h4>

                    <p className="text-[11px] text-texto-secundario truncate mt-0.5">
                      {store.department || 'Nicaragua'}
                      {store.distanceKm != null && ` · ${store.distanceKm.toFixed(1)} km`}
                    </p>
                  </div>

                  <div className="mt-2 pt-1.5 border-t border-borde/50 dark:border-slate-800 flex items-center justify-between text-[10px] text-texto-secundario">
                    <span className="text-secondary font-medium truncate">
                      {scheduleStatus.isDemonstrative ? i18n.demonstrative : i18n.certifiedWorkshop}
                    </span>
                    <span className="text-primary font-bold group-hover:underline shrink-0">{i18n.viewAction}</span>
                  </div>
                </div>
              );
            }

            // CARD 3: LIST VIEW (Detailed horizontal card)
            return (
              <div
                key={store.id}
                role="article"
                onMouseEnter={() => onHover(store.id)}
                onMouseLeave={() => onHover(null)}
                onClick={() => onSelect(store.id)}
                className={`
                  group rounded-2xl bg-blanco dark:bg-[#1e293b] p-3
                  border transition-all cursor-pointer
                  ${isHovered
                    ? 'border-primary/50 shadow-md translate-y-[-1px]'
                    : 'border-borde/70 dark:border-[#253346] shadow-xs hover:shadow-sm'
                  }
                `}
              >
                <div className="flex gap-3 items-start">
                  <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 shadow-xs bg-slate-100 dark:bg-slate-800">
                    {store.logoUrl ? (
                      <img
                        src={store.logoUrl}
                        alt={store.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-texto-secundario">
                        <MapPin className="size-6" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-secondary truncate">
                        {categoryBadge}
                      </span>
                      <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 shrink-0">
                        {hasReviews ? `★ ${ratingScore} (${reviewsCount})` : totalProducts > 0 ? `${totalProducts} ${totalProducts === 1 ? i18n.productSingle : i18n.productPlural}` : i18n.workshopSingle}
                      </span>
                    </div>

                    <h4 className="font-bold text-sm text-texto tracking-tight mt-0.5 truncate group-hover:text-primary transition-colors">
                      {store.name}
                    </h4>

                    <p className="text-xs text-texto-secundario truncate mt-0.5">
                      {store.department || 'Nicaragua'}
                      {store.distanceKm != null && ` · ${store.distanceKm.toFixed(1)} km`}
                    </p>

                    <div className="flex items-center gap-1.5 mt-1 text-xs">
                      <span className={clsx("font-medium flex items-center gap-1 shrink-0", scheduleStatus.textColorClass)}>
                        <span className={clsx("inline-block size-1.5 rounded-full shrink-0", scheduleStatus.dotColorClass)} />
                        <span>{scheduleStatus.statusText}</span>
                      </span>
                      <span className="text-texto-secundario/60">·</span>
                      <span className="text-texto-secundario text-[11px] truncate">{scheduleStatus.nextChangeText}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-borde/50 dark:border-slate-800 flex items-center justify-between text-xs text-texto-secundario">
                  <span className="flex items-center gap-1 text-[11px] text-secondary">
                    <Award className="size-3" />
                    <span>{scheduleStatus.isDemonstrative ? i18n.demonstrativeWorkshop : i18n.certifiedWorkshop}</span>
                  </span>
                  <span className="text-primary font-bold text-[11px] group-hover:underline flex items-center gap-0.5">
                    {i18n.viewDetailsAction}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
