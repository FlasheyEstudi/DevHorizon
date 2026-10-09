// =============================================================================
// admin/SuggestionsSection.tsx — Revision de sugerencias de categoria
// =============================================================================
// Lista las propuestas enviadas por los artesanos y permite:
//   - Aprobar: crea la categoria real (POST /api/admin/suggestions/[id] con
//     action 'approve') y marca la sugerencia como aprobada.
//   - Rechazar: marca como rechazada con una nota opcional.
//   - Filtrar por estado (pendientes / todas).
//
// Consume /api/admin/suggestions.
// =============================================================================

import { useEffect, useRef, useState } from 'react';
import { Lightbulb, Check, X, Loader2, Clock, CheckCircle2, XCircle } from 'lucide-react';
import type { Lang } from '../../i18n/ui';
import { useTranslations } from '../../i18n/utils';
import Section from '../profile/shared/Section';
import Drawer from '../profile/shared/Drawer';
import { TextareaField } from '../profile/shared/Field';
import { toast } from '../../lib/stores/toast';
import { csrfHeaders } from '../../lib/csrf-client';

interface SuggestionRecord {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_note?: string;
  created_at?: string;
  expand?: {
    parent?: { id: string; name: string };
    suggested_by?: { id: string; name?: string; email?: string };
  };
}

type Filter = 'pending' | 'all';

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

export default function SuggestionsSection({ lang }: { lang: Lang }) {
  const t = useTranslations(lang);
  const tRef = useRef(t);
  tRef.current = t;

  const [items, setItems] = useState<SuggestionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('pending');

  const [busyId, setBusyId] = useState<string | null>(null);

  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [rejecting, setRejecting] = useState(false);

  const load = () => {
    setLoading(true);
    setError(null);
    const qs = filter === 'pending' ? '?status=pending' : '';
    fetch(`/api/admin/suggestions${qs}`, { credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      })
      .then((data: { items: SuggestionRecord[] }) => {
        setItems(data.items || []);
        setLoading(false);
      })
      .catch(() => {
        setError(tRef.current('admin.suggestions.error.load'));
        setLoading(false);
      });
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const review = async (
    id: string,
    action: 'approve' | 'reject',
    adminNote: string
  ): Promise<boolean> => {
    try {
      const res = await fetch(`/api/admin/suggestions/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        body: JSON.stringify({ action, admin_note: adminNote }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const code = data?.error;
        if (code === 'slug_taken') toast.error(t('admin.suggestions.error.slugTaken'));
        else if (code === 'already_reviewed') toast.error(t('admin.suggestions.error.alreadyReviewed'));
        else toast.error(t('admin.suggestions.error.review'));
        return false;
      }
      return true;
    } catch {
      toast.error(t('admin.suggestions.error.network'));
      return false;
    }
  };

  const handleApprove = async (s: SuggestionRecord) => {
    if (busyId) return;
    setBusyId(s.id);
    const ok = await review(s.id, 'approve', '');
    if (ok) {
      toast.success(t('admin.suggestions.approved'));
      load();
    }
    setBusyId(null);
  };

  const handleReject = async () => {
    if (!rejectingId || rejecting) return;
    setRejecting(true);
    const ok = await review(rejectingId, 'reject', rejectNote.trim());
    if (ok) {
      toast.success(t('admin.suggestions.rejected'));
      setRejectingId(null);
      setRejectNote('');
      load();
    }
    setRejecting(false);
  };

  const statusBadge = (s: SuggestionRecord) => {
    if (s.status === 'approved') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded bg-exito/15 text-exito">
          <CheckCircle2 className="size-3.5" />
          {t('admin.suggestions.status.approved')}
        </span>
      );
    }
    if (s.status === 'rejected') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded bg-error/15 text-error">
          <XCircle className="size-3.5" />
          {t('admin.suggestions.status.rejected')}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded bg-tertiary/20 text-texto">
        <Clock className="size-3.5" />
        {t('admin.suggestions.status.pending')}
      </span>
    );
  };

  return (
    <Section
      title={t('admin.suggestions.title')}
      description={t('admin.suggestions.description')}
      loading={loading}
      error={error}
      actions={
        <div className="inline-flex rounded-lg border border-borde overflow-hidden">
          <button
            type="button"
            onClick={() => setFilter('pending')}
            className={`px-3 py-2 text-sm font-semibold transition-colors ${
              filter === 'pending' ? 'bg-primary text-white' : 'text-texto-secundario hover:bg-fondo dark:hover:bg-zinc-800'
            }`}
          >
            {t('admin.suggestions.filter.pending')}
          </button>
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-2 text-sm font-semibold transition-colors ${
              filter === 'all' ? 'bg-primary text-white' : 'text-texto-secundario hover:bg-fondo dark:hover:bg-zinc-800'
            }`}
          >
            {t('admin.suggestions.filter.all')}
          </button>
        </div>
      }
    >
      {items.length === 0 ? (
        <div className="text-center py-12 bg-blanco dark:bg-zinc-900/90 border border-borde rounded-2xl">
          <Lightbulb className="size-10 mx-auto text-texto-secundario/50 mb-3" />
          <p className="text-texto-secundario">{t('admin.suggestions.empty')}</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((s) => (
            <li
              key={s.id}
              className="bg-blanco dark:bg-zinc-900/90 border border-borde rounded-2xl p-4 shadow-2xs"
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-start gap-3 min-w-0">
                  <span className="text-lg shrink-0" aria-hidden="true">
                    {s.icon || <Lightbulb className="size-4 text-texto-secundario" />}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-texto">{s.name}</h3>
                      {statusBadge(s)}
                    </div>
                    <p className="text-xs text-texto-secundario">/{s.slug}</p>
                    {s.description && (
                      <p className="text-sm text-texto-secundario mt-1">{s.description}</p>
                    )}
                    <p className="text-xs text-texto-secundario mt-1.5">
                      {t('admin.suggestions.by')}:{' '}
                      <span className="text-texto">
                        {s.expand?.suggested_by?.name || s.expand?.suggested_by?.email || '—'}
                      </span>
                      {s.expand?.parent?.name ? ` · ${s.expand.parent.name}` : ''}
                      {s.created_at ? ` · ${formatDate(s.created_at, lang)}` : ''}
                    </p>
                    {s.admin_note && (
                      <p className="text-xs text-texto-secundario mt-1 italic">
                        {t('admin.suggestions.note')}: {s.admin_note}
                      </p>
                    )}
                  </div>
                </div>

                {s.status === 'pending' && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleApprove(s)}
                      disabled={busyId === s.id}
                      className="inline-flex items-center gap-1.5 bg-primary text-white px-3 py-2 rounded-lg font-semibold hover:bg-primary-dark transition-colors text-xs disabled:opacity-50"
                    >
                      {busyId === s.id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Check className="size-3.5" />
                      )}
                      {t('admin.suggestions.approve')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRejectingId(s.id);
                        setRejectNote('');
                      }}
                      className="inline-flex items-center gap-1.5 border border-borde text-texto-secundario hover:text-error hover:border-error/40 px-3 py-2 rounded-lg font-semibold transition-colors text-xs"
                    >
                      <X className="size-3.5" />
                      {t('admin.suggestions.reject')}
                    </button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Drawer: rechazar con nota */}
      <Drawer
        open={rejectingId !== null}
        onClose={() => setRejectingId(null)}
        title={t('admin.suggestions.rejectTitle')}
        footer={
          <>
            <button
              type="button"
              onClick={() => setRejectingId(null)}
              className="px-4 py-2.5 rounded-lg font-semibold text-texto-secundario hover:bg-fondo dark:hover:bg-zinc-800 transition-colors text-sm"
            >
              {t('admin.cancel')}
            </button>
            <button
              type="button"
              onClick={handleReject}
              disabled={rejecting}
              className="inline-flex items-center gap-2 bg-error text-white px-4 py-2.5 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 text-sm"
            >
              {rejecting && <Loader2 className="size-4 animate-spin" />}
              {t('admin.suggestions.reject')}
            </button>
          </>
        }
      >
        <TextareaField
          label={t('admin.suggestions.noteLabel')}
          optional
          rows={3}
          maxLength={1000}
          value={rejectNote}
          onChange={(e) => setRejectNote(e.target.value)}
        />
      </Drawer>
    </Section>
  );
}
