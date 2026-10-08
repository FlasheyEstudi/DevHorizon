import { MapPinOff, RotateCcw } from 'lucide-react';

interface Props {
  message: string;
  clearLabel: string;
  onClearFilters?: () => void;
}

export default function MapEmptyState({ message, clearLabel, onClearFilters }: Props) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-300">
      <div className="size-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
        <MapPinOff className="size-7 opacity-80" aria-hidden="true" />
      </div>
      <p className="text-sm text-texto-secundario max-w-xs mb-4 leading-relaxed">
        {message}
      </p>
      {onClearFilters && (
        <button
          type="button"
          onClick={onClearFilters}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary-dark transition shadow-xs cursor-pointer"
        >
          <RotateCcw className="size-3.5" aria-hidden="true" />
          {clearLabel}
        </button>
      )}
    </div>
  );
}
