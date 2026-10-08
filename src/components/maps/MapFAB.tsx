// =============================================================================
// MapFAB.tsx — Floating Action Button "Centrar en mi ubicación".
// =============================================================================
// Bottom-right circular button. En mobile se posiciona justo arriba del
// bottom-sheet usando la altura actual del sheet (drag en vivo).
// =============================================================================

import { useEffect, useState } from 'react';
import { Check, Crosshair } from 'lucide-react';

interface Props {
  onLocate: () => void;
  pending: boolean;
  hasLocation: boolean;
  /** Altura actual del sheet en mobile (px). 0 = no aplica (desktop). */
  sheetHeight?: number;
  /** Indica si la tarjeta de ruta está abierta para no solaparse con ella */
  hasActiveRoute?: boolean;
  label: string;
  pendingLabel: string;
}

export default function MapFAB({
  onLocate,
  pending,
  hasLocation,
  sheetHeight = 0,
  hasActiveRoute = false,
  label,
  pendingLabel,
}: Props) {
  // Detectar mobile inmediatamente en cliente para evitar salto visual (flicker).
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(max-width: 1023px)').matches
      : false,
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)');
    const update = () => setIsMobile(mq.matches);
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  // Feedback transitorio visual tras centrar ubicacion (U-5).
  const [justLocated, setJustLocated] = useState(false);
  const handleLocateClick = () => {
    onLocate();
    if (hasLocation) {
      setJustLocated(true);
      setTimeout(() => setJustLocated(false), 1500);
    }
  };

  // En mobile: si hay ruta activa, el FAB flota justo arriba de la tarjeta de navegación (~185px)
  // Si no hay ruta, se coloca a `sheetHeight + 16px` del fondo.
  const mobileBottom = hasActiveRoute
    ? sheetHeight + 220
    : sheetHeight + 16;

  const inlineStyle = isMobile
    ? { bottom: `${mobileBottom}px`, right: '16px' }
    : undefined;

  return (
    <button
      type="button"
      onClick={handleLocateClick}
      disabled={pending}
      aria-label={pending ? pendingLabel : label}
      title={pending ? pendingLabel : label}
      style={inlineStyle}
      className={`
        group fixed z-[800] size-12 rounded-full
        bg-primary text-primary-foreground shadow-modal
        flex items-center justify-center
        hover:bg-primary-dark transition-[bottom,right,transform] duration-200
        disabled:opacity-70 disabled:cursor-wait
        lg:!bottom-6 lg:!right-6
        ${pending ? '' : 'animate-fab-pulse'}
      `}
    >
      {pending ? (
        <svg
          className="size-5 animate-spin"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={3} opacity={0.25} />
          <path
            d="M22 12a10 10 0 00-10-10"
            stroke="currentColor"
            strokeWidth={3}
            strokeLinecap="round"
          />
        </svg>
      ) : justLocated ? (
        <Check className="size-5 text-emerald-300 animate-in zoom-in-75 duration-200" aria-hidden="true" />
      ) : (
        <Crosshair className="size-5 group-hover:scale-110 transition-transform" aria-hidden="true" />
      )}
    </button>
  );
}