// =============================================================================
// shared/Section.tsx
// =============================================================================
// Wrapper comun para todas las secciones del perfil.
// =============================================================================

import type { ReactNode } from 'react';
import { Skeleton } from '../../ui/skeleton';

interface SectionProps {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
  loading?: boolean;
  error?: string | null;
}

export default function Section({
  title,
  description,
  actions,
  children,
  loading,
  error,
}: SectionProps) {
  return (
    <section className="space-y-6">
      {(title || actions) && (
        <header className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            {title && (
              <h2 className="text-2xl font-bold text-texto">{title}</h2>
            )}
            {description && (
              <p className="text-sm text-texto-secundario mt-1">
                {description}
              </p>
            )}
          </div>
          {actions && <div className="flex gap-2 shrink-0">{actions}</div>}
        </header>
      )}
      {error && (
        <p
          role="alert"
          aria-live="polite"
          className="text-sm text-error bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl p-4"
        >
          {error}
        </p>
      )}
      {loading ? (
        <div className="space-y-4">
          <div className="bg-blanco dark:bg-zinc-900 border border-borde rounded-2xl p-6 space-y-4 shadow-2xs">
            <div className="flex items-center gap-4">
              <Skeleton className="size-12 rounded-xl shrink-0" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-5 w-1/3 rounded-lg" />
                <Skeleton className="h-4 w-1/2 rounded-md" />
              </div>
            </div>
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
          </div>
        </div>
      ) : (
        children
      )}
    </section>
  );
}