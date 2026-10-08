// =============================================================================
// StorePopup.tsx — Popup content for a store marker.
// =============================================================================
// Rendered inside a Leaflet <Popup> portal. Uses the project's design
// tokens (bg-blanco, text-texto, shadow-card-hover) instead of raw Tailwind
// grays so it matches the rest of the UI.
//
// Shows:
//   - Logo thumbnail (if available)
//   - Store name + department
//   - Address (line-clamp 2)
//   - Distance (if user geolocation granted)
//   - "Ver tienda" CTA
// =============================================================================

import type { Lang } from '@/i18n/ui';
import { localizePath } from '@/i18n/utils';
import { Navigation } from 'lucide-react';

export interface StorePopupData {
  id: string;
  name: string;
  slug: string;
  department?: string;
  address_text?: string;
  logoUrl?: string;
  distanceKm?: number;
}

interface Props {
  store: StorePopupData;
  lang: Lang;
  viewStoreLabel: string;
  distanceLabel: string;
  howToGetThereLabel?: string;
  onRequestRoute?: (storeId: string) => void;
}

export default function StorePopup({
  store,
  lang,
  viewStoreLabel,
  distanceLabel,
  howToGetThereLabel,
  onRequestRoute,
}: Props) {
  const href = localizePath(`/tiendas/${store.slug}`, lang);

  return (
    <div className="w-64 p-3.5 bg-blanco text-texto rounded-lg text-left">
      <div className="flex items-start gap-3 mb-2.5">
        {store.logoUrl ? (
          <img
            src={store.logoUrl}
            alt={store.name}
            className="w-12 h-12 rounded-lg object-cover bg-fondo border border-borde/70 flex-shrink-0"
            loading="lazy"
          />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-primary-light/60 dark:bg-primary-light flex items-center justify-center flex-shrink-0 text-primary">
            <svg
              viewBox="0 0 24 24"
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 9l9-6 9 6v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
            </svg>
          </div>
        )}
        <div className="flex-1 min-w-0 pr-4">
          <h3 className="font-bold text-texto text-sm leading-snug truncate">
            {store.name}
          </h3>
          {store.department && (
            <p className="text-xs font-medium text-texto-secundario mt-0.5">{store.department}</p>
          )}
        </div>
      </div>

      {store.address_text && (
        <p className="text-xs text-slate-600 dark:text-slate-300 mb-2.5 line-clamp-2 leading-relaxed">
          {store.address_text}
        </p>
      )}

      {store.distanceKm != null && (
        <p className="text-xs text-primary font-semibold mb-3 flex items-center gap-1.5">
          <svg
            viewBox="0 0 24 24"
            className="w-3.5 h-3.5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          {store.distanceKm.toFixed(1)} {distanceLabel}
        </p>
      )}

      <div className="flex flex-col gap-2 pt-1">
        {onRequestRoute && (
          <button
            type="button"
            onClick={() => onRequestRoute(store.id)}
            className="flex items-center justify-center gap-2 w-full text-center text-xs font-semibold bg-primary hover:bg-primary-dark transition-colors px-3 py-2 rounded-lg text-primary-foreground shadow-xs active:scale-[0.98] cursor-pointer"
          >
            <Navigation className="w-3.5 h-3.5 fill-current" />
            <span>{howToGetThereLabel ?? '¿Cómo llegar?'}</span>
          </button>
        )}

        <a
          href={href}
          className="block w-full text-center text-xs font-semibold bg-fondo hover:bg-primary/10 text-texto dark:hover:bg-slate-800 border border-borde/70 transition-colors px-3 py-1.5 rounded-lg shadow-2xs active:scale-[0.98]"
        >
          {viewStoreLabel}
        </a>
      </div>
    </div>
  );
}
