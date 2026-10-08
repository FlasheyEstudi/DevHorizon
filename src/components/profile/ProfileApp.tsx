// =============================================================================
// ProfileApp.tsx — Isla React principal del perfil
// =============================================================================
// Orquesta las 6 secciones del perfil con navegacion por tabs interna.
//
// - Lee el user via refreshAuth() (al boot) y se suscribe al nanostore
//   `authUser` para reaccionar a cambios (ej: despues de crear tienda,
//   el role pasa de 'user' a 'seller' y aparecen las secciones seller).
// - Una sola isla = state compartido sin coordinacion cross-island.
// - Sidebar oculto segun role (ver Sidebar.tsx).
// =============================================================================

import { useEffect, useState } from 'react';
import { useStore } from '@nanostores/react';
import { authUser, refreshAuth } from '../../lib/stores/auth';
import type { Lang } from '../../i18n/ui';
import Sidebar, { type ProfileTab } from './Sidebar';
import Overview from './sections/Overview';
import StoreSection from './sections/StoreSection';
import ProductsSection from './sections/ProductsSection';
import DashboardSection from './sections/DashboardSection';
import OrdersSection from './sections/OrdersSection';
import AccountSection from './sections/AccountSection';
import { Skeleton } from '../ui/skeleton';

interface Props {
  lang: Lang;
  labels: {
    title: string;
    needLogin: string;
  };
}

export default function ProfileApp({ lang, labels }: Props) {
  const user = useStore(authUser);
  const [bootDone, setBootDone] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');

  // Boot: refresh user.
  useEffect(() => {
    let aborted = false;
    refreshAuth().then(() => {
      if (!aborted) setBootDone(true);
    });
    return () => {
      aborted = true;
    };
  }, []);

  if (!bootDone) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-6 lg:gap-8">
        <div className="flex lg:flex-col gap-2 overflow-hidden">
          <Skeleton className="h-10 w-28 lg:w-full rounded-xl shrink-0" />
          <Skeleton className="h-10 w-28 lg:w-full rounded-xl shrink-0" />
          <Skeleton className="h-10 w-28 lg:w-full rounded-xl shrink-0" />
          <Skeleton className="h-10 w-28 lg:w-full rounded-xl shrink-0" />
        </div>
        <div className="space-y-6">
          <div className="flex items-center gap-4 bg-blanco dark:bg-zinc-900/90 p-6 rounded-2xl border border-borde shadow-2xs">
            <Skeleton className="size-16 rounded-full shrink-0" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-5 w-44 rounded-lg" />
              <Skeleton className="h-4 w-28 rounded-md" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    // Empty state — el middleware ya redirige a /login, pero por si
    // el user abre esta pagina sin cookie, mostramos el fallback.
    return (
      <div className="text-center py-12 space-y-4">
        <p className="text-texto-secundario">{labels.needLogin}</p>
        <a
          href={lang === 'es' ? '/login' : `/${lang}/login`}
          className="inline-block bg-primary text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-primary-dark transition-colors"
        >
          Iniciar sesion
        </a>
      </div>
    );
  }

  const role = user.role ?? 'user';
  const isSeller = role === 'seller' || role === 'admin';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-6 lg:gap-8">
      <Sidebar
        lang={lang}
        role={role}
        active={activeTab}
        onChange={setActiveTab}
      />

      <main className="min-w-0">
        {activeTab === 'overview' && (
          <Overview
            lang={lang}
            user={user}
            isSeller={isSeller}
            onCreateStoreSuccess={() => {
              // Despues de crear tienda, refrescar user y navegar a la
              // seccion store para que el seller vea su tienda recien creada.
              refreshAuth().then(() => setActiveTab('store'));
            }}
            onGoTo={(tab) => setActiveTab(tab)}
          />
        )}
        {activeTab === 'store' && isSeller && (
          <StoreSection lang={lang} />
        )}
        {activeTab === 'products' && isSeller && (
          <ProductsSection lang={lang} />
        )}
        {activeTab === 'dashboard' && isSeller && (
          <DashboardSection lang={lang} />
        )}
        {activeTab === 'orders' && (
          <OrdersSection lang={lang} />
        )}
        {activeTab === 'account' && (
          <AccountSection lang={lang} />
        )}
      </main>
    </div>
  );
}