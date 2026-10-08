// =============================================================================
// shared/Drawer.tsx
// =============================================================================
// Drawer/modal lateral derecho con backdrop. Usado para los forms de crear/
// editar producto. Cierra con Escape o click en backdrop.
// =============================================================================

import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export default function Drawer({
  open,
  onClose,
  title,
  description,
  children,
  footer,
}: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="relative w-full max-w-md bg-blanco h-full overflow-y-auto shadow-modal animate-[slide-in-right_0.2s_ease-out]"
      >
        <header className="sticky top-0 bg-blanco border-b border-borde px-6 py-4 flex items-start justify-between gap-4 z-10">
          <div>
            <h2
              id="drawer-title"
              className="text-lg font-bold text-texto"
            >
              {title}
            </h2>
            {description && (
              <p className="text-sm text-texto-secundario mt-0.5">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-texto-secundario hover:text-texto p-1 rounded transition-colors"
            aria-label="Cerrar"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </header>
        <div className="px-6 py-5">{children}</div>
        {footer && (
          <footer className="sticky bottom-0 bg-blanco border-t border-borde px-6 py-4 flex items-center justify-end gap-2 z-10">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}