import React, { useState, useRef, useEffect } from 'react';
import type { Lang } from '../../i18n/ui';
import { switchLocalePath } from '../../i18n/utils';
import { Globe, Check, ChevronDown } from 'lucide-react';

interface Props {
  currentLang: Lang;
  currentPathname: string;
  search?: string;
  variant?: 'desktop' | 'overlay' | 'drawer';
  label?: string;
}

const LANGUAGES = [
  { code: 'es' as const, label: 'Español', flag: '🇳🇮', region: 'Nicaragua' },
  { code: 'en' as const, label: 'English', flag: '🇺🇸', region: 'United States' },
  { code: 'miq' as const, label: 'Miskitu', flag: '🌿', region: 'Costa Caribe (RACCN / RACCS)' },
];

export default function LanguageDropdown({
  currentLang,
  currentPathname,
  search = '',
  variant = 'desktop',
  label = 'Idioma',
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Cerrar con Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false);
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const activeLangObj = LANGUAGES.find((l) => l.code === currentLang) || LANGUAGES[0];

  // Variante: Drawer móvil (dentro del menú lateral)
  if (variant === 'drawer') {
    return (
      <div className="space-y-1.5" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold text-texto hover:bg-fondo dark:hover:bg-zinc-800 transition-colors"
          aria-expanded={isOpen}
          aria-label={label}
        >
          <span className="flex items-center gap-3">
            <Globe className="size-4 text-primary" />
            <span>{label}</span>
          </span>
          <span className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded bg-primary/10 text-primary uppercase">
            <span>{activeLangObj.flag}</span>
            <span>{activeLangObj.code}</span>
            <ChevronDown className={`size-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </span>
        </button>

        {isOpen && (
          <div className="mx-2 p-1.5 bg-fondo/80 dark:bg-zinc-800/80 border border-borde rounded-xl space-y-1 animate-in fade-in zoom-in-95 duration-150">
            {LANGUAGES.map((l) => {
              const isCurrent = l.code === currentLang;
              const href = switchLocalePath(currentPathname, l.code, search);
              return (
                <a
                  key={l.code}
                  href={href}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    isCurrent
                      ? 'bg-primary text-primary-foreground shadow-2xs'
                      : 'text-texto hover:bg-blanco dark:hover:bg-zinc-700'
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-sm">{l.flag}</span>
                    <span>{l.label}</span>
                    <span className={`text-[10px] opacity-75 font-normal`}>({l.region})</span>
                  </span>
                  {isCurrent && <Check className="size-3.5" />}
                </a>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Variante: Overlay Header del mapa
  if (variant === 'overlay') {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          data-overlay-pill
          className="flex items-center gap-1.5 px-3 h-9 rounded-full text-sm font-bold uppercase text-white hover:bg-blanco/20 transition-colors cursor-pointer"
          title={label}
          aria-label={label}
          aria-expanded={isOpen}
        >
          <Globe className="size-4" />
          <span className="text-xs">{activeLangObj.flag}</span>
          <span>{activeLangObj.code}</span>
          <ChevronDown className={`size-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute right-0 top-full mt-2 w-56 p-1.5 bg-blanco/95 dark:bg-[#16202e]/95 backdrop-blur-md border border-borde rounded-2xl shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-texto-secundario border-b border-borde/60 mb-1">
              {label} / Language / Bila
            </div>
            {LANGUAGES.map((l) => {
              const isCurrent = l.code === currentLang;
              const href = switchLocalePath(currentPathname, l.code, search);
              return (
                <a
                  key={l.code}
                  href={href}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                    isCurrent
                      ? 'bg-primary text-primary-foreground shadow-2xs font-bold'
                      : 'text-texto hover:bg-fondo dark:hover:bg-zinc-800'
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-base">{l.flag}</span>
                    <span>{l.label}</span>
                  </span>
                  {isCurrent && <Check className="size-4" />}
                </a>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Variante default: Desktop Header
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        id="lang-selector-btn"
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex flex-col items-center text-texto hover:text-primary transition-colors px-1 cursor-pointer focus:outline-none"
        title={label}
        aria-label={label}
        aria-expanded={isOpen}
      >
        <div className="relative flex items-center justify-center">
          <Globe className="size-5 mb-0.5" />
          <span className="absolute -top-1 -right-2 text-[10px]">{activeLangObj.flag}</span>
        </div>
        <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-0.5">
          {activeLangObj.code}
          <ChevronDown className={`size-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-60 p-2 bg-blanco dark:bg-zinc-900 border border-borde rounded-2xl shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-texto-secundario border-b border-borde/60 mb-1 flex items-center justify-between">
            <span>{label}</span>
            <span className="text-[9px] font-normal lowercase opacity-70">bila / lang</span>
          </div>

          <div className="space-y-1">
            {LANGUAGES.map((l) => {
              const isCurrent = l.code === currentLang;
              const href = switchLocalePath(currentPathname, l.code, search);
              return (
                <a
                  key={l.code}
                  href={href}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-colors ${
                    isCurrent
                      ? 'bg-primary text-primary-foreground font-bold shadow-2xs'
                      : 'text-texto hover:bg-fondo dark:hover:bg-zinc-800 font-medium'
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg leading-none">{l.flag}</span>
                    <div className="flex flex-col text-left">
                      <span className="leading-tight">{l.label}</span>
                      <span className={`text-[10px] ${isCurrent ? 'text-primary-foreground/80' : 'text-texto-secundario'}`}>
                        {l.region}
                      </span>
                    </div>
                  </div>
                  {isCurrent && <Check className="size-4 flex-shrink-0" />}
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
