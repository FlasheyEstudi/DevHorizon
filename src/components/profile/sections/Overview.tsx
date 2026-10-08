// =============================================================================
// sections/Overview.tsx — Seccion "Inicio" del perfil
// =============================================================================
// Buyers (role='user'):
//   - Welcome card
//   - CTA grande: "Convertite en vendedor"
//     -> Abre la StoreSection en modo create (drawer)
//   - Recent activity placeholder
//
// Sellers (role='seller' | 'admin'):
//   - Welcome card
//   - 4 quick stat cards (productos, pedidos, ingresos, rating) cargadas
//     desde /api/dashboard/stats
//   - CTAs a las secciones relevantes (Crear producto, Ver dashboard)
// =============================================================================

import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  DollarSign,
  Package,
  ShoppingBag,
  Star,
  Store,
} from 'lucide-react';
import { useTranslations } from '../../../i18n/utils';
import type { Lang } from '../../../i18n/ui';
import type { AuthUser } from '../../../lib/stores/auth';
import Section from '../shared/Section';
import StoreSection from './StoreSection';

import { csrfHeaders } from '@/lib/csrf-client';

interface OverviewProps {
  lang: Lang;
  user: AuthUser;
  isSeller: boolean;
  onCreateStoreSuccess: () => void;
  onGoTo: (tab: 'products' | 'dashboard' | 'store' | 'orders' | 'account') => void;
}

interface DashboardStats {
  store: { name: string; slug: string };
  products: { total: number; published: number; draft: number; archived: number };
  reviews: { avg: number; count: number };
  orders: {
    total: number;
    byStatus: {
      pending: number;
      paid: number;
      shipped: number;
      delivered: number;
      cancelled: number;
    };
  };
  revenue: { total: number; thisMonth: number; lastMonth: number };
}

export default function Overview({
  lang,
  user,
  isSeller,
  onCreateStoreSuccess,
  onGoTo,
}: OverviewProps) {
  const t = useTranslations(lang);
  // useTranslations retorna una función NUEVA en cada render; meterla en
  // deps de useEffect causa loop infinito de fetch. Usamos tRef (mismo
  // patron que Reviews.tsx).
  const tRef = useRef(t);
  tRef.current = t;

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(isSeller);
  const [error, setError] = useState<string | null>(null);
  const [showStoreCreate, setShowStoreCreate] = useState(false);

  useEffect(() => {
    if (!isSeller) return;
    let aborted = false;
    (async () => {
      try {
        const res = await fetch('/api/dashboard/stats', {
          headers: { Origin: window.location.origin, ...csrfHeaders() },
          credentials: 'include',
        });
        if (!res.ok) throw new Error(await res.text());
        const data: DashboardStats = await res.json();
        if (!aborted) {
          setStats(data);
          setLoading(false);
        }
      } catch {
        if (!aborted) {
          setError(tRef.current('profile.common.error'));
          setLoading(false);
        }
      }
    })();
    return () => {
      aborted = true;
    };
  }, [isSeller]);

  const displayName = user.name?.trim() || user.email.split('@')[0] || '';
  const welcome = t('profile.overview.welcome').replace('{name}', displayName);

  // =============== BUYER: CTA create store ===============
  if (!isSeller) {
    return (
      <>
        <Section title={welcome} description={t('profile.overview.subtitle')}>
          {/* CTA grande */}
          <div className="bg-gradient-to-br from-primary/5 via-primary/10 to-secondary/5 border border-primary/20 rounded-2xl p-8 md:p-10 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary text-white mb-4">
              <Store className="size-8" />
            </div>
            <h3 className="text-2xl font-bold text-texto mb-2">
              {t('profile.overview.becomeSeller.title')}
            </h3>
            <p className="text-texto-secundario max-w-xl mx-auto mb-6">
              {t('profile.overview.becomeSeller.body')}
            </p>
            <button
              type="button"
              onClick={() => setShowStoreCreate(true)}
              className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-dark transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
            >
              {t('profile.overview.becomeSeller.cta')}
              <ArrowRight className="size-4" />
            </button>
          </div>

          {/* Quick links */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => onGoTo('orders')}
              className="text-left bg-blanco border border-borde rounded-xl p-4 hover:border-primary/40 hover:shadow-card transition-all"
            >
              <div className="flex items-center gap-3">
                <ShoppingBag className="size-5 text-primary" />
                <div>
                  <p className="font-semibold text-texto text-sm">
                    {t('profile.sidebar.orders')}
                  </p>
                  <p className="text-xs text-texto-secundario">
                    {t('profile.orders.empty')}
                  </p>
                </div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => onGoTo('account')}
              className="text-left bg-blanco border border-borde rounded-xl p-4 hover:border-primary/40 hover:shadow-card transition-all"
            >
              <div className="flex items-center gap-3">
                <Star className="size-5 text-primary" />
                <div>
                  <p className="font-semibold text-texto text-sm">
                    {t('profile.sidebar.account')}
                  </p>
                  <p className="text-xs text-texto-secundario">
                    Edita tu perfil y contrasena
                  </p>
                </div>
              </div>
            </button>
          </div>
        </Section>

        {showStoreCreate && (
          <StoreSection
            lang={lang}
            mode="create"
            asModal
            onClose={() => setShowStoreCreate(false)}
            onSuccess={() => {
              setShowStoreCreate(false);
              onCreateStoreSuccess();
            }}
          />
        )}
      </>
    );
  }

  // =============== SELLER: stats cards ===============
  return (
    <Section title={welcome} description={t('profile.overview.subtitle')} loading={loading} error={error}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={<Package className="size-5 text-primary" />}
          label={t('profile.overview.quickStats.products')}
          value={stats?.products.published ?? 0}
          onClick={() => onGoTo('products')}
        />
        <StatCard
          icon={<ShoppingBag className="size-5 text-primary" />}
          label={t('profile.overview.quickStats.orders')}
          value={stats?.orders.total ?? 0}
          onClick={() => onGoTo('dashboard')}
        />
        <StatCard
          icon={<DollarSign className="size-5 text-primary" />}
          label={t('profile.overview.quickStats.revenue')}
          value={`C$ ${(stats?.revenue.thisMonth ?? 0).toFixed(2)}`}
          onClick={() => onGoTo('dashboard')}
        />
        <StatCard
          icon={<Star className="size-5 text-primary" />}
          label={t('profile.overview.quickStats.rating')}
          value={stats?.reviews.avg ?? 0}
          onClick={() => onGoTo('dashboard')}
        />
      </div>

      {stats && stats.products.total === 0 && (
        <div className="bg-blanco border border-borde rounded-xl p-6 text-center">
          <Package className="size-10 text-primary mx-auto mb-2" />
          <p className="text-texto font-semibold mb-1">
            {t('profile.products.empty.title')}
          </p>
          <p className="text-sm text-texto-secundario mb-4">
            {t('profile.products.empty.body')}
          </p>
          <button
            type="button"
            onClick={() => onGoTo('products')}
            className="inline-flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-primary-dark transition-colors"
          >
            {t('profile.products.empty.cta')}
            <ArrowRight className="size-4" />
          </button>
        </div>
      )}

      {stats && stats.products.total > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onGoTo('products')}
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary-dark"
          >
            Gestionar productos <ArrowRight className="size-4" />
          </button>
          <span className="text-texto-secundario">·</span>
          <button
            type="button"
            onClick={() => onGoTo('dashboard')}
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary-dark"
          >
            Ver dashboard completo <ArrowRight className="size-4" />
          </button>
        </div>
      )}
    </Section>
  );
}

// =============================================================================
// StatCard — tarjeta clickeable con icono + label + valor
// =============================================================================
function StatCard({
  icon,
  label,
  value,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left bg-blanco border border-borde rounded-xl p-4 hover:border-primary/40 hover:shadow-card transition-all group"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
          {icon}
        </div>
        <ArrowRight className="size-4 text-texto-secundario opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <p className="text-2xl font-bold text-texto leading-tight">{value}</p>
      <p className="text-xs text-texto-secundario mt-0.5 line-clamp-1">
        {label}
      </p>
    </button>
  );
}