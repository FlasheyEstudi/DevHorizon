// =============================================================================
// sections/DashboardSection.tsx — Dashboard completo del seller
// =============================================================================
// Muestra stats detalladas desde /api/dashboard/stats:
//   - 4 stat cards grandes (productos, pedidos, ingresos, rating)
//   - Breakdown de orders por status (5 contadores con icono + color)
//   - Revenue: total / este mes / mes pasado
// =============================================================================

import { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  DollarSign,
  Package,
  Star,
  Truck,
  XCircle,
} from 'lucide-react';
import { useTranslations } from '../../../i18n/utils';
import type { Lang } from '../../../i18n/ui';
import Section from '../shared/Section';
import { csrfHeaders } from '@/lib/csrf-client';

interface DashboardSectionProps {
  lang: Lang;
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

export default function DashboardSection({ lang }: DashboardSectionProps) {
  const t = useTranslations(lang);
  // tRef para evitar loop infinito (useTranslations retorna funcion nueva
  // cada render; si va en deps del useEffect, el fetch se re-dispara).
  const tRef = useRef(t);
  tRef.current = t;

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let aborted = false;
    (async () => {
      try {
        const res = await fetch('/api/dashboard/stats', {
          headers: { Origin: window.location.origin, ...csrfHeaders() },
          credentials: 'include',
        });
        if (!res.ok) {
          if (res.status === 404) {
            // No store yet.
            if (!aborted) setLoading(false);
            return;
          }
          throw new Error(await res.text());
        }
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
  }, []);

  if (loading) return <Section loading />;
  if (!stats) {
    return (
      <Section title={t('profile.dashboard.title')}>
        <p className="text-texto-secundario text-center py-8">
          {t('profile.dashboard.empty')}
        </p>
      </Section>
    );
  }

  return (
    <Section title={t('profile.dashboard.title')} error={error}>
      {/* Top stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <BigStat
          icon={<Package className="size-5 text-primary" />}
          label={t('profile.dashboard.products.total')}
          value={stats.products.total}
          sublabel={`${stats.products.published} ${t('profile.dashboard.products.published')} · ${stats.products.draft} ${t('profile.dashboard.products.draft')}`}
        />
        <BigStat
          icon={<Truck className="size-5 text-primary" />}
          label={t('profile.dashboard.orders.total')}
          value={stats.orders.total}
        />
        <BigStat
          icon={<DollarSign className="size-5 text-primary" />}
          label={t('profile.dashboard.revenue.total')}
          value={`C$ ${stats.revenue.total.toFixed(2)}`}
          sublabel={`${t('profile.dashboard.revenue.thisMonth')}: C$ ${stats.revenue.thisMonth.toFixed(2)} · ${t('profile.dashboard.revenue.lastMonth')}: C$ ${stats.revenue.lastMonth.toFixed(2)}`}
        />
        <BigStat
          icon={<Star className="size-5 text-rating" />}
          label={t('profile.dashboard.reviews.avg')}
          value={stats.reviews.avg > 0 ? stats.reviews.avg.toFixed(1) : '-'}
          sublabel={t('profile.dashboard.reviews.count').replace('{n}', String(stats.reviews.count))}
        />
      </div>

      {/* Orders by status */}
      <div className="bg-blanco border border-borde rounded-xl p-6">
        <h3 className="font-semibold text-texto mb-4">
          {t('profile.dashboard.orders.title')}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatusCounter
            icon={<Clock className="size-4" />}
            label={t('profile.dashboard.status.pending')}
            value={stats.orders.byStatus.pending}
            color="text-accent-amber"
          />
          <StatusCounter
            icon={<CheckCircle2 className="size-4" />}
            label={t('profile.dashboard.status.paid')}
            value={stats.orders.byStatus.paid}
            color="text-secondary"
          />
          <StatusCounter
            icon={<Truck className="size-4" />}
            label={t('profile.dashboard.status.shipped')}
            value={stats.orders.byStatus.shipped}
            color="text-accent-blue"
          />
          <StatusCounter
            icon={<CheckCircle2 className="size-4" />}
            label={t('profile.dashboard.status.delivered')}
            value={stats.orders.byStatus.delivered}
            color="text-exito"
          />
          <StatusCounter
            icon={<XCircle className="size-4" />}
            label={t('profile.dashboard.status.cancelled')}
            value={stats.orders.byStatus.cancelled}
            color="text-error"
          />
        </div>
      </div>

      {/* Revenue breakdown */}
      <div className="bg-blanco border border-borde rounded-xl p-6">
        <h3 className="font-semibold text-texto mb-4">
          {t('profile.dashboard.revenue.total')}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <RevenueCard
            label={t('profile.dashboard.revenue.total')}
            value={stats.revenue.total}
            highlight
          />
          <RevenueCard
            label={t('profile.dashboard.revenue.thisMonth')}
            value={stats.revenue.thisMonth}
          />
          <RevenueCard
            label={t('profile.dashboard.revenue.lastMonth')}
            value={stats.revenue.lastMonth}
          />
        </div>
      </div>
    </Section>
  );
}

// =============================================================================
// BigStat — stat card grande con icono + valor + sublabel opcional
// =============================================================================
function BigStat({
  icon,
  label,
  value,
  sublabel,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sublabel?: string;
}) {
  return (
    <div className="bg-blanco border border-borde rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
          {icon}
        </div>
        <p className="text-xs font-medium text-texto-secundario uppercase tracking-wide">
          {label}
        </p>
      </div>
      <p className="text-2xl font-bold text-texto leading-tight">{value}</p>
      {sublabel && (
        <p className="text-xs text-texto-secundario mt-1 line-clamp-2">
          {sublabel}
        </p>
      )}
    </div>
  );
}

// =============================================================================
// StatusCounter — contador chico con icono + color por status
// =============================================================================
function StatusCounter({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2.5 bg-fondo rounded-lg p-3">
      <span className={color}>{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-texto-secundario truncate">{label}</p>
        <p className="text-lg font-bold text-texto leading-tight">{value}</p>
      </div>
    </div>
  );
}

// =============================================================================
// RevenueCard — tarjeta de revenue con highlight opcional
// =============================================================================
function RevenueCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg p-4 ${
        highlight
          ? 'bg-primary text-primary-foreground'
          : 'bg-fondo text-texto'
      }`}
    >
      <p
        className={`text-xs uppercase tracking-wide font-medium ${
          highlight ? 'opacity-80' : 'text-texto-secundario'
        }`}
      >
        {label}
      </p>
      <p className="text-2xl font-bold mt-1">C$ {value.toFixed(2)}</p>
    </div>
  );
}