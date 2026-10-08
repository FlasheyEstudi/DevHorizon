// =============================================================================
// sections/ProductsSection.tsx — Gestion de productos del seller
// =============================================================================
// - Lista de productos del store actual (via GET /api/products?owner=me).
// - Boton "Nuevo producto" abre Drawer con form de creacion.
// - Boton "Editar" abre Drawer con form pre-poblado (PUT /api/products/[id]).
// - Boton "Eliminar" abre Drawer chico de confirmacion (DELETE).
// =============================================================================

import { useEffect, useRef, useState, useMemo } from 'react';
import {
  Edit2,
  Plus,
  Minus,
  Trash2,
  Package,
  Camera,
  Search,
  Eye,
  EyeOff,
  Loader2,
  ExternalLink,
  Archive,
} from 'lucide-react';
import { useTranslations } from '../../../i18n/utils';
import type { Lang } from '../../../i18n/ui';
import Section from '../shared/Section';
import { Field, SelectField, TextareaField } from '../shared/Field';
import Drawer from '../shared/Drawer';
import { pbFileUrl } from '@lib/pb-url';
import { toast } from '@lib/stores/toast';
import { csrfHeaders } from '@/lib/csrf-client';

interface ProductsSectionProps {
  lang: Lang;
}

interface ProductRecord {
  id: string;
  collectionId?: string;
  collectionName?: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  stock: number;
  status: 'draft' | 'published' | 'archived';
  categories: string[];
  tags: string[];
  images?: string[];
  rating_avg: number;
  rating_count: number;
  store: string;
}

interface ProductFormData {
  name: string;
  slug: string;
  description: string;
  price: string;
  stock: string;
  status: 'draft' | 'published' | 'archived';
  categories: string[];
  tags: string;
  /** Local preview URL (object URL) cuando el user selecciona imagen nueva. */
  imagePreview: string | null;
  /** File real cuando el user selecciona imagen nueva. */
  imageFile: File | null;
}

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Borrador' },
  { value: 'published', label: 'Publicado' },
  { value: 'archived', label: 'Archivado' },
] as const;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function emptyForm(): ProductFormData {
  return {
    name: '',
    slug: '',
    description: '',
    price: '',
    stock: '0',
    status: 'draft',
    categories: [],
    tags: '',
    imagePreview: null,
    imageFile: null,
  };
}

function productToForm(p: ProductRecord): ProductFormData {
  return {
    name: p.name,
    slug: p.slug,
    description: p.description,
    price: String(p.price),
    stock: String(p.stock),
    status: p.status,
    categories: Array.isArray(p.categories) ? p.categories : [],
    tags: (p.tags ?? []).join(', '),
    imagePreview: null,
    imageFile: null,
  };
}

export default function ProductsSection({ lang }: ProductsSectionProps) {
  const t = useTranslations(lang);
  // tRef para evitar loop infinito: useTranslations retorna una función
  // nueva en cada render; meterla en deps del useEffect causaría que el
  // fetch se re-dispare eternamente.
  const tRef = useRef(t);
  tRef.current = t;

  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Filtros rápidos del panel de inventario
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft' | 'outOfStock'>('all');
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let aborted = false;
    (async () => {
      try {
        const res = await fetch('/api/products?owner=me&perPage=100', {
          headers: { Origin: window.location.origin, ...csrfHeaders() },
          credentials: 'include',
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        if (!aborted) {
          setProducts(data.items ?? []);
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

  const reload = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/products?owner=me&perPage=100', {
        headers: { Origin: window.location.origin, ...csrfHeaders() },
        credentials: 'include',
      });
      const data = await res.json();
      setProducts(data.items ?? []);
    } catch {
      setError(t('profile.common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleNew = () => {
    setEditingId(null);
    setDrawerOpen(true);
  };

  const handleEdit = (id: string) => {
    setEditingId(id);
    setDrawerOpen(true);
  };

  // Edición rápida de stock en línea
  const handleQuickStockChange = async (productId: string, newStock: number): Promise<boolean> => {
    const prevProducts = [...products];
    const targetProduct = products.find((p) => p.id === productId);
    if (!targetProduct || targetProduct.stock === newStock) return true;

    // Actualización optimista de la UI
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, stock: newStock } : p))
    );
    setUpdatingIds((prev) => new Set(prev).add(productId));

    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Origin: window.location.origin,
          ...csrfHeaders(),
        },
        credentials: 'include',
        body: JSON.stringify({ stock: newStock }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Error al actualizar el stock');
      }

      toast.success(`${t('profile.inventory.quickStock.updated')} (${targetProduct.name}: ${newStock})`);
      return true;
    } catch (err) {
      setProducts(prevProducts);
      toast.error(err instanceof Error ? err.message : 'Error al actualizar el stock');
      return false;
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }
  };

  // Cambio rápido de estado publicado/borrador en línea
  const handleQuickStatusChange = async (productId: string, newStatus: ProductRecord['status']): Promise<boolean> => {
    const prevProducts = [...products];
    const targetProduct = products.find((p) => p.id === productId);
    if (!targetProduct || targetProduct.status === newStatus) return true;

    // Actualización optimista de la UI
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, status: newStatus } : p))
    );
    setUpdatingIds((prev) => new Set(prev).add(productId));

    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Origin: window.location.origin,
          ...csrfHeaders(),
        },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Error al actualizar el estado');
      }

      const statusName =
        newStatus === 'published'
          ? t('profile.products.status.published')
          : t('profile.products.status.draft');
      toast.success(`${t('profile.inventory.quickStatus.updated')} "${statusName}" (${targetProduct.name})`);
      return true;
    } catch (err) {
      setProducts(prevProducts);
      toast.error(err instanceof Error ? err.message : 'Error al actualizar el estado');
      return false;
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingId || deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/products/${deletingId}`, {
        method: 'DELETE',
        headers: {
          Origin: window.location.origin,
          ...csrfHeaders(),
        },
        credentials: 'include',
      });
      if (!res.ok && res.status !== 204) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || t('profile.products.error.delete'));
      }
      setDeletingId(null);
      await reload();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : t('profile.products.error.delete'));
    } finally {
      setDeleting(false);
    }
  };

  const editingProduct = editingId
    ? products.find((p) => p.id === editingId) ?? null
    : null;

  // Estadísticas del inventario
  const stats = useMemo(() => {
    const total = products.length;
    const published = products.filter((p) => p.status === 'published').length;
    const draft = products.filter((p) => p.status === 'draft').length;
    const outOfStock = products.filter((p) => (p.stock ?? 0) === 0).length;
    const lowStock = products.filter((p) => (p.stock ?? 0) > 0 && (p.stock ?? 0) <= 5).length;
    return { total, published, draft, outOfStock, lowStock };
  }, [products]);

  // Lista filtrada por pestaña y buscador
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (statusFilter === 'published' && p.status !== 'published') return false;
      if (statusFilter === 'draft' && p.status !== 'draft') return false;
      if (statusFilter === 'outOfStock' && (p.stock ?? 0) > 0) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesSlug = p.slug.toLowerCase().includes(q);
        const matchesTags = (p.tags ?? []).some((tag) => tag.toLowerCase().includes(q));
        if (!matchesName && !matchesSlug && !matchesTags) return false;
      }

      return true;
    });
  }, [products, statusFilter, searchQuery]);

  return (
    <Section
      title={t('profile.products.title')}
      loading={loading && products.length === 0}
      error={error}
      actions={
        products.length > 0 && (
          <button
            type="button"
            onClick={handleNew}
            className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-dark transition-colors shadow-xs"
          >
            <Plus className="size-4" />
            {t('profile.products.newCta')}
          </button>
        )
      }
    >
      {products.length === 0 && !loading ? (
        <div className="bg-blanco border border-borde rounded-xl p-10 text-center">
          <Package className="size-12 text-primary mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-texto mb-1">
            {t('profile.products.empty.title')}
          </h3>
          <p className="text-sm text-texto-secundario mb-5">
            {t('profile.products.empty.body')}
          </p>
          <button
            type="button"
            onClick={handleNew}
            className="inline-flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-primary-dark transition-colors"
          >
            <Plus className="size-4" />
            {t('profile.products.empty.cta')}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Tarjetas KPI de Inventario */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-blanco border border-borde rounded-xl p-3 sm:p-4 shadow-xs">
              <span className="text-xs text-texto-secundario block font-medium">
                {t('profile.inventory.stats.total')}
              </span>
              <span className="text-xl sm:text-2xl font-bold text-texto mt-1 block">
                {stats.total}
              </span>
            </div>
            <div className="bg-blanco border border-borde rounded-xl p-3 sm:p-4 shadow-xs">
              <span className="text-xs text-emerald-700 dark:text-emerald-400 block font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                {t('profile.inventory.stats.published')}
              </span>
              <span className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
                {stats.published}
              </span>
            </div>
            <div className="bg-blanco border border-borde rounded-xl p-3 sm:p-4 shadow-xs">
              <span className="text-xs text-slate-600 dark:text-slate-400 block font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                {t('profile.inventory.stats.draft')}
              </span>
              <span className="text-xl sm:text-2xl font-bold text-slate-700 dark:text-slate-300 mt-1 block">
                {stats.draft}
              </span>
            </div>
            <div className="bg-blanco border border-borde rounded-xl p-3 sm:p-4 shadow-xs">
              <span className="text-xs text-error block font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-error"></span>
                {t('profile.inventory.stats.lowStock')}
              </span>
              <span className="text-xl sm:text-2xl font-bold text-error mt-1 block">
                {stats.outOfStock + stats.lowStock}
              </span>
            </div>
          </div>

          {/* Barra de Búsqueda y Pestañas de Filtro */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  statusFilter === 'all'
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-blanco border border-borde text-texto-secundario hover:text-texto'
                }`}
              >
                {t('profile.inventory.filter.all')} ({stats.total})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('published')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  statusFilter === 'published'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-blanco border border-borde text-texto-secundario hover:text-texto'
                }`}
              >
                {t('profile.inventory.filter.published')} ({stats.published})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('draft')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  statusFilter === 'draft'
                    ? 'bg-slate-700 text-white shadow-xs'
                    : 'bg-blanco border border-borde text-texto-secundario hover:text-texto'
                }`}
              >
                {t('profile.inventory.filter.draft')} ({stats.draft})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('outOfStock')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  statusFilter === 'outOfStock'
                    ? 'bg-error text-white shadow-xs'
                    : 'bg-blanco border border-borde text-texto-secundario hover:text-texto'
                }`}
              >
                {t('profile.inventory.filter.outOfStock')} ({stats.outOfStock})
              </button>
            </div>

            <div className="relative min-w-[200px] sm:w-64">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-texto-secundario pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('profile.inventory.search')}
                className="w-full pl-9 pr-7 py-1.5 bg-blanco border border-borde rounded-lg text-xs text-texto placeholder:text-texto-secundario/70 focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-texto-secundario hover:text-texto text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Tabla de Productos con Control Rápido de Stock y Estado */}
          <div className="bg-blanco border border-borde rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-texto-secundario bg-fondo border-b border-borde">
                    <th className="px-4 py-3 font-medium">Producto</th>
                    <th className="px-4 py-3 font-medium">Precio</th>
                    <th className="px-4 py-3 font-medium">Stock Rápido</th>
                    <th className="px-4 py-3 font-medium">Visibilidad / Estado</th>
                    <th className="px-4 py-3 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borde">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-xs text-texto-secundario">
                        No se encontraron productos con los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p) => (
                      <tr key={p.id} className="hover:bg-fondo/40 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {p.images && p.images[0] ? (
                              <img
                                src={pbFileUrl(p.collectionId || 'products', p.id, p.images[0])}
                                alt={p.name}
                                className="w-11 h-11 rounded-lg object-cover border border-borde shrink-0"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-11 h-11 rounded-lg bg-borde/40 flex items-center justify-center text-texto-secundario shrink-0">
                                <Camera className="size-4" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="font-semibold text-texto line-clamp-1">{p.name}</p>
                                {p.status === 'published' && (
                                  <a
                                    href={lang === 'es' ? `/productos/${p.slug}` : `/${lang}/productos/${p.slug}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-texto-secundario hover:text-primary transition-colors shrink-0"
                                    title="Ver producto en la tienda pública"
                                  >
                                    <ExternalLink className="size-3" />
                                  </a>
                                )}
                              </div>
                              <p className="text-xs text-texto-secundario line-clamp-1">
                                {p.description || p.slug}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-semibold text-texto whitespace-nowrap">
                          C$ {Number(p.price).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <QuickStockControl
                            productId={p.id}
                            initialStock={p.stock}
                            disabled={updatingIds.has(p.id)}
                            onStockChange={handleQuickStockChange}
                          />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <QuickStatusToggle
                            productId={p.id}
                            currentStatus={p.status}
                            disabled={updatingIds.has(p.id)}
                            onStatusChange={handleQuickStatusChange}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleEdit(p.id)}
                              className="p-2 rounded-lg text-texto-secundario hover:text-primary hover:bg-primary/10 transition-colors"
                              aria-label={t('profile.products.actions.edit')}
                              title={t('profile.products.actions.edit')}
                            >
                              <Edit2 className="size-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDeletingId(p.id);
                                setDeleteError(null);
                              }}
                              className="p-2 rounded-lg text-texto-secundario hover:text-error hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                              aria-label={t('profile.products.actions.delete')}
                              title={t('profile.products.actions.delete')}
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Drawer */}
      <ProductDrawer
        lang={lang}
        open={drawerOpen}
        editing={editingProduct}
        onClose={() => {
          setDrawerOpen(false);
          setEditingId(null);
        }}
        onSaved={async () => {
          setDrawerOpen(false);
          setEditingId(null);
          await reload();
        }}
      />

      {/* Delete confirmation drawer */}
      <Drawer
        open={!!deletingId}
        onClose={() => setDeletingId(null)}
        title={t('profile.products.confirmDelete.title')}
        description={t('profile.products.confirmDelete.body')}
        footer={
          <>
            <button
              type="button"
              onClick={() => setDeletingId(null)}
              className="px-4 py-2.5 rounded-lg text-sm font-medium text-texto-secundario hover:text-texto"
            >
              {t('profile.common.cancel')}
            </button>
            <button
              type="button"
              onClick={handleDeleteConfirm}
              disabled={deleting}
              aria-busy={deleting}
              className="px-5 py-2.5 rounded-lg bg-error text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {deleting ? t('profile.common.saving') : t('profile.common.confirm')}
            </button>
          </>
        }
      >
        {deleteError && (
          <p role="alert" className="text-sm text-error">
            {deleteError}
          </p>
        )}
      </Drawer>
    </Section>
  );
}

// =============================================================================
// QuickStockControl — Control rápido de inventario interactivo
// =============================================================================
function QuickStockControl({
  productId,
  initialStock,
  disabled,
  onStockChange,
}: {
  productId: string;
  initialStock: number;
  disabled: boolean;
  onStockChange: (productId: string, newStock: number) => Promise<boolean>;
}) {
  const [stockVal, setStockVal] = useState(String(initialStock));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setStockVal(String(initialStock));
  }, [initialStock]);

  const commitChange = async (nextVal: number) => {
    const clamped = Math.max(0, Math.floor(nextVal));
    if (clamped === initialStock) {
      setStockVal(String(clamped));
      return;
    }
    setSaving(true);
    const ok = await onStockChange(productId, clamped);
    if (!ok) {
      setStockVal(String(initialStock));
    }
    setSaving(false);
  };

  const handleStep = (delta: number) => {
    const cur = parseInt(stockVal, 10) || 0;
    const next = Math.max(0, cur + delta);
    setStockVal(String(next));
    commitChange(next);
  };

  const handleBlur = () => {
    const parsed = parseInt(stockVal, 10);
    commitChange(isNaN(parsed) ? 0 : parsed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  const curNum = parseInt(stockVal, 10) || 0;

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="inline-flex items-center rounded-lg border border-borde bg-blanco dark:bg-fondo shadow-xs p-0.5">
        <button
          type="button"
          disabled={disabled || saving || curNum <= 0}
          onClick={() => handleStep(-1)}
          className="size-7 rounded-md flex items-center justify-center text-texto-secundario hover:text-texto hover:bg-fondo dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
          title="Disminuir stock"
        >
          <Minus className="size-3.5" />
        </button>
        <input
          type="number"
          min="0"
          value={stockVal}
          disabled={disabled || saving}
          onChange={(e) => setStockVal(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="w-12 text-center text-xs font-semibold text-texto focus:outline-none bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <button
          type="button"
          disabled={disabled || saving}
          onClick={() => handleStep(1)}
          className="size-7 rounded-md flex items-center justify-center text-texto-secundario hover:text-texto hover:bg-fondo dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
          title="Aumentar stock"
        >
          <Plus className="size-3.5" />
        </button>
        {saving && (
          <span className="pr-1 text-primary animate-spin">
            <Loader2 className="size-3" />
          </span>
        )}
      </div>

      {curNum === 0 ? (
        <span className="text-[10px] font-semibold text-error bg-error/10 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-error"></span>
          Agotado
        </span>
      ) : curNum <= 5 ? (
        <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
          Stock bajo ({curNum})
        </span>
      ) : (
        <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          En stock ({curNum})
        </span>
      )}
    </div>
  );
}

// =============================================================================
// QuickStatusToggle — Cambio rápido de estado y visibilidad
// =============================================================================
function QuickStatusToggle({
  productId,
  currentStatus,
  disabled,
  onStatusChange,
}: {
  productId: string;
  currentStatus: ProductRecord['status'];
  disabled: boolean;
  onStatusChange: (productId: string, newStatus: ProductRecord['status']) => Promise<boolean>;
}) {
  const [saving, setSaving] = useState(false);

  const toggleStatus = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled || saving) return;
    const nextStatus = currentStatus === 'published' ? 'draft' : 'published';
    setSaving(true);
    await onStatusChange(productId, nextStatus);
    setSaving(false);
  };

  const isPublished = currentStatus === 'published';
  const isDraft = currentStatus === 'draft';
  const isArchived = currentStatus === 'archived';

  return (
    <div className="inline-flex items-center gap-1.5">
      <button
        type="button"
        disabled={disabled || saving || isArchived}
        onClick={toggleStatus}
        title={
          isPublished
            ? 'Clic para pasar a Borrador (ocultar de la tienda)'
            : isDraft
            ? 'Clic para Publicar en la tienda'
            : 'Archivado'
        }
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all shadow-2xs border ${
          isPublished
            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
            : isDraft
            ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
            : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
        } ${saving ? 'opacity-60 cursor-wait' : 'cursor-pointer active:scale-95'}`}
      >
        {saving ? (
          <Loader2 className="size-3 animate-spin text-current" />
        ) : isPublished ? (
          <Eye className="size-3 text-emerald-600 dark:text-emerald-400" />
        ) : isDraft ? (
          <EyeOff className="size-3 text-slate-500" />
        ) : (
          <Archive className="size-3 text-red-500" />
        )}
        <span>{isPublished ? 'Publicado' : isDraft ? 'Borrador' : 'Archivado'}</span>
      </button>
    </div>
  );
}

// =============================================================================
// ProductDrawer — form de crear/editar
// =============================================================================
function ProductDrawer({
  lang,
  open,
  editing,
  onClose,
  onSaved,
}: {
  lang: Lang;
  open: boolean;
  editing: ProductRecord | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useTranslations(lang);
  const [form, setForm] = useState<ProductFormData>(emptyForm());
  const [availableCategories, setAvailableCategories] = useState<Array<{ id: string; name: string; slug: string }>>([]);
  const [slugDirty, setSlugDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slugError, setSlugError] = useState<string | null>(null);

  // Fetch available categories when drawer is opened
  useEffect(() => {
    if (!open) return;
    fetch('/api/categories')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.items)) {
          setAvailableCategories(data.items);
        }
      })
      .catch(() => {});
  }, [open]);

  // Reset form when drawer opens.
  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm(productToForm(editing));
      setSlugDirty(true);
    } else {
      setForm(emptyForm());
      setSlugDirty(false);
    }
    setError(null);
    setSlugError(null);
  }, [open, editing]);

  // Liberamos el object URL cuando cambia la imagen seleccionada o el
  // drawer se cierra (evita memory leak en browsers que no lo liberan
  // automaticamente al cambiar de src).
  useEffect(() => {
    return () => {
      if (form.imagePreview) URL.revokeObjectURL(form.imagePreview);
    };
  }, [form.imagePreview]);

  // Auto-fill slug from name (only in create mode).
  useEffect(() => {
    if (!open || editing || slugDirty) return;
    setForm((f) => ({ ...f, slug: slugify(f.name) }));
  }, [form.name, open, editing, slugDirty]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Liberar el anterior si lo habia.
    if (form.imagePreview) URL.revokeObjectURL(form.imagePreview);
    const preview = URL.createObjectURL(file);
    setForm((f) => ({ ...f, imageFile: file, imagePreview: preview }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    setSlugError(null);

    // Usamos FormData siempre — el backend acepta multipart, y asi
    // podemos incluir la imagen opcional sin bifurcar el flujo.
    const fd = new FormData();
    fd.append('name', form.name);
    fd.append('slug', form.slug);
    fd.append('description', form.description);
    fd.append('price', form.price || '0');
    fd.append('stock', form.stock || '0');
    fd.append('status', form.status);
    if (form.categories && form.categories.length > 0) {
      for (const catId of form.categories) {
        fd.append('categories', catId);
      }
    }
    fd.append(
      'tags',
      form.tags
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .join(',')
    );
    if (form.imageFile) {
      fd.append('images', form.imageFile);
    }

    try {
      const url = editing ? `/api/products/${editing.id}` : '/api/products';
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          // NO ponemos Content-Type: el browser lo setea con el boundary
          // correcto para multipart/form-data.
          Origin: window.location.origin,
          ...csrfHeaders(),
        },
        credentials: 'include',
        body: fd,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.error === 'slug_taken') {
          setSlugError('Ese slug ya esta en uso.');
          throw new Error('slug_taken');
        }
        throw new Error(data.error || t('profile.common.error'));
      }
      onSaved();
    } catch (err) {
      if (err instanceof Error && err.message === 'slug_taken') return;
      setError(err instanceof Error ? err.message : t('profile.common.error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={editing ? t('profile.products.actions.edit') : t('profile.products.newCta')}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-lg text-sm font-medium text-texto-secundario hover:text-texto"
          >
            {t('profile.common.cancel')}
          </button>
          <button
            type="submit"
            form="product-form"
            disabled={saving}
            aria-busy={saving}
            className="inline-flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            {saving ? t('profile.common.saving') : t('profile.common.save')}
          </button>
        </>
      }
    >
      <form id="product-form" onSubmit={handleSubmit} className="space-y-4">
        <Field
          label={t('profile.products.fields.name')}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
          minLength={2}
          maxLength={200}
        />
        <Field
          label={t('profile.products.fields.slug')}
          value={form.slug}
          onChange={(e) => {
            setForm({ ...form, slug: e.target.value });
            setSlugDirty(true);
          }}
          required
          error={slugError ?? undefined}
        />
        <TextareaField
          label={t('profile.products.fields.description')}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={4}
          optional
          maxLength={5000}
        />
        <div className="grid grid-cols-2 gap-4">
          <Field
            label={t('profile.products.fields.price')}
            type="number"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            required
            min="0"
            step="0.01"
          />
          <Field
            label={t('profile.products.fields.stock')}
            type="number"
            value={form.stock}
            onChange={(e) => setForm({ ...form, stock: e.target.value })}
            required
            min="0"
            step="1"
          />
        </div>
        <SelectField
          label={t('profile.products.fields.status')}
          value={form.status}
          onChange={(e) =>
            setForm({ ...form, status: e.target.value as ProductFormData['status'] })
          }
          options={STATUS_OPTIONS as unknown as Array<{ value: string; label: string }>}
        />

        {/* Categorías */}
        {availableCategories.length > 0 && (
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-texto mb-2">
              {t('profile.products.fields.categories') || 'Categorías'}
            </label>
            <div className="flex flex-wrap gap-1.5 p-2.5 rounded-xl border border-borde bg-fondo/50 max-h-40 overflow-y-auto">
              {availableCategories.map((c) => {
                const isSelected = form.categories.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setForm((f) => ({
                        ...f,
                        categories: isSelected
                          ? f.categories.filter((id) => id !== c.id)
                          : [...f.categories, c.id].slice(0, 5),
                      }));
                    }}
                    className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all ${
                      isSelected
                        ? 'bg-primary text-primary-foreground shadow-2xs font-semibold'
                        : 'bg-blanco text-texto-secundario hover:text-texto border border-borde hover:border-primary/40'
                    }`}
                  >
                    {isSelected ? '✓ ' : '+ '}
                    {c.name}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-texto-secundario mt-1">
              Selecciona hasta 5 categorías para clasificar tu producto.
            </p>
          </div>
        )}

        <Field
          label={t('profile.products.fields.tags')}
          value={form.tags}
          onChange={(e) => setForm({ ...form, tags: e.target.value })}
          optional
          placeholder="barro, tradicional, hecho-a-mano"
        />

        {/* Imagen */}
        <ImageField
          lang={lang}
          label={t('profile.products.fields.image')}
          help={t('profile.products.image.help')}
          previewUrl={form.imagePreview}
          currentUrl={
            editing && editing.images && editing.images.length > 0
              ? pbFileUrl(editing.collectionId || 'products', editing.id, editing.images[0])
              : null
          }
          hasNewImage={!!form.imageFile}
          onChange={handleImageChange}
        />

        {error && (
          <p role="alert" className="text-sm text-error">
            {error}
          </p>
        )}
      </form>
    </Drawer>
  );
}

// =============================================================================
// ImageField — file picker con preview.
// =============================================================================
function ImageField({
  label,
  help,
  previewUrl,
  currentUrl,
  hasNewImage,
  onChange,
}: {
  lang: Lang;
  label: string;
  help: string;
  /** Object URL del File seleccionado (preview inmediato). */
  previewUrl: string | null;
  /** URL de la imagen actual del producto (modo edicion). */
  currentUrl: string | null;
  hasNewImage: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  // Lo que se muestra: preview si hay nuevo, sino current si hay, sino placeholder.
  const displayUrl = previewUrl ?? currentUrl;
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-texto">{label}</label>
      <div className="flex items-start gap-4">
        <div className="w-24 h-24 rounded-lg border border-borde bg-fondo overflow-hidden flex items-center justify-center shrink-0">
          {displayUrl ? (
            <img
              src={displayUrl}
              alt="preview"
              className="w-full h-full object-cover"
            />
          ) : (
            <Camera className="size-6 text-texto-secundario" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={onChange}
            className="block w-full text-sm text-texto file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-primary file:text-white file:font-medium file:cursor-pointer hover:file:bg-primary-dark"
          />
          <p className="text-xs text-texto-secundario mt-1.5">{help}</p>
          {hasNewImage && (
            <p className="text-xs text-primary mt-1 font-medium">
              Nueva imagen seleccionada (reemplazara la actual al guardar).
            </p>
          )}
        </div>
      </div>
    </div>
  );
}