// =============================================================================
// admin/CategoriesSection.tsx — CRUD de categorias y subcategorias
// =============================================================================
// Lista el arbol de categorias (raices + hijas indentadas) y permite:
//   - Crear una categoria o subcategoria (Drawer).
//   - Editar nombre/slug/descripcion/icono/parent (PUT).
//   - Eliminar (Drawer de confirmacion; el server rechaza si tiene hijas o
//     productos usandola).
//
// Consume /api/admin/categories (solo admin). Reusa los shared del perfil
// (Section, Drawer, Field, SelectField, TextareaField).
// =============================================================================

import { useEffect, useRef, useState } from 'react';
import { Plus, Pencil, Trash2, Tags, Loader2 } from 'lucide-react';
import type { Lang } from '../../i18n/ui';
import { useTranslations } from '../../i18n/utils';
import Section from '../profile/shared/Section';
import Drawer from '../profile/shared/Drawer';
import { Field, SelectField, TextareaField } from '../profile/shared/Field';
import { toast } from '../../lib/stores/toast';
import { csrfHeaders } from '../../lib/csrf-client';

interface CategoryRecord {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  parent?: string;
  expand?: { parent?: { id: string; name: string } };
}

interface FormState {
  name: string;
  slug: string;
  description: string;
  icon: string;
  parent: string;
}

const EMPTY_FORM: FormState = { name: '', slug: '', description: '', icon: '', parent: '' };

function toForm(c: CategoryRecord): FormState {
  return {
    name: c.name,
    slug: c.slug,
    description: c.description ?? '',
    icon: c.icon ?? '',
    parent: c.parent ?? '',
  };
}

export default function CategoriesSection({ lang }: { lang: Lang }) {
  const t = useTranslations(lang);
  const tRef = useRef(t);
  tRef.current = t;

  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    fetch('/api/admin/categories', { credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      })
      .then((data: { items: CategoryRecord[] }) => {
        setCategories(data.items || []);
        setLoading(false);
      })
      .catch(() => {
        setError(tRef.current('admin.categories.error.load'));
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
        return t('admin.categories.error.slugTaken');
      case 'name_taken':
        return t('admin.categories.error.nameTaken');
      case 'invalid_slug':
        return t('admin.categories.error.invalidSlug');
      case 'self_parent':
      case 'cycle':
        return t('admin.categories.error.parentCycle');
      case 'has_children':
        return t('admin.categories.error.hasChildren');
      case 'in_use':
        return t('admin.categories.error.inUse');
      default:
        return t('admin.categories.error.save');
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setDrawerOpen(true);
  };

  const openEdit = (c: CategoryRecord) => {
    setEditingId(c.id);
    setForm(toForm(c));
    setFormError(null);
    setDrawerOpen(true);
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setFormError(null);

    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim() || undefined,
      description: form.description,
      icon: form.icon,
      parent: form.parent || null,
    };
    const url = editingId ? `/api/admin/categories/${editingId}` : '/api/admin/categories';
    const method = editingId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(errorMessage(data?.error));
        setSaving(false);
        return;
      }
      toast.success(
        editingId ? t('admin.categories.update.success') : t('admin.categories.create.success')
      );
      setDrawerOpen(false);
      setSaving(false);
      load();
    } catch {
      setFormError(t('admin.categories.error.network'));
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId || deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/admin/categories/${deletingId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { ...csrfHeaders() },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDeleteError(errorMessage(data?.error));
        setDeleting(false);
        return;
      }
      toast.success(t('admin.categories.delete.success'));
      setDeletingId(null);
      setDeleting(false);
      load();
    } catch {
      setDeleteError(t('admin.categories.error.network'));
      setDeleting(false);
    }
  };

  // Agrupar por parent para dibujar el arbol.
  const byParent = new Map<string, CategoryRecord[]>();
  for (const c of categories) {
    const key = c.parent || '__root__';
    const arr = byParent.get(key) ?? [];
    arr.push(c);
    byParent.set(key, arr);
  }
  const roots = byParent.get('__root__') ?? [];

  const parentOptions = [
    { value: '', label: t('admin.categories.noParent') },
    ...categories
      .filter((c) => c.id !== editingId)
      .map((c) => ({ value: c.id, label: c.name })),
  ];

  const deletingCategory = categories.find((c) => c.id === deletingId) ?? null;

  const renderRow = (c: CategoryRecord, depth: number) => {
    const children = byParent.get(c.id) ?? [];
    return (
      <div key={c.id}>
        <div
          className="flex items-center justify-between gap-3 py-2.5 border-b border-borde last:border-b-0"
          style={{ paddingLeft: depth * 20 }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-lg shrink-0" aria-hidden="true">
              {c.icon || <Tags className="size-4 text-texto-secundario" />}
            </span>
            <div className="min-w-0">
              <p className="font-semibold text-texto truncate">{c.name}</p>
              <p className="text-xs text-texto-secundario truncate">
                /{c.slug}
                {c.parent ? ` · ${c.expand?.parent?.name ?? t('admin.categories.subcategory')}` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => openEdit(c)}
              className="p-2 rounded-lg text-texto-secundario hover:text-primary hover:bg-primary/10 transition-colors"
              aria-label={t('admin.categories.actions.edit')}
              title={t('admin.categories.actions.edit')}
            >
              <Pencil className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setDeletingId(c.id);
                setDeleteError(null);
              }}
              className="p-2 rounded-lg text-texto-secundario hover:text-error hover:bg-error/10 transition-colors"
              aria-label={t('admin.categories.actions.delete')}
              title={t('admin.categories.actions.delete')}
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        </div>
        {children.map((child) => renderRow(child, depth + 1))}
      </div>
    );
  };

  return (
    <Section
      title={t('admin.categories.title')}
      description={t('admin.categories.description')}
      loading={loading}
      error={error}
      actions={
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-primary-dark transition-colors text-sm"
        >
          <Plus className="size-4" />
          {t('admin.categories.newCta')}
        </button>
      }
    >
      {roots.length === 0 ? (
        <div className="text-center py-12 bg-blanco dark:bg-zinc-900/90 border border-borde rounded-2xl">
          <Tags className="size-10 mx-auto text-texto-secundario/50 mb-3" />
          <p className="text-texto-secundario">{t('admin.categories.empty')}</p>
        </div>
      ) : (
        <div className="bg-blanco dark:bg-zinc-900/90 border border-borde rounded-2xl px-4 sm:px-6 shadow-2xs">
          {roots.map((c) => renderRow(c, 0))}
        </div>
      )}

      {/* Drawer: crear / editar */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editingId ? t('admin.categories.editTitle') : t('admin.categories.createTitle')}
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
              form="category-form"
              disabled={saving}
              className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {saving && <Loader2 className="size-4 animate-spin" />}
              {t('admin.save')}
            </button>
          </>
        }
      >
        <form id="category-form" onSubmit={handleSave} className="space-y-4">
          <Field
            label={t('admin.categories.fields.name')}
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            maxLength={120}
          />
          <Field
            label={t('admin.categories.fields.slug')}
            helper={t('admin.categories.fields.slugHelp')}
            optional
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            maxLength={120}
          />
          <Field
            label={t('admin.categories.fields.icon')}
            helper={t('admin.categories.fields.iconHelp')}
            optional
            value={form.icon}
            onChange={(e) => setForm({ ...form, icon: e.target.value })}
            maxLength={120}
          />
          <SelectField
            label={t('admin.categories.fields.parent')}
            value={form.parent}
            onChange={(e) => setForm({ ...form, parent: e.target.value })}
            options={parentOptions}
          />
          <TextareaField
            label={t('admin.categories.fields.description')}
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
        </form>
      </Drawer>

      {/* Drawer: confirmar borrado */}
      <Drawer
        open={deletingId !== null}
        onClose={() => setDeletingId(null)}
        title={t('admin.categories.confirmDelete.title')}
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
          {t('admin.categories.confirmDelete.body')}{' '}
          <span className="font-semibold text-texto">{deletingCategory?.name}</span>
        </p>
        {deleteError && (
          <p role="alert" className="text-sm text-error bg-error/10 border border-error/30 rounded-lg p-3 mt-4">
            {deleteError}
          </p>
        )}
      </Drawer>
    </Section>
  );
}
