// =============================================================================
// Sidebar.tsx — Nav lateral del perfil
// =============================================================================
// Muestra los items segun role del user:
//   - 'user'  : Inicio · Mis pedidos · Mi cuenta
//   - 'seller': + Mi tienda · Mis productos · Dashboard
//   - 'admin' : igual que seller (no se construye vista admin-specific aca)
//
// El item activo se resalta con bg-primary/10 + text-primary + border-left.
// =============================================================================

import { useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  Home,
  LayoutGrid,
  Package,
  ShoppingBag,
  UserCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Lang } from '../../i18n/ui';
import { useTranslations } from '../../i18n/utils';

export type ProfileTab = 'overview' | 'store' | 'products' | 'dashboard' | 'orders' | 'account';

interface SidebarItem {
  key: ProfileTab;
  labelKey: string;
  icon: LucideIcon;
}

const COMMON_ITEMS: SidebarItem[] = [
  { key: 'overview', labelKey: 'profile.sidebar.overview', icon: Home },
  { key: 'orders', labelKey: 'profile.sidebar.orders', icon: ShoppingBag },
  { key: 'account', labelKey: 'profile.sidebar.account', icon: UserCircle },
];

const SELLER_ITEMS: SidebarItem[] = [
  { key: 'store', labelKey: 'profile.sidebar.store', icon: LayoutGrid },
  { key: 'products', labelKey: 'profile.sidebar.products', icon: Package },
  { key: 'dashboard', labelKey: 'profile.sidebar.dashboard', icon: LayoutDashboard },
];

interface SidebarProps {
  lang: Lang;
  role: 'user' | 'seller' | 'admin';
  active: ProfileTab;
  onChange: (tab: ProfileTab) => void;
}

export default function Sidebar({ lang, role, active, onChange }: SidebarProps) {
  const t = useTranslations(lang);
  const isSeller = role === 'seller' || role === 'admin';
  const navRef = useRef<HTMLUListElement>(null);

  // Sellers ven los seller items ANTES de orders/account.
  const items = isSeller ? [...SELLER_ITEMS, ...COMMON_ITEMS] : COMMON_ITEMS;

  // Auto-scroll la pestaña activa al centro en celulares cuando cambia `active`
  useEffect(() => {
    const activeEl = document.getElementById(`profile-tab-${active}`);
    if (activeEl && window.innerWidth < 1024) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [active]);

  return (
    <nav
      aria-label="Perfil"
      className="lg:sticky lg:top-6 lg:self-start mb-2 lg:mb-0"
    >
      {/* Mobile: horizontal scrollable pills. Desktop: vertical navigation list. */}
      <ul
        ref={navRef}
        className="flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-visible p-1.5 lg:p-0 rounded-2xl bg-blanco dark:bg-zinc-900/90 border border-borde lg:border-0 lg:bg-transparent shadow-2xs lg:shadow-none scrollbar-none snap-x snap-mandatory"
      >
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.key;
          return (
            <li key={item.key} className="shrink-0 snap-center">
              <button
                id={`profile-tab-${item.key}`}
                type="button"
                onClick={() => onChange(item.key)}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-200 select-none w-full lg:w-auto text-left lg:rounded-lg ${
                  isActive
                    ? 'bg-primary text-white shadow-xs lg:bg-primary/10 lg:text-primary lg:border-l-2 lg:border-primary lg:shadow-none dark:lg:bg-primary/20 dark:lg:text-primary'
                    : 'text-texto-secundario hover:bg-fondo dark:hover:bg-zinc-800 hover:text-texto border-transparent'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                <span>{t(item.labelKey)}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}