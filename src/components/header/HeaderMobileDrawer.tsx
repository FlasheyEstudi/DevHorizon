// =============================================================================
// HeaderMobileDrawer.tsx — Isla React para el Menú Lateral Móvil (Drawer)
// =============================================================================
// Agrupa accesos secundarios (Noticias, Perfil/Auth, Tema, Idioma, etc.)
// en un panel lateral deslizable (drawer) de alta legibilidad y UX responsive.
// =============================================================================

import { useState, useEffect } from "react";
import { useStore } from "@nanostores/react";
import {
  Menu,
  X,
  Home,
  Search,
  Newspaper,
  ShoppingCart,
  Map,
  User,
  Store,
  LogIn,
  LogOut,
  Sun,
  Moon,
  Globe,
  ChevronRight,
} from "lucide-react";

import { authUser, logout } from "@lib/stores/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@components/ui/avatar";
import { ScrollArea } from "@components/ui/scroll-area";
import { usePocketBaseUrl } from "@lib/pb-url";
import type { Lang } from "@i18n/ui";
import { localizePath } from "@i18n/utils";
import LanguageDropdown from "./LanguageDropdown";

interface Props {
  lang: Lang;
  otherLang?: string;
  switchHref?: string;
  currentPathname?: string;
  search?: string;
  labels: {
    home: string;
    products: string;
    news: string;
    cart: string;
    map: string;
    login: string;
    profile: string;
    logout: string;
    store?: string;
    greeting: string;
    themeDark: string;
    themeLight: string;
    language: string;
    menuTitle: string;
  };
}

function initialsOf(name: string | undefined, email: string | undefined): string {
  const source = (name?.trim() || email?.split("@")[0] || "?").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function HeaderMobileDrawer({
  lang,
  otherLang = "en",
  switchHref,
  currentPathname,
  search,
  labels,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const user = useStore(authUser);
  const pbUrl = usePocketBaseUrl();

  const displayName = user?.name?.trim() || user?.email.split("@")[0] || "";
  const initials = user ? initialsOf(user.name, user.email) : "";
  const greeting = user ? labels.greeting.replace("{name}", displayName) : "";

  const avatarUrl = user?.avatar
    ? `${pbUrl}/api/files/users/${user.id}/${user.avatar}`
    : null;

  // Bloquear scroll de fondo cuando el drawer está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Manejar la tecla Escape para cerrar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleLogout = async () => {
    setIsOpen(false);
    await logout();
    window.location.href = localizePath("/", lang);
  };

  const handleToggleTheme = () => {
    const btn = document.getElementById("theme-toggle-desktop");
    if (btn) {
      btn.click();
    }
  };

  return (
    <>
      {/* Botón activador del menú (Bottom bar 5to item) */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex flex-col items-center justify-center py-1 transition-all duration-300 relative text-texto-secundario hover:text-texto w-full focus:outline-none"
        aria-label={labels.menuTitle}
        title={labels.menuTitle}
      >
        <div className="relative w-12 h-8 flex items-center justify-center rounded-full transition-all duration-300">
          <Menu className="size-5 text-texto-secundario" />
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wider leading-none mt-1 text-texto-secundario block">
          {labels.menuTitle}
        </span>
      </button>

      {/* Drawer Overlay & Content */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex justify-end">
          {/* Backdrop con desenfoque */}
          <div
            className="fixed inset-0 bg-negro/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Panel Deslizable */}
          <div
            className="relative w-full max-w-xs bg-blanco dark:bg-zinc-900 h-full shadow-2xl flex flex-col justify-between overflow-hidden z-10 animate-in slide-in-from-right duration-300 border-l border-borde"
            role="dialog"
            aria-modal="true"
            aria-label={labels.menuTitle}
          >
            {/* Header del Drawer */}
            <div className="p-4 border-b border-borde flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <img
                  src="/Logo.png"
                  alt="ArtesaNica Logo"
                  className="h-7 w-auto dark:hidden object-contain"
                />
                <img
                  src="/Logo Blanco.png"
                  alt="ArtesaNica Logo"
                  className="h-7 w-auto hidden dark:block object-contain"
                />
                <span className="font-extrabold text-lg text-primary">
                  ArtesáNica
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-full hover:bg-fondo dark:hover:bg-zinc-800 text-texto-secundario hover:text-texto transition-colors"
                aria-label="Cerrar menú"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Cuerpo principal del Drawer envuelto en ScrollArea */}
            <ScrollArea className="flex-1 px-4">
              <div className="py-4 space-y-6">
                {/* Sección de Usuario / Autenticación */}
                <div className="p-3.5 bg-fondo/60 dark:bg-zinc-800/60 rounded-xl border border-borde">
                  {user ? (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-11 border-2 border-primary/20">
                          {avatarUrl && (
                            <AvatarImage
                              src={avatarUrl}
                              alt={displayName}
                              className="object-cover"
                            />
                          )}
                          <AvatarFallback className="bg-primary text-white font-bold text-sm">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col overflow-hidden">
                          <span className="text-xs text-texto-secundario font-medium">
                            {greeting}
                          </span>
                          <span className="text-sm font-bold text-texto truncate">
                            {displayName}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-1.5 pt-2 border-t border-borde">
                        {(user.role === "seller" || user.role === "admin") &&
                          labels.store && (
                            <a
                              href={localizePath("/perfil", lang)}
                              onClick={() => setIsOpen(false)}
                              className="flex items-center justify-between p-2 rounded-lg text-xs font-semibold text-texto hover:bg-blanco dark:hover:bg-zinc-700 transition-colors"
                            >
                              <span className="flex items-center gap-2">
                                <Store className="size-4 text-primary" />
                                {labels.store}
                              </span>
                              <ChevronRight className="size-3.5 text-texto-secundario" />
                            </a>
                          )}
                        <a
                          href={localizePath("/perfil", lang)}
                          onClick={() => setIsOpen(false)}
                          className="flex items-center justify-between p-2 rounded-lg text-xs font-semibold text-texto hover:bg-blanco dark:hover:bg-zinc-700 transition-colors"
                        >
                          <span className="flex items-center gap-2">
                            <User className="size-4 text-primary" />
                            {labels.profile}
                          </span>
                          <ChevronRight className="size-3.5 text-texto-secundario" />
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 text-center">
                      <span className="text-xs text-texto-secundario font-medium">
                        Bienvenido a ArtesaNica
                      </span>
                      <a
                        href={localizePath("/login", lang)}
                        onClick={() => setIsOpen(false)}
                        className="w-full py-2 px-4 bg-primary hover:bg-primary-dark text-white rounded-lg font-bold text-sm shadow-xs flex items-center justify-center gap-2 transition-colors"
                      >
                        <LogIn className="size-4" />
                        {labels.login}
                      </a>
                    </div>
                  )}
                </div>

                {/* Lista de Navegación Principal */}
                <nav className="space-y-1">
                  <span className="px-3 text-[11px] font-bold uppercase tracking-wider text-texto-secundario">
                    Navegación
                  </span>
                  <div className="mt-2 space-y-1">
                    <a
                      href={localizePath("/", lang)}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold text-texto hover:bg-fondo dark:hover:bg-zinc-800 transition-colors"
                    >
                      <span className="flex items-center gap-3">
                        <Home className="size-4 text-primary" />
                        {labels.home}
                      </span>
                      <ChevronRight className="size-4 text-texto-secundario" />
                    </a>

                    <a
                      href={localizePath("/productos", lang)}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold text-texto hover:bg-fondo dark:hover:bg-zinc-800 transition-colors"
                    >
                      <span className="flex items-center gap-3">
                        <Search className="size-4 text-primary" />
                        {labels.products}
                      </span>
                      <ChevronRight className="size-4 text-texto-secundario" />
                    </a>

                    <a
                      href={localizePath("/noticias", lang)}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold text-texto hover:bg-fondo dark:hover:bg-zinc-800 transition-colors"
                    >
                      <span className="flex items-center gap-3">
                        <Newspaper className="size-4 text-primary" />
                        {labels.news}
                      </span>
                      <ChevronRight className="size-4 text-texto-secundario" />
                    </a>

                    <a
                      href={localizePath("/mapa", lang)}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold text-texto hover:bg-fondo dark:hover:bg-zinc-800 transition-colors"
                    >
                      <span className="flex items-center gap-3">
                        <Map className="size-4 text-primary" />
                        {labels.map}
                      </span>
                      <ChevronRight className="size-4 text-texto-secundario" />
                    </a>

                    <a
                      href={localizePath("/carrito", lang)}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold text-texto hover:bg-fondo dark:hover:bg-zinc-800 transition-colors"
                    >
                      <span className="flex items-center gap-3">
                        <ShoppingCart className="size-4 text-primary" />
                        {labels.cart}
                      </span>
                      <ChevronRight className="size-4 text-texto-secundario" />
                    </a>
                  </div>
                </nav>

                {/* Ajustes y Preferencias */}
                <div className="space-y-2 pt-4 border-t border-borde">
                  <span className="px-3 text-[11px] font-bold uppercase tracking-wider text-texto-secundario">
                    Preferencias
                  </span>

                  {/* Cambio de Tema */}
                  <button
                    type="button"
                    onClick={handleToggleTheme}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold text-texto hover:bg-fondo dark:hover:bg-zinc-800 transition-colors"
                  >
                    <span className="flex items-center gap-3">
                      <Sun className="size-4 text-amber-500 hidden dark:block" />
                      <Moon className="size-4 text-indigo-600 block dark:hidden" />
                      <span>Tema</span>
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-fondo dark:bg-zinc-800 border border-borde text-texto-secundario uppercase">
                      Cambiar
                    </span>
                  </button>

                  {/* Cambio de Idioma (Selector de 3 idiomas) */}
                  <LanguageDropdown
                    currentLang={lang}
                    currentPathname={currentPathname || (typeof window !== 'undefined' ? window.location.pathname : '/')}
                    search={search || (typeof window !== 'undefined' ? window.location.search : '')}
                    variant="drawer"
                    label={labels.language}
                  />
                </div>
              </div>
            </ScrollArea>

            {/* Footer del Drawer */}
            {user && (
              <div className="p-4 border-t border-borde bg-fondo/40 dark:bg-zinc-800/40">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full py-2.5 px-3 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
                >
                  <LogOut className="size-4" />
                  {labels.logout}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
