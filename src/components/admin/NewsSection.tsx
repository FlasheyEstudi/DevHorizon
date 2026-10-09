// =============================================================================
// admin/NewsSection.tsx — Publicacion de noticias
// =============================================================================
// Lista TODAS las noticias (borradores incluidos) y permite:
//   - Crear una noticia (Drawer: titulo, slug, resumen, contenido, categoria,
//     estado e imagen opcional).
//   - Editar (PUT multipart) y eliminar.
//   - Publicar / despublicar en un click (toggle de status).
//
// Consume /api/admin/news. Reusa los shared del perfil.
// =============================================================================

import { useEffect, useRef, useState } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Newspaper,
  Loader2,
  ExternalLink,
  Eye,
  EyeOff,
} from 'lucide-react';
import type { Lang } from '../../i18n/ui';
import { useTranslations } from '../../i18n/utils';
import Section from '../profile/shared/Section';
import Drawer from '../profile/shared/Drawer';
import { Field, SelectField, TextareaField } from '../profile/shared/Field';
import { toast } from '../../lib/stores/toast';
import { csrfHeaders } from '../../lib/csrf-client';
import { pbFileUrl } from '@lib/pb-url';

interface NewsRecord {
  id: string;
  collectionId: string;
  title: string;
  slug: string;
  summary?: string;
  content: string;
  category?: string;
  status: 'draft' | 'published';
  image?: string;
  created_at?: string;
}

interface FormState {
  title: string;
  slug: string;
  summary: string;
  content: string;
  category: string;
  status: 'draft' | 'published';
  imageFile: File | null;
  imagePreview: string | null;
}

const NEWS_CATEGORIES = ['tradicion', 'nuevos_productos', 'comunidad', 'eventos'] as const;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const EMPTY_FORM: FormState = {
  title: '',
  slug: '',
  summary: '',
  content: '',
  category: '',
  status: 'draft',
  imageFile: null,
  imagePreview: null,
};

function toForm(n: NewsRecord): FormState {
  return {
    title: n.title,
    slug: n.slug,
    summary: n.summary ?? '',
    content: n.content,
    category: n.category ?? '',
    status: n.status,
    imageFile: null,
    imagePreview: null,
  };
}

function formatDate(dateStr: string | undefined, lang: Lang): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString(lang === 'en' ? 'en-US' : 'es-NI', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
}

export default function NewsSection({ lang }: { lang: Lang }) {
  const t = useTranslations(lang);
  const tRef = useRef(t);
  tRef.current = t;

  const [news, setNews] = useState<NewsRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    fetch('/api/admin/news', { credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      })
      .then((data: { items: NewsRecord[] }) => {
        setNews(data.items || []);
        setLoading(false);
      })
      .catch(() => {
        setError(tRef.current('admin.news.error.load'));
        setLoading(false);
      });
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const errorMessage = (code: string | undefined): string => {
    switch (code) {
      case 'slug_taken':
        return t('admin.news.error.slugTaken');
      case 'invalid_slug':
        return t('admin.news.error.invalidSlug');
      case 'image_too_large':
        return t('admin.news.error.imageTooLarge');
      case 'image_invalid_mime':
        return t('admin.news.error.imageInvalid');
      default:
        return t('admin.news.error.save');
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setDrawerOpen(true);
  };

  const openEdit = (n: NewsRecord) => {
    setEditingId(n.id);
    setForm(toForm(n));
    setFormError(null);
    setDrawerOpen(true);
  };

  const onPickImage = (file: File | null) => {
    if (form.imagePreview) URL.revokeObjectURL(form.imagePreview);
    setForm({
      ...form,
      imageFile: file,
      imagePreview: file ? URL.createObjectURL(file) : null,
    });
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setFormError(null);

    const body = new FormData();
    body.set('title', form.title.trim());
    body.set('slug', form.slug.trim());
    body.set('summary', form.summary);
    body.set('content', form.content);
    body.set('category', form.category);
    body.set('status', form.status);
    if (form.imageFile) body.set('image', form.imageFile);

    const url = editingId ? `/api/admin/news/${editingId}` : '/api/admin/news';
    const method = editingId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers: { ...csrfHeaders() },
        body,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(errorMessage(data?.error));
        setSaving(false);
        return;
      }
      toast.success(editingId ? t('admin.news.update.success') : t('admin.news.create.success'));
      if (form.imagePreview) URL.revokeObjectURL(form.imagePreview);
      setDrawerOpen(false);
      setSaving(false);
      load();
    } catch {
      setFormError(t('admin.news.error.network'));
      setSaving(false);
    }
  };

  const toggleStatus = async (n: NewsRecord) => {
    if (togglingId) return;
    setTogglingId(n.id);
    const next = n.status === 'published' ? 'draft' : 'published';
    const body = new FormData();
    body.set('status', next);
    try {
      const res = await fetch(`/api/admin/news/${n.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { ...csrfHeaders() },
        body,
      });
      if (!res.ok) throw new Error('failed');
      setNews((prev) => prev.map((item) => (item.id === n.id ? { ...item, status: next } : item)));
      toast.success(next === 'published' ? t('admin.news.published') : t('admin.news.unpublished'));
    } catch {
      toast.error(t('admin.news.error.save'));
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deletingId || deleting) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/news/${deletingId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { ...csrfHeaders() },
      });
      if (!res.ok) throw new Error('failed');
      toast.success(t('admin.news.delete.success'));
      setDeletingId(null);
      load();
    } catch {
      toast.error(t('admin.news.error.delete'));
    } finally {
      setDeleting(false);
    }
  };

  const categoryOptions = [
    { value: '', label: t('admin.news.noCategory') },
    ...NEWS_CATEGORIES.map((c) => ({ value: c, label: t(`admin.news.category.${c}`) })),
  ];

  const statusOptions = [
    { value: 'draft', label: t('admin.news.status.draft') },
    { value: 'published', label: t('admin.news.status.published') },
  ];

  const deletingNews = news.find((n) => n.id === deletingId) ?? null;

  return (
    <Section
      title={t('admin.news.title')}
      description={t('admin.news.description')}
      loading={loading}
      error={error}
      actions={
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-primary-dark transition-colors text-sm"
        >
          <Plus className="size-4" />
          {t('admin.news.newCta')}
        </button>
      }
    >
      {news.length === 0 ? (
        <div className="text-center py-12 bg-blanco dark:bg-zinc-900/90 border border-borde rounded-2xl">
          <Newspaper className="size-10 mx-auto text-texto-secundario/50 mb-3" />
          <p className="text-texto-secundario">{t('admin.news.empty')}</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {news.map((n) => {
            const imgUrl = n.image ? pbFileUrl(n.collectionId, n.id, n.image) : null;
            const published = n.status === 'published';
            return (
              <li
                key={n.id}
                className="bg-blanco dark:bg-zinc-900/90 border border-borde rounded-2xl p-4 shadow-2xs flex gap-4"
              >
                <div className="w-24 h-24 sm:w-28 sm:h-20 rounded-xl overflow-hidden bg-fondo border border-borde shrink-0">
                  {imgUrl ? (
                    <img src={imgUrl} alt={n.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Newspaper className="size-6 text-texto-secundario/40" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded ${
                        published
                          ? 'bg-exito/15 text-exito'
                          : 'bg-tertiary/20 text-texto'
                      }`}
                    >
                      {published ? t('admin.news.status.published') : t('admin.news.status.draft')}
                    </span>
                    {n.category && (
                      <span className="text-xs text-texto-secundario">
                        {t(`admin.news.category.${n.category}`)}
                      </span>
                    )}
                    <span className="text-xs text-texto-secundario">{formatDate(n.created_at, lang)}</span>
                  </div>
                  <h3 className="font-semibold text-texto line-clamp-1">{n.title}</h3>
                  <p className="text-sm text-texto-secundario line-clamp-2">{n.summary}</p>

                  <div className="flex items-center gap-1 mt-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => toggleStatus(n)}
                      disabled={togglingId === n.id}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg text-texto-secundario hover:bg-fondo dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
                    >
                      {togglingId === n.id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : published ? (
                        <EyeOff className="size-3.5" />
                      ) : (
                        <Eye className="size-3.5" />
                      )}
                      {published ? t('admin.news.unpublish') : t('admin.news.publish')}
                    </button>
                    <a
                      href={`/noticias/${n.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg text-texto-secundario hover:bg-fondo dark:hover:bg-zinc-800 transition-colors"
                    >
                      <ExternalLink className="size-3.5" />
                      {t('admin.news.view')}
                    </a>
                    <button
                      type="button"
                      onClick={() => openEdit(n)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg text-texto-secundario hover:text-primary hover:bg-primary/10 transition-colors"
                    >
                      <Pencil className="size-3.5" />
                      {t('admin.categories.actions.edit')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingId(n.id)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg text-texto-secundario hover:text-error hover:bg-error/10 transition-colors"
                    >
                      <Trash2 className="size-3.5" />
                      {t('admin.categories.actions.delete')}
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Drawer: crear / editar noticia */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editingId ? t('admin.news.editTitle') : t('admin.news.createTitle')}
        footer={
          <>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="px-4 py-2.5 rounded-lg font-semibold text-texto-secundario hover:bg-fondo dark:hover:bg-zinc-800 transition-colors text-sm"
            >
              {t('admin.cancel')}
            </button>
            <button
              type="submit"
              form="news-form"
              disabled={saving}
              className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {saving && <Loader2 className="size-4 animate-spin" />}
              {t('admin.save')}
            </button>
          </>
        }
      >
        <form id="news-form" onSubmit={handleSave} className="space-y-4">
          <Field
            label={t('admin.news.fields.title')}
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            maxLength={200}
          />
          <Field
            label={t('admin.news.fields.slug')}
            helper={t('admin.categories.fields.slugHelp')}
            optional
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            maxLength={200}
          />
          <TextareaField
            label={t('admin.news.fields.summary')}
            optional
            rows={2}
            maxLength={500}
            value={form.summary}
            onChange={(e) => setForm({ ...form, summary: e.target.value })}
          />
          <TextareaField
            label={t('admin.news.fields.content')}
            required
            rows={8}
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
          />
          <SelectField
            label={t('admin.news.fields.category')}
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            options={categoryOptions}
          />
          <SelectField
            label={t('admin.news.fields.status')}
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as 'draft' | 'published' })}
            options={statusOptions}
          />

          <div className="space-y-2">
            <label className="block text-sm font-medium text-texto">
              {t('admin.news.fields.image')}
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => onPickImage(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-texto-secundario file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary file:text-white file:font-semibold hover:file:bg-primary-dark file:cursor-pointer"
            />
            <p className="text-xs text-texto-secundario">{t('admin.news.image.help')}</p>
            {form.imagePreview && (
              <img
                src={form.imagePreview}
                alt=""
                className="mt-2 w-full h-40 object-cover rounded-xl border border-borde"
              />
            )}
          </div>

          {formError && (
            <p role="alert" className="text-sm text-error bg-error/10 border border-error/30 rounded-lg p-3">
              {formError}
            </p>
          )}
        </form>
      </Drawer>

      {/* Drawer: confirmar borrado */}
      <Drawer
        open={deletingId !== null}
        onClose={() => setDeletingId(null)}
        title={t('admin.news.confirmDelete.title')}
        footer={
          <>
            <button
              type="button"
              onClick={() => setDeletingId(null)}
              className="px-4 py-2.5 rounded-lg font-semibold text-texto-secundario hover:bg-fondo dark:hover:bg-zinc-800 transition-colors text-sm"
            >
              {t('admin.cancel')}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center gap-2 bg-error text-white px-4 py-2.5 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 text-sm"
            >
              {deleting && <Loader2 className="size-4 animate-spin" />}
              {t('admin.delete')}
            </button>
          </>
        }
      >
        <p className="text-texto-secundario">
          {t('admin.news.confirmDelete.body')}{' '}
          <span className="font-semibold text-texto">{deletingNews?.title}</span>
        </p>
      </Drawer>
    </Section>
  );
}
