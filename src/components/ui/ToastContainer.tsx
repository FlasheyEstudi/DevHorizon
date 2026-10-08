// =============================================================================
// ToastContainer.tsx — Componente React contenedor de notificaciones flotantes
// =============================================================================
// Renderiza de forma animada los mensajes Toast emitidos en el proyecto.
// =============================================================================

import { useStore } from "@nanostores/react";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";
import { toastsAtom, removeToast, type Toast } from "@lib/stores/toast";

export default function ToastContainer() {
  const toasts = useStore(toastsAtom);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed top-4 inset-x-4 md:top-6 md:right-6 md:left-auto z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
    >
      {toasts.map((item) => (
        <ToastItem key={item.id} toast={item} />
      ))}
    </div>
  );
}

function ToastItem({ toast }: { toast: Toast }) {
  const { id, type, title, message } = toast;

  const styles = {
    success: {
      bg: "bg-emerald-50/95 dark:bg-emerald-950/95 border-emerald-500/30 text-emerald-900 dark:text-emerald-100",
      icon: <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />,
    },
    error: {
      bg: "bg-rose-50/95 dark:bg-rose-950/95 border-rose-500/30 text-rose-900 dark:text-rose-100",
      icon: <AlertCircle className="size-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />,
    },
    info: {
      bg: "bg-sky-50/95 dark:bg-sky-950/95 border-sky-500/30 text-sky-900 dark:text-sky-100",
      icon: <Info className="size-5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />,
    },
    warning: {
      bg: "bg-amber-50/95 dark:bg-amber-950/95 border-amber-500/30 text-amber-900 dark:text-amber-100",
      icon: <AlertTriangle className="size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />,
    },
  }[type];

  return (
    <div
      className={`pointer-events-auto p-3.5 rounded-xl border backdrop-blur-md shadow-lg flex items-start gap-3 transition-all duration-300 animate-in slide-in-from-top-2 fade-in ${styles.bg}`}
    >
      {styles.icon}
      <div className="flex-1 min-w-0">
        {title && <h5 className="text-xs font-bold leading-tight mb-0.5">{title}</h5>}
        <p className="text-xs font-medium leading-normal break-words">{message}</p>
      </div>
      <button
        type="button"
        onClick={() => removeToast(id)}
        className="p-1 rounded-md opacity-70 hover:opacity-100 transition-opacity shrink-0 -mr-1 -mt-1"
        aria-label="Cerrar notificación"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
