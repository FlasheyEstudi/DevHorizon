// =============================================================================
// HeaderAuthMenu.tsx — Isla React del slot auth-aware del Header.
//
// Renderiza UNO de dos segun el estado del store `authUser`:
//
//   1. Sin sesion → Link "Entrar" (Login)
//   2. Con sesion → DropdownMenu con trigger Avatar y 3 items.
//
// Estructura adaptada para alinear visualmente tanto en desktop (inline)
// como en mobile (bottom bar) con los demas botones del navbar.
// =============================================================================

import { useStore } from "@nanostores/react";
import { LogIn, LogOut, ShoppingCart, Store, User } from "lucide-react";

import { authUser, logout } from "@lib/stores/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@components/ui/dropdown-menu";
import { pbFileUrl, usePocketBaseUrl } from "@lib/pb-url";
import type { Lang } from "@i18n/ui";
import { localizePath } from "@i18n/utils";

interface Props {
  variant: "desktop" | "mobile";
  lang: Lang;
  labels: {
    login: string;
    profile: string;
    cart: string;
    logout: string;
    /** "Mi tienda" para sellers (opcional segun rol). */
    store?: string;
    /** Plantilla con `{name}` placeholder; se reemplaza en runtime. */
    greeting: string;
  };
}

/** Devuelve las iniciales (max 2 chars) a partir de name o email. */
function initialsOf(name: string | undefined, email: string | undefined): string {
  const source = (name?.trim() || email?.split("@")[0] || "?").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function HeaderAuthMenu({ variant, lang, labels }: Props) {
  const user = useStore(authUser);
  const pbUrl = usePocketBaseUrl();
  const isMobile = variant === "mobile";

  const displayName = user?.name?.trim() || user?.email.split("@")[0] || "";
  const initials = user ? initialsOf(user.name, user.email) : "";
  const greeting = user ? labels.greeting.replace("{name}", displayName) : "";

  const loginHref = localizePath("/login", lang);
  const profileHref = localizePath("/perfil", lang);
  const cartHref = localizePath("/carrito", lang);

  const avatarUrl = user?.avatar
    ? `${pbUrl}/api/files/users/${user.id}/${user.avatar}`
    : null;

  const handleLogout = async () => {
    await logout();
    window.location.href = localizePath("/", lang);
  };

  // =========================================================================
  // USUARIO NO LOGUEADO (Botón Entrar)
  // =========================================================================
  if (!user) {
    if (isMobile) {
      return (
        <a
          href={loginHref}
          aria-label={labels.login}
          className="flex flex-col items-center justify-center py-1 transition-all duration-300 relative text-texto-secundario hover:text-texto w-full"
        >
          <div className="relative w-12 h-8 flex items-center justify-center rounded-full transition-all duration-300">
            <LogIn className="size-5" aria-hidden="true" />
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wider leading-none mt-1 hidden">
            {labels.login}
          </span>
        </a>
      );
    }

    return (
      <a
        href={loginHref}
        aria-label={labels.login}
        className="relative flex flex-col items-center text-texto hover:text-primary transition-colors px-1"
      >
        <LogIn className="text-2xl mb-1 size-6" aria-hidden="true" />
        <span className="text-sm font-medium">{labels.login}</span>
      </a>
    );
  }

  // =========================================================================
  // USUARIO LOGUEADO (Avatar con Dropdown)
  // =========================================================================
  if (isMobile) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={displayName || labels.profile}
            className="flex items-center justify-center w-full h-12 focus:outline-none"
          >
            <Avatar className="size-9">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} className="object-cover" />}
              <AvatarFallback className="bg-primary text-white font-semibold text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          side="top"
          sideOffset={8}
          className="z-1100 min-w-56"
        >
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">{greeting}</span>
              {user.email && (
                <span className="text-sm font-medium break-all">{user.email}</span>
              )}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {(user.role === "seller" || user.role === "admin") && labels.store && (
            <DropdownMenuItem asChild>
              <a href={profileHref} className="cursor-pointer">
                <Store />
                <span>{labels.store}</span>
              </a>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild>
            <a href={profileHref} className="cursor-pointer">
              <User />
              <span>{labels.profile}</span>
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href={cartHref} className="cursor-pointer">
              <ShoppingCart />
              <span>{labels.cart}</span>
            </a>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={handleLogout}>
            <LogOut />
            <span>{labels.logout}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={displayName || labels.profile}
          className="relative flex items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-transform hover:scale-105"
        >
          <Avatar className="size-10">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} className="object-cover" />}
            <AvatarFallback className="bg-primary text-white font-semibold text-sm">
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        side="bottom"
        sideOffset={6}
        className="z-1100 min-w-56"
      >
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">{greeting}</span>
            {user.email && (
              <span className="text-sm font-medium break-all">{user.email}</span>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {(user.role === "seller" || user.role === "admin") && labels.store && (
          <DropdownMenuItem asChild>
            <a href={profileHref} className="cursor-pointer">
              <Store />
              <span>{labels.store}</span>
            </a>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <a href={profileHref} className="cursor-pointer">
            <User />
            <span>{labels.profile}</span>
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={cartHref} className="cursor-pointer">
            <ShoppingCart />
            <span>{labels.cart}</span>
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={handleLogout}>
          <LogOut />
          <span>{labels.logout}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}