// =============================================================================
// sections/StoreSection.tsx — Gestion del store del seller
// =============================================================================
// Modos:
//   - 'create': form para crear la tienda (POST /api/stores).
//       Se usa inline en la seccion "Mi tienda" si no hay tienda, Y
//       como modal desde Overview cuando un buyer hace click en
//       "Convertite en vendedor".
//   - 'view':   resumen read-only de la tienda existente. Muestra CTA a
//       /onboarding si falta location, link a la tienda publica.
//
// Props:
//   - lang
//   - mode: 'create' | 'view'
//   - asModal: cuando true, renderiza como overlay (no usa Section).
//   - onClose: para cerrar el modal.
//   - onSuccess: para que el parent refresque auth y navegue.
// =============================================================================

import { useEffect, useRef, useState } from 'react';
import {
  ExternalLink,
  MapPin,
  Save,
  Store as StoreIcon,
  X,
} from 'lucide-react';
import { useTranslations, localizePath } from '../../../i18n/utils';
import type { Lang } from '../../../i18n/ui';
import Section from '../shared/Section';
import { Field, TextareaField } from '../shared/Field';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface StoreSectionProps {
  lang: Lang;
  mode?: 'create' | 'view';
  asModal?: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
}

interface StoreRecord {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  department: string;
  address_text: string;
  cedula?: string;
  rut?: string;
  location: { lat: number; lon: number } | null;
}

const STORE_CATEGORIES = [
  { value: 'ceramica', label: 'Ceramica' },
  { value: 'textil', label: 'Textil' },
  { value: 'madera', label: 'Madera' },
  { value: 'cuero', label: 'Cuero' },
  { value: 'joyeria', label: 'Joyeria' },
  { value: 'cesteria', label: 'Cesteria' },
  { value: 'otro', label: 'Otro' },
] as const;

import { csrfHeaders } from '@/lib/csrf-client';

const DEPARTMENTS = [
  'Boaco',
  'Carazo',
  'Chinandega',
  'Chontales',
  'Esteli',
  'Granada',
  'Jinotega',
  'Leon',
  'Madriz',
  'Managua',
  'Masaya',
  'Matagalpa',
  'Nueva Segovia',
  'Rio San Juan',
  'RAAN',
  'RAAS',
  'Rivas',
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

export default function StoreSection({
  lang,
  mode = 'view',
  asModal = false,
  onClose,
  onSuccess,
}: StoreSectionProps) {
  const t = useTranslations(lang);
  // tRef para evitar loop infinito: useTranslations retorna funcion nueva
  // cada render; en deps de useEffect causa fetch eterno.
  const tRef = useRef(t);
  tRef.current = t;

  const l = (path: string) => localizePath(path, lang);

  const [store, setStore] = useState<StoreRecord | null>(null);
  const [loading, setLoading] = useState(mode === 'view');
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Create form state
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugDirty, setSlugDirty] = useState(false);
  const [cedula, setCedula] = useState('');
  const [rut, setRut] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>('ceramica');
  const [department, setDepartment] = useState<string>('Managua');
  const [addressText, setAddressText] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [slugError, setSlugError] = useState<string | null>(null);

  // Fetch existing store via single direct endpoint GET /api/stores/mine
  useEffect(() => {
    if (mode !== 'view') return;
    let aborted = false;
    (async () => {
      try {
        const res = await fetch('/api/stores/mine', {
          headers: { Origin: window.location.origin, ...csrfHeaders() },
          credentials: 'include',
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        if (aborted) return;

        if (data.store) {
          setStore(data.store as StoreRecord);
        }
        setLoading(false);
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
  }, [mode]);

  // Auto-fill slug from name (only if user hasn't touched it).
  useEffect(() => {
    if (mode !== 'create' || slugDirty) return;
    setSlug(slugify(name));
  }, [name, mode, slugDirty]);

  // Submit create form.
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    setSlugError(null);
    setSuccess(false);

    try {
      const res = await fetch('/api/stores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: window.location.origin,
          ...csrfHeaders(),
        },
        credentials: 'include',
        body: JSON.stringify({
          name,
          slug,
          description,
          cedula,
          rut,
          category,
          department,
          address_text: addressText,
          // location se setea despues via /onboarding.
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.error === 'slug_taken') {
          setSlugError(t('profile.store.slugTaken'));
          throw new Error(t('profile.store.slugTaken'));
        }
        throw new Error(data.error || t('profile.store.create.error'));
      }
      setSuccess(true);
      setTimeout(() => {
        onSuccess?.();
      }, 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('profile.store.create.error'));
    } finally {
      setSaving(false);
    }
  };

  // =============== VIEW MODE: read-only summary ===============
  if (mode === 'view' && !asModal) {
    if (loading) return <Section loading />;
    if (!store) {
      // Sin tienda: mostrar empty state con CTA al modal de creacion.
      return (
        <Section title={t('profile.store.title')}>
          <div className="bg-blanco border border-borde rounded-2xl p-8 text-center max-w-lg mx-auto my-4 shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
              <StoreIcon className="size-8" />
            </div>
            <h3 className="text-xl font-bold text-texto mb-2">
              {t('profile.store.noStore.title')}
            </h3>
            <p className="text-sm text-texto-secundario mb-6 leading-relaxed">
              {t('profile.store.noStore.body')}
            </p>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-semibold hover:bg-primary-dark transition-all shadow-sm hover:shadow-md cursor-pointer hover:-translate-y-0.5"
            >
              <StoreIcon className="size-4" />
              {t('profile.store.createCta')}
            </button>
          </div>

          {showCreateModal && (
            <StoreSection
              lang={lang}
              mode="create"
              asModal
              onClose={() => setShowCreateModal(false)}
              onSuccess={() => {
                setShowCreateModal(false);
                window.location.reload();
              }}
            />
          )}
        </Section>
      );
    }

    const hasLocation = !!store.location;

    return (
      <Section
        title={t('profile.store.title')}
        actions={
          <a
            href={l(`/tiendas/${store.slug}`)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary-dark"
          >
            {t('profile.store.viewPublic')}
            <ExternalLink className="size-4" />
          </a>
        }
      >
        <div className="bg-blanco border border-borde rounded-xl p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoRow label={t('profile.store.fields.name')} value={store.name} />
            <InfoRow label={t('profile.store.fields.slug')} value={store.slug} mono />
            {store.cedula && (
              <InfoRow label={t('profile.store.fields.cedula')} value={store.cedula} mono />
            )}
            {store.rut && (
              <InfoRow label={t('profile.store.fields.rut')} value={store.rut} mono />
            )}
            <InfoRow
              label={t('profile.store.fields.category')}
              value={store.category}
            />
            <InfoRow
              label={t('profile.store.fields.department')}
              value={store.department}
            />
          </div>
          {store.description && (
            <InfoRow
              label={t('profile.store.fields.description')}
              value={store.description}
              multiline
            />
          )}
          {store.address_text && (
            <InfoRow
              label={t('profile.store.fields.address')}
              value={store.address_text}
            />
          )}
        </div>

        {/* Location status */}
        <div
          className={`border rounded-xl p-4 flex items-start justify-between gap-4 ${
            hasLocation
              ? 'bg-primary/5 border-primary/20'
              : 'bg-accent border-borde'
          }`}
        >
          <div className="flex items-start gap-3">
            <MapPin
              className={`size-5 shrink-0 mt-0.5 ${
                hasLocation ? 'text-primary' : 'text-texto-secundario'
              }`}
            />
            <div>
              <p className="font-medium text-sm">
                {hasLocation
                  ? t('profile.store.location.set')
                  : t('profile.store.location.missing')}
              </p>
              {hasLocation && store.location && (
                <p className="text-xs text-texto-secundario mt-0.5">
                  {store.location.lat.toFixed(4)}, {store.location.lon.toFixed(4)}
                </p>
              )}
            </div>
          </div>
          <a
            href={l('/onboarding')}
            className="shrink-0 inline-flex items-center gap-1.5 bg-primary text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors"
          >
            {hasLocation ? 'Actualizar' : t('profile.store.location.setCta')}
          </a>
        </div>
      </Section>
    );
  }

  // =============== CREATE MODE (modal or inline) ===============
  if (asModal) {
    return (
      <Dialog open={true} onOpenChange={(open) => { if (!open) onClose?.(); }}>
        <DialogContent className="sm:max-w-lg max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden border border-amber-200/60 shadow-2xl">
          <DialogHeader className="p-6 pb-4 border-b border-borde bg-gradient-to-r from-amber-50/40 via-white to-orange-50/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <StoreIcon className="size-5" />
              </div>
              <div className="pr-6">
                <DialogTitle className="text-xl font-bold text-texto">
                  {t('profile.store.createCta')}
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm text-texto-secundario mt-0.5">
                  {t('profile.store.noStore.body')}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <ScrollArea className="h-[420px] sm:h-[460px] w-full" type="always">
              <div className="px-6 pt-4 pb-6 space-y-4">
                <Field
                  label={t('profile.store.fields.name')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  minLength={2}
                  maxLength={200}
                />

                <Field
                  label={t('profile.store.fields.slug')}
                  value={slug}
                  onChange={(e) => {
                    setSlug(e.target.value);
                    setSlugDirty(true);
                  }}
                  helper={t('profile.store.fields.slugHelp')}
                  required
                  error={slugError ?? undefined}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field
                    label={t('profile.store.fields.cedula')}
                    value={cedula}
                    onChange={(e) => setCedula(e.target.value)}
                    placeholder={t('profile.store.fields.cedulaPlaceholder')}
                    required
                    maxLength={30}
                  />

                  <Field
                    label={t('profile.store.fields.rut')}
                    value={rut}
                    onChange={(e) => setRut(e.target.value)}
                    placeholder={t('profile.store.fields.rutPlaceholder')}
                    required
                    maxLength={30}
                  />
                </div>

                <TextareaField
                  label={t('profile.store.fields.description')}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  optional
                  maxLength={2000}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-texto">
                      {t('profile.store.fields.category')}
                      <span className="text-error ml-1">*</span>
                    </label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="w-full h-11 bg-blanco border-borde rounded-xl font-medium focus:ring-primary/40 focus:border-primary">
                        <SelectValue placeholder={t('profile.store.fields.category')} />
                      </SelectTrigger>
                      <SelectContent className="z-[70] max-h-64">
                        {STORE_CATEGORIES.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-texto">
                      {t('profile.store.fields.department')}
                      <span className="text-error ml-1">*</span>
                    </label>
                    <Select value={department} onValueChange={setDepartment}>
                      <SelectTrigger className="w-full h-11 bg-blanco border-borde rounded-xl font-medium focus:ring-primary/40 focus:border-primary">
                        <div className="flex items-center gap-2 truncate">
                          <MapPin className="size-4 text-primary shrink-0" />
                          <SelectValue placeholder={t('profile.store.fields.department')} />
                        </div>
                      </SelectTrigger>
                      <SelectContent className="z-[70] max-h-64">
                        {DEPARTMENTS.map((d) => (
                          <SelectItem key={d} value={d}>
                            {d}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Field
                  label={t('profile.store.fields.address')}
                  value={addressText}
                  onChange={(e) => setAddressText(e.target.value)}
                  optional
                  maxLength={500}
                  placeholder="Ej: Frente al Parque Central, Masaya"
                />

                <div className="text-xs text-amber-900/80 bg-amber-50/70 border border-amber-200/70 rounded-xl p-3 flex items-start gap-2">
                  <MapPin className="size-4 shrink-0 text-primary mt-0.5" />
                  <span>
                    La ubicación geográfica en el mapa la podés configurar después de crear la tienda.
                  </span>
                </div>

                {error && (
                  <p role="alert" className="text-sm font-medium text-error bg-red-50 p-3 rounded-lg border border-red-200">
                    {error}
                  </p>
                )}
                {success && (
                  <p role="alert" className="text-sm font-medium text-exito bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                    {t('profile.store.create.success')}
                  </p>
                )}
              </div>
            </ScrollArea>

            <DialogFooter className="p-4 sm:p-5 border-t border-borde bg-fondo/50 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm font-medium text-texto-secundario hover:text-texto hover:bg-stone-100 transition-colors cursor-pointer"
              >
                {t('profile.common.cancel')}
              </button>
              <button
                type="submit"
                disabled={saving}
                aria-busy={saving}
                className="inline-flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 shadow-sm cursor-pointer"
              >
                <Save className="size-4" />
                {saving ? t('profile.common.saving') : t('profile.store.createCta')}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Section title={t('profile.store.title')}>
      <form
        onSubmit={handleSubmit}
        className="space-y-4 bg-blanco border border-borde rounded-xl p-6"
      >
        <Field
          label={t('profile.store.fields.name')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={2}
          maxLength={200}
        />

        <Field
          label={t('profile.store.fields.slug')}
          value={slug}
          onChange={(e) => {
            setSlug(e.target.value);
            setSlugDirty(true);
          }}
          helper={t('profile.store.fields.slugHelp')}
          required
          error={slugError ?? undefined}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label={t('profile.store.fields.cedula')}
            value={cedula}
            onChange={(e) => setCedula(e.target.value)}
            placeholder={t('profile.store.fields.cedulaPlaceholder')}
            required
            maxLength={30}
          />

          <Field
            label={t('profile.store.fields.rut')}
            value={rut}
            onChange={(e) => setRut(e.target.value)}
            placeholder={t('profile.store.fields.rutPlaceholder')}
            required
            maxLength={30}
          />
        </div>

        <TextareaField
          label={t('profile.store.fields.description')}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          optional
          maxLength={2000}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-texto">
              {t('profile.store.fields.category')}
              <span className="text-error ml-1">*</span>
            </label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full h-11 bg-blanco border-borde rounded-xl font-medium focus:ring-primary/40 focus:border-primary">
                <SelectValue placeholder={t('profile.store.fields.category')} />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {STORE_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-texto">
              {t('profile.store.fields.department')}
              <span className="text-error ml-1">*</span>
            </label>
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger className="w-full h-11 bg-blanco border-borde rounded-xl font-medium focus:ring-primary/40 focus:border-primary">
                <div className="flex items-center gap-2 truncate">
                  <MapPin className="size-4 text-primary shrink-0" />
                  <SelectValue placeholder={t('profile.store.fields.department')} />
                </div>
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {DEPARTMENTS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Field
          label={t('profile.store.fields.address')}
          value={addressText}
          onChange={(e) => setAddressText(e.target.value)}
          optional
          maxLength={500}
          placeholder="Ej: Frente al Parque Central, Granada"
        />

        <p className="text-xs text-texto-secundario bg-fondo border border-borde rounded-lg p-3">
          <MapPin className="size-3.5 inline mr-1" />
          La ubicacion en el mapa la podes configurar despues de crear la tienda.
        </p>

        {error && (
          <p role="alert" className="text-sm text-error">
            {error}
          </p>
        )}
        {success && (
          <p role="alert" className="text-sm text-exito">
            {t('profile.store.create.success')}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="submit"
            disabled={saving}
            aria-busy={saving}
            className="inline-flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            <Save className="size-4" />
            {saving ? t('profile.common.saving') : t('profile.store.createCta')}
          </button>
        </div>
      </form>
    </Section>
  );
}

// =============================================================================
// InfoRow — read-only label/value pair
// =============================================================================
function InfoRow({
  label,
  value,
  mono,
  multiline,
}: {
  label: string;
  value: string;
  mono?: boolean;
  multiline?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-texto-secundario uppercase tracking-wide mb-1">
        {label}
      </p>
      <p
        className={`text-sm text-texto ${mono ? 'font-mono' : ''} ${
          multiline ? 'whitespace-pre-line' : ''
        }`}
      >
        {value}
      </p>
    </div>
  );
}