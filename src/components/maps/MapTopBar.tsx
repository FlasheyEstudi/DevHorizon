// =============================================================================
// MapTopBar.tsx — Responsive search & craft category filters (Mobile & Desktop).
// =============================================================================
// Design System: ArtesaNica Desktop & Mobile Map (Stitch: 7878142276432040368)
// Desktop Features (Stitch lines 6-62):
//   - Full-width clean top bar strip
//   - Left: Expanded search input pill (max-w-xl) with clear cancel trigger
//   - Right: Department selector pill (Radix DropdownMenu) + vertical divider +
//     live emerald pulse dot with active count + "Limpiar filtros"
//   - Horizontal Craft Category Pills with authentic craft icons & count
// Mobile Features:
//   - Compact floating capsule with integrated dept pill, search & quick filter
// =============================================================================

import { useEffect, useState, useTransition } from 'react';
import {
  MapPin,
  Search,
  SlidersHorizontal,
  Check,
  ChevronDown,
  X,
  LayoutGrid,
  Flame,
  Layers,
  TreePine,
  ShoppingBag,
  Gem,
  ShoppingBasket,
  RotateCcw,
} from 'lucide-react';
import type { Department } from '@/lib/geo';
import type { MapCategory, MapI18n } from './mapShared';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Props {
  categories: MapCategory[];
  departments: readonly Department[];
  category: string | 'all';
  department: string | 'all';
  searchQuery: string;
  i18n: MapI18n;
  activeCount?: number;
  totalCount?: number;
  onCategoryChange: (c: string | 'all') => void;
  onDepartmentChange: (d: string | 'all') => void;
  onSearchChange: (q: string) => void;
  onClearFilters: () => void;
}

/** Renderiza icono temático por categoría artesanal */
function CategoryIcon({
  slug,
  icon,
  className,
}: {
  slug: string;
  icon?: string;
  className?: string;
}) {
  switch (slug.toLowerCase()) {
    case 'ceramica':
    case 'barro':
      return <Flame className={className} />;
    case 'textil':
    case 'bordados':
      return <Layers className={className} />;
    case 'madera':
      return <TreePine className={className} />;
    case 'cuero':
      return <ShoppingBag className={className} />;
    case 'joyeria':
      return <Gem className={className} />;
    case 'cesteria':
    case 'fibras':
    case 'hamacas':
      return <ShoppingBasket className={className} />;
    default:
      if (icon && icon.trim().length > 0) {
        return <span className="text-sm leading-none shrink-0" aria-hidden="true">{icon}</span>;
      }
      return <LayoutGrid className={className} />;
  }
}

export default function MapTopBar({
  categories,
  departments,
  category,
  department,
  searchQuery,
  i18n,
  activeCount = 0,
  totalCount = 0,
  onCategoryChange,
  onDepartmentChange,
  onSearchChange,
  onClearFilters,
}: Props) {
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [, startTransition] = useTransition();

  // Sincronizar si el padre limpia los filtros
  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  // Debounce de 200ms para busqueda fluida sin bloqueos
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== searchQuery) {
        startTransition(() => {
          onSearchChange(localSearch);
        });
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [localSearch, searchQuery, onSearchChange]);

  const hasActiveFilters = category !== 'all' || department !== 'all' || searchQuery.length > 0;
  const activeDeptLabel = department === 'all' ? 'Toda Nicaragua' : department;

  return (
    <nav
      aria-label="Filtros del mapa artesanal"
      className="pointer-events-none w-full max-w-full flex flex-col gap-2 select-none"
    >
      {/* ================================================================= */}
      {/* 1A. DESKTOP BAR: Search Pill + Dept Selector + Live Status (lg+) */}
      {/* ================================================================= */}
      <div className="hidden lg:flex items-center justify-between gap-4 pointer-events-auto">
        {/* Search Input Pill (Stitch lines 9-15) */}
        <div className="relative flex-1 min-w-[320px] max-w-xl">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-texto-secundario pointer-events-none" />
          <input
            type="search"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder={i18n.searchPlaceholder}
            aria-label={i18n.searchPlaceholder}
            className="
              w-full h-10 pl-10 pr-9 rounded-full
              bg-slate-100/90 dark:bg-slate-800/90 hover:bg-slate-200/70 dark:hover:bg-slate-700/70
              focus:bg-blanco dark:focus:bg-[#1e293b]
              border border-borde/70 dark:border-[#253346]
              text-xs sm:text-sm text-texto placeholder:text-texto-secundario
              focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all shadow-inner
            "
          />
          {localSearch.length > 0 && (
            <button
              type="button"
              onClick={() => setLocalSearch('')}
              aria-label="Borrar término"
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-texto-secundario hover:text-texto rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Department Selector & Context Stats (Stitch lines 17-35) */}
        <div className="flex items-center gap-3 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                id="map-dept-btn-desktop"
                aria-label={`Filtrar por departamento: ${activeDeptLabel}`}
                className="h-10 px-3.5 rounded-xl bg-slate-100/90 dark:bg-slate-800/90 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 text-texto flex items-center gap-2 border border-borde/60 dark:border-[#253346] transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/40 focus:outline-none shadow-xs"
              >
                <MapPin className="size-4 text-primary shrink-0" aria-hidden="true" />
                <span className="font-semibold text-xs sm:text-sm max-w-[160px] truncate">
                  {activeDeptLabel}
                </span>
                <ChevronDown className="size-3.5 text-texto-secundario shrink-0" aria-hidden="true" />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              sideOffset={8}
              className="w-56 max-h-80 overflow-y-auto rounded-xl bg-blanco/95 dark:bg-[#16202e]/95 backdrop-blur-xl border border-borde dark:border-[#253346] shadow-modal p-1.5 z-[900]"
            >
              <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-texto-secundario">
                {i18n.filterAllDepartments}
              </div>

              <DropdownMenuItem
                onClick={() => onDepartmentChange('all')}
                className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  department === 'all'
                    ? 'bg-primary/10 text-primary font-bold'
                    : 'text-texto hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>{i18n.allNicaragua}</span>
                {department === 'all' && <Check className="size-4 text-primary" />}
              </DropdownMenuItem>

              <div className="h-[1px] bg-borde dark:bg-[#253346] my-1" />

              {departments.map((dept) => {
                const isSelected = department === dept;
                return (
                  <DropdownMenuItem
                    key={dept}
                    onClick={() => onDepartmentChange(dept)}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-primary/10 text-primary font-bold'
                        : 'text-texto hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="truncate">{dept}</span>
                    {isSelected && <Check className="size-3.5 text-primary shrink-0" />}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="h-6 w-px bg-borde dark:bg-[#253346]" />

          {/* Live indicator & active count */}
          <div className="flex items-center gap-2 text-xs text-texto-secundario">
            <span className="inline-flex size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-texto tabular-nums">
              {activeCount > 0 ? activeCount : totalCount} {i18n.activeCountSuffix}
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={onClearFilters}
                className="ml-1 text-primary hover:underline font-semibold text-xs flex items-center gap-1 cursor-pointer transition-colors"
              >
                <RotateCcw className="size-3" />
                <span>{i18n.clearFilters}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* 1B. MOBILE BAR: Floating Capsule Pill (< lg)                     */}
      {/* ================================================================= */}
      <div className="lg:hidden pointer-events-auto w-full bg-blanco/95 dark:bg-[#16202e]/95 backdrop-blur-xl shadow-card hover:shadow-card-hover border border-borde/80 dark:border-[#253346] rounded-2xl p-1.5 flex items-center gap-1.5 sm:gap-2 transition-all">
        {/* Integrated Dept Badge Dropdown Pill */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              id="map-dept-btn-mobile"
              aria-label={`Filtrar por departamento: ${activeDeptLabel}`}
              className="h-10 px-2.5 sm:px-3 rounded-xl bg-slate-100/90 dark:bg-slate-800/90 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 text-texto flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 focus-visible:ring-2 focus-visible:ring-primary/40 focus:outline-none"
            >
              <MapPin className="size-4 text-primary shrink-0" aria-hidden="true" />
              <span className="font-semibold text-xs sm:text-sm max-w-[85px] sm:max-w-[120px] truncate">
                {activeDeptLabel}
              </span>
              <ChevronDown className="size-3.5 text-texto-secundario shrink-0" aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="start"
            sideOffset={8}
            className="w-56 max-h-80 overflow-y-auto rounded-xl bg-blanco/95 dark:bg-[#16202e]/95 backdrop-blur-xl border border-borde dark:border-[#253346] shadow-modal p-1.5 z-[900]"
          >
            <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-texto-secundario">
              {i18n.filterAllDepartments}
            </div>

            <DropdownMenuItem
              onClick={() => onDepartmentChange('all')}
              className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                department === 'all'
                  ? 'bg-primary/10 text-primary font-bold'
                  : 'text-texto hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span>Toda Nicaragua</span>
              {department === 'all' && <Check className="size-4 text-primary" />}
            </DropdownMenuItem>

            <div className="h-[1px] bg-borde dark:bg-[#253346] my-1" />

            {departments.map((dept) => {
              const isSelected = department === dept;
              return (
                <DropdownMenuItem
                  key={dept}
                  onClick={() => onDepartmentChange(dept)}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-primary/10 text-primary font-bold'
                      : 'text-texto hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="truncate">{dept}</span>
                  {isSelected && <Check className="size-3.5 text-primary shrink-0" />}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Search Input */}
        <div className="relative flex-1 flex items-center min-w-0">
          <Search className="absolute left-2.5 size-4 text-texto-secundario pointer-events-none" aria-hidden="true" />
          <input
            type="search"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder={i18n.searchPlaceholder}
            aria-label={i18n.searchPlaceholder}
            className="w-full h-10 pl-8 pr-7 bg-transparent text-xs sm:text-sm text-texto placeholder:text-texto-secundario/80 focus:outline-none"
          />
          {localSearch.length > 0 && (
            <button
              type="button"
              onClick={() => setLocalSearch('')}
              aria-label="Borrar búsqueda"
              className="absolute right-2 p-0.5 text-texto-secundario hover:text-texto rounded-full hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Quick Filter Reset / Indicator Button */}
        <button
          type="button"
          onClick={hasActiveFilters ? onClearFilters : undefined}
          title={hasActiveFilters ? i18n.clearFilters : 'Filtros aplicados'}
          aria-label={hasActiveFilters ? i18n.clearFilters : 'Filtros de artesanía'}
          className={`relative size-10 rounded-xl flex items-center justify-center transition-all shrink-0 cursor-pointer ${
            hasActiveFilters
              ? 'bg-primary/10 text-primary hover:bg-primary/20 active:scale-95'
              : 'bg-slate-100/90 dark:bg-slate-800/90 text-texto hover:bg-slate-200/80 dark:hover:bg-slate-700/80'
          }`}
        >
          <SlidersHorizontal className="size-4" aria-hidden="true" />
          {hasActiveFilters && (
            <span
              className="absolute top-1.5 right-1.5 size-2 rounded-full bg-primary ring-2 ring-blanco dark:ring-[#16202e]"
              aria-hidden="true"
            />
          )}
        </button>
      </div>

      {/* ================================================================= */}
      {/* 2. Horizontal Craft Category Pills (Shared Mobile & Desktop)     */}
      {/* ================================================================= */}
      <div
        role="tablist"
        aria-label="Categorías de artesanía"
        className="pointer-events-auto flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 -mx-1 px-1 scroll-smooth"
      >
        {/* Chip "Todos" */}
        <button
          type="button"
          role="tab"
          aria-selected={category === 'all'}
          onClick={() => onCategoryChange('all')}
          className={`category-chip shrink-0 min-h-[36px] sm:min-h-[38px] px-3.5 rounded-full flex items-center gap-1.5 text-xs sm:text-sm font-semibold transition-all active:scale-95 cursor-pointer ${
            category === 'all'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-blanco/95 dark:bg-[#16202e]/95 backdrop-blur-md text-texto border border-borde/70 dark:border-[#253346] shadow-xs hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <LayoutGrid className="size-3.5" aria-hidden="true" />
          <span>
            {totalCount > 0
              ? `${i18n.allWorkshops} (${totalCount})`
              : i18n.filterAllCategories}
          </span>
        </button>

        {/* Category Chips */}
        {categories.map((cat) => {
          const isSelected = category === cat.slug;
          return (
            <button
              key={cat.slug}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => onCategoryChange(isSelected ? 'all' : cat.slug)}
              className={`category-chip shrink-0 min-h-[36px] sm:min-h-[38px] px-3.5 rounded-full flex items-center gap-1.5 text-xs sm:text-sm transition-all active:scale-95 cursor-pointer ${
                isSelected
                  ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                  : 'bg-blanco/95 dark:bg-[#16202e]/95 backdrop-blur-md text-texto border border-borde/70 dark:border-[#253346] shadow-xs hover:bg-slate-100 dark:hover:bg-slate-800 font-medium'
              }`}
            >
              <CategoryIcon
                slug={cat.slug}
                icon={cat.icon}
                className={`size-3.5 ${isSelected ? 'text-primary-foreground' : 'text-primary'}`}
              />
              <span className="whitespace-nowrap">{cat.label}</span>
              {cat.count !== undefined && (
                <span
                  className={`text-[10px] font-bold tabular-nums px-1.5 py-0.2 rounded-full transition-colors ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : 'bg-primary/10 text-primary dark:bg-primary/25'
                  }`}
                >
                  {cat.count}
                </span>
              )}
            </button>
          );
        })}

        {/* Limpiar filtros pill adicional en movil */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="lg:hidden shrink-0 min-h-[36px] sm:min-h-[38px] px-3 rounded-full flex items-center gap-1 text-xs font-semibold text-error hover:bg-error/10 border border-error/30 transition-all active:scale-95 cursor-pointer"
          >
            <X className="size-3" aria-hidden="true" />
            <span>{i18n.clearFilters}</span>
          </button>
        )}
      </div>
    </nav>
  );
}
