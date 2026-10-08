// =============================================================================
// sections/OrdersSection.tsx — Historial de pedidos del usuario actual
// =============================================================================
// Lista las ordenes del user (via /api/orders). Muestra status badge, total,
// items count y direccion de envio.
// =============================================================================

import { useEffect, useRef, useState } from 'react';
import { ShoppingBag } from 'lucide-react';
import { useTranslations } from '../../../i18n/utils';
import type { Lang } from '../../../i18n/ui';
import Section from '../shared/Section';

interface OrdersSectionProps {
  lang: Lang;
}

interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

interface ShippingAddress {
  full_name?: string;
  city?: string;
  department?: string;
  country?: string;
}

interface Order {
  id: string;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
  shipping_address?: ShippingAddress;
  payment_method?: string;
  created: string;
  created_at?: string;
}

import { csrfHeaders } from '@/lib/csrf-client';

const STATUS_MAP = {
  pending: { cls: 'bg-accent-amber/10 text-accent-amber', icon: '⏳' },
  paid: { cls: 'bg-secondary/10 text-secondary', icon: '✓' },
  shipped: { cls: 'bg-accent-blue/10 text-accent-blue', icon: '📦' },
  delivered: { cls: 'bg-exito/10 text-exito', icon: '✓✓' },
  cancelled: { cls: 'bg-error/10 text-error', icon: '✕' },
} as const;

export default function OrdersSection({ lang }: OrdersSectionProps) {
  const t = useTranslations(lang);
  // tRef para evitar loop infinito: useTranslations retorna una función
  // nueva en cada render; meterla en deps del useEffect causa re-fetch
  // eterno.
  const tRef = useRef(t);
  tRef.current = t;

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let aborted = false;
    (async () => {
      try {
        const res = await fetch('/api/orders?perPage=50', {
          headers: { Origin: window.location.origin, ...csrfHeaders() },
          credentials: 'include',
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        // /api/orders returns either a list or {items: []} depending on version.
        const items = Array.isArray(data) ? data : data.items ?? [];
        if (!aborted) {
          setOrders(items);
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

  return (
    <Section
      title={t('profile.orders.title')}
      loading={loading}
      error={error}
    >
      {orders.length === 0 && !loading ? (
        <div className="bg-blanco border border-borde rounded-xl p-10 text-center">
          <ShoppingBag className="size-12 text-primary mx-auto mb-3" />
          <p className="text-texto-secundario mb-4">
            {t('profile.orders.empty')}
          </p>
          <a
            href={lang === 'es' ? '/productos' : `/${lang}/productos`}
            className="inline-flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-primary-dark transition-colors"
          >
            {t('profile.orders.viewProducts')}
          </a>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} lang={lang} />
          ))}
        </div>
      )}
    </Section>
  );
}

// =============================================================================
// OrderCard — tarjeta de orden con status, items, total, direccion
// =============================================================================
function OrderCard({ order, lang }: { order: Order; lang: Lang }) {
  const t = useTranslations(lang);
  const statusInfo = STATUS_MAP[order.status] ?? STATUS_MAP.pending;
  const dateStr = new Date(order.created_at ?? order.created).toLocaleDateString(
    lang === 'en' ? 'en-US' : 'es-NI'
  );

  return (
    <article className="bg-blanco border border-borde rounded-xl p-4 md:p-5">
      <header className="flex items-start justify-between gap-3 flex-wrap mb-3">
        <div>
          <p className="text-xs text-texto-secundario mb-0.5">
            {t('profile.orders.date')}
          </p>
          <p className="text-sm font-medium text-texto">{dateStr}</p>
        </div>
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${statusInfo.cls}`}
        >
          <span aria-hidden="true">{statusInfo.icon}</span>
          {t(`profile.orders.status.${order.status}`)}
        </span>
      </header>

      {/* Items */}
      <div className="space-y-1 mb-3">
        {(order.items ?? []).map((it, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between text-sm gap-3"
          >
            <span className="text-texto truncate">
              {it.name}{' '}
              <span className="text-texto-secundario">
                × {it.quantity}
              </span>
            </span>
            <span className="text-texto-secundario whitespace-nowrap">
              C$ {(it.price * it.quantity).toFixed(2)}
            </span>
          </div>
        ))}
      </div>

      <footer className="flex items-center justify-between gap-3 flex-wrap pt-3 border-t border-borde">
        {order.shipping_address && (
          <div className="text-xs text-texto-secundario">
            <p className="font-medium text-texto mb-0.5">
              {t('profile.orders.shippingTo')} {order.shipping_address.full_name}
            </p>
            <p>
              {order.shipping_address.city}, {order.shipping_address.department}
            </p>
          </div>
        )}
        <div className="flex items-center gap-4 ml-auto">
          <p className="text-right">
            <span className="text-xs text-texto-secundario block">
              {t('profile.orders.total')}
            </span>
            <span className="text-lg font-bold text-primary">
              C$ {Number(order.total).toFixed(2)}
            </span>
          </p>
          <a
            href={lang === 'es' ? `/orden/${order.id}` : `/${lang}/orden/${order.id}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/30 text-primary hover:bg-primary/5 text-xs font-semibold transition-colors"
          >
            <span>{t('profile.orders.viewReceipt')}</span>
            <span>→</span>
          </a>
        </div>
      </footer>
    </article>
  );
}