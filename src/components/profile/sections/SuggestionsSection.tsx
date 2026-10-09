// =============================================================================
// sections/SuggestionsSection.tsx — Sugerir categorias (panel del artesano)
// =============================================================================
// Permite al vendedor proponer una nueva categoria/subcategoria para revision
// del admin, y ver el estado de sus propuestas (pendiente/aprobada/rechazada).
//
// - Categorias candidatas a padre: GET /api/categories (publico).
// - Alta + listado propio: GET/POST /api/suggestions (solo propias).
//
// El admin las revisa en /admin (tab Sugerencias).
// =============================================================================

import { useEffect, useRef, useState } from 'react';
import { Lightbulb, Loader2, Send, Clock, CheckCircle2, XCircle } from 'lucide-react';
import type { Lang } from '../../../i18n/ui';
import { useTranslations } from '../../../i18n/utils';
import Section from '../shared/Section';
import { Field, SelectField, TextareaField } from '../shared/Field';
import { toast } from '../../../lib/stores/toast';
import { csrfHeaders } from '../../../lib/csrf-client';

interface CategoryRecord {
  id: string;
  name: string;
  slug: string;
}

interface SuggestionRecord {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_note?: string;
  created_at?: string;
  expand?: { parent?: { name?: string } };
}

interface FormState {
  name: string;
  slug: string;
  icon: string;
  parent: string;
  description: string;
}

const EMPTY_FORM: FormState = { name: '', slug: '', icon: '', parent: '', description: '' };

export default function SuggestionsSection({ lang }: { lang: Lang }) {
  const t = useTranslations(lang);
  const tRef = useRef(t);
  tRef.current = t;

  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [items, setItems] = useState<SuggestionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadSuggestions = () =>
    fetch('/api/suggestions', { credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) throw new Error('failed');
        return res.json();
      })
      .then((data: { items: SuggestionRecord[] }) => {
        setItems(data.items || []);
      });

  useEffect(() => {
    let aborted = false;
    Promise.all([
      fetch('/api/categories')
        .then((r) => (r.ok ? r.json() : { items: [] }))
        .catch(() => ({ items: [] })),
      loadSuggestions().catch(() => {}),
    ])
      .then(([cats]) => {
        if (aborted) return;
        setCategories((cats as { items: CategoryRecord[] }).items || []);
        setLoading(false);
      })
      .catch(() => {
        if (aborted) return;
        setError(tRef.current('profile.suggestions.error.load'));
        setLoading(false);
      });
    return () => {
      aborted = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const errorMessage = (code: string | undefined): string => {
    switch (code) {
      case 'already_exists':
        return t('profile.suggestions.error.alreadyExists');
      case 'already_suggested':
        return t('profile.suggestions.error.alreadySuggested');
      case 'invalid_slug':
        return t('profile.suggestions.error.invalidSlug');
      default:
        return t('profile.suggestions.error.submit');
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch('/api/suggestions', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        body: JSON.stringify({
          name: form.name.trim(),
          slug: form.slug.trim() || undefined,
          icon: form.icon,
          parent: form.parent || null,
          description: form.description,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(errorMessage(data?.error));
        setSubmitting(false);
        return;
      }
      toast.success(t('profile.suggestions.submit.success'));
      setForm(EMPTY_FORM);
      setSubmitting(false);
      loadSuggestions().catch(() => {});
    } catch {
      setFormError(t('profile.suggestions.error.network'));
      setSubmitting(false);
    }
  };

  const parentOptions = [
    { value: '', label: t('profile.suggestions.noParent') },
    ...categories.map((c) => ({ value: c.id, label: c.name })),
  ];

  const statusBadge = (s: SuggestionRecord) => {
    if (s.status === 'approved') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded bg-exito/15 text-exito">
          <CheckCircle2 className="size-3.5" />
          {t('profile.suggestions.status.approved')}
        </span>
      );
    }
    if (s.status === 'rejected') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded bg-error/15 text-error">
          <XCircle className="size-3.5" />
          {t('profile.suggestions.status.rejected')}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded bg-tertiary/20 text-texto">
        <Clock className="size-3.5" />
        {t('profile.suggestions.status.pending')}
      </span>
    );
  };

  return (
    <Section
      title={t('profile.suggestions.title')}
      description={t('profile.suggestions.description')}
      loading={loading}
      error={error}
    >
      <div className="bg-blanco dark:bg-zinc-900/90 border border-borde rounded-2xl p-6 shadow-2xs">
        <h3 className="font-semibold text-texto mb-4 flex items-center gap-2">
          <Lightbulb className="size-4 text-accent-amber" />
          {t('profile.suggestions.formTitle')}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label={t('profile.suggestions.fields.name')}
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              maxLength={120}
            />
            <Field
              label={t('profile.suggestions.fields.slug')}
              helper={t('profile.suggestions.fields.slugHelp')}
              optional
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              maxLength={120}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SelectField
              label={t('profile.suggestions.fields.parent')}
              value={form.parent}
              onChange={(e) => setForm({ ...form, parent: e.target.value })}
              options={parentOptions}
            />
            <Field
              label={t('profile.suggestions.fields.icon')}
              helper={t('profile.suggestions.fields.iconHelp')}
              optional
              value={form.icon}
              onChange={(e) => setForm({ ...form, icon: e.target.value })}
              maxLength={120}
            />
          </div>
          <TextareaField
            label={t('profile.suggestions.fields.description')}
            optional
            rows={3}
            maxLength={2000}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          {formError && (
            <p role="alert" className="text-sm text-error bg-error/10 border border-error/30 rounded-lg p-3">
              {formError}
            </p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            {t('profile.suggestions.submitCta')}
          </button>
        </form>
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold text-texto">{t('profile.suggestions.myTitle')}</h3>
        {items.length === 0 ? (
          <p className="text-sm text-texto-secundario italic">{t('profile.suggestions.empty')}</p>
        ) : (
          <ul className="space-y-2">
            {items.map((s) => (
              <li
                key={s.id}
                className="bg-blanco dark:bg-zinc-900/90 border border-borde rounded-xl p-4 shadow-2xs"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-base" aria-hidden="true">
                    {s.icon || '🏷️'}
                  </span>
                  <span className="font-semibold text-texto">{s.name}</span>
                  {statusBadge(s)}
                </div>
                <p className="text-xs text-texto-secundario mt-0.5">
                  /{s.slug}
                  {s.expand?.parent?.name ? ` · ${s.expand.parent.name}` : ''}
                </p>
                {s.admin_note && (
                  <p className="text-xs text-texto-secundario mt-1 italic">
                    {t('profile.suggestions.note')}: {s.admin_note}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Section>
  );
}
