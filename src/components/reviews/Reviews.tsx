import { useState, useEffect, useMemo, useRef } from 'react';
import { useStore } from '@nanostores/react';
import { useTranslations, localizePath } from '../../i18n/utils';
import type { Lang } from '../../i18n/ui';
import { authUser } from '../../lib/stores/auth';
import { csrfHeaders } from '../../lib/csrf-client';

// =============================================================================
// Reviews.tsx
// =============================================================================
// Island React que renderiza la lista de resenas + el form para enviar una
// nueva. Vive en la pagina de detalle de producto.
// =============================================================================

interface ReviewRecord {
  id: string;
  user: string;
  product: string;
  rating: number;
  comment: string;
  created_at?: string;
  created?: string;
  user_name_snapshot?: string;
}

interface ReviewsProps {
  productId: string;
  lang: Lang;
  productOwnerId: string | null;
}

export default function Reviews({ productId, lang, productOwnerId }: ReviewsProps) {
  const t = useTranslations(lang);
  const l = (path: string) => localizePath(path, lang);

  const tRef = useRef(t);
  tRef.current = t;

  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const currentUser = useStore(authUser);

  const isOwner = useMemo(
    () => !!(currentUser && productOwnerId && currentUser.id === productOwnerId),
    [currentUser, productOwnerId]
  );

  useEffect(() => {
    let aborted = false;

    setLoading(true);
    setError(null);
    fetch(`/api/reviews?product=${encodeURIComponent(productId)}`, {
      credentials: 'include',
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      })
      .then((data: { reviews: ReviewRecord[] }) => {
        if (aborted) return;
        setReviews(data.reviews || []);
        setLoading(false);
      })
      .catch(() => {
        if (aborted) return;
        setError(tRef.current('reviews.error.load'));
        setLoading(false);
      });
    return () => {
      aborted = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    setSubmitted(false);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...csrfHeaders(),
        },
        body: JSON.stringify({
          productId,
          rating,
          comment,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSubmitError(data.error || t('reviews.error.submit'));
        setSubmitting(false);
        return;
      }
      setReviews((prev) => [data.review as ReviewRecord, ...prev]);
      setComment('');
      setRating(5);
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3500);
    } catch {
      setSubmitError(t('reviews.error.network'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-texto">{t('reviews.title')}</h2>

      {/* Lista */}
      {loading ? (
        <p className="text-texto-secundario">{t('common.loading')}</p>
      ) : error ? (
        <p className="text-error">{error}</p>
      ) : reviews.length === 0 ? (
        <p className="text-texto-secundario italic">{t('reviews.empty')}</p>
      ) : (
        <ul className="space-y-4">
          {reviews.map((r) => (
            <li
              key={r.id}
              className="bg-blanco rounded-lg p-4 shadow-card border border-gray-100"
            >
              <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold shrink-0">
                    {(r.user_name_snapshot || '?').charAt(0).toUpperCase()}
                  </div>
                  <span className="font-semibold text-texto">
                    {r.user_name_snapshot || 'Anónimo'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className="text-rating flex"
                    aria-label={`${r.rating} de 5`}
                  >
                    {Array.from({ length: 5 }).map((_, i) => (
                      <svg
                        key={i}
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill={i < r.rating ? 'currentColor' : 'none'}
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    ))}
                  </span>
                  <time
                    dateTime={r.created_at ?? r.created ?? ''}
                    className="text-xs text-texto-secundario"
                  >
                    {(r.created_at || r.created)
                      ? new Date(r.created_at ?? r.created!).toLocaleDateString(
                          lang === 'en' ? 'en-US' : 'es-NI'
                        )
                      : ''}
                  </time>
                </div>
              </div>
              {r.comment && (
                <p className="text-texto-secundario leading-relaxed whitespace-pre-line">
                  {r.comment}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Form / CTA */}
      <div className="bg-blanco rounded-lg p-6 shadow-card border border-gray-100">
        {!currentUser ? (
          <p className="text-texto-secundario">
            <a
              href={l('/login')}
              className="text-primary hover:text-primary-dark font-semibold"
            >
              {t('reviews.loginToReview')}
            </a>
          </p>
        ) : isOwner ? (
          <p className="text-texto-secundario italic">
            {t('reviews.cannotReviewOwn')}
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="text-lg font-semibold text-texto">
              {t('reviews.writeTitle')}
            </h3>

            <div>
              <label className="block text-sm font-medium text-texto mb-2">
                {t('reviews.yourRating')}
              </label>
              <div
                className="flex gap-1 text-rating"
                onMouseLeave={() => setHoverRating(0)}
              >
                {Array.from({ length: 5 }).map((_, i) => {
                  const star = i + 1;
                  const active = star <= (hoverRating || rating);
                  return (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      className="p-1 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary rounded"
                      aria-label={`${star} ${t('reviews.stars')}`}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="28"
                        height="28"
                        viewBox="0 0 24 24"
                        fill={active ? 'currentColor' : 'none'}
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label
                htmlFor="review-comment"
                className="block text-sm font-medium text-texto mb-2"
              >
                {t('reviews.commentLabel')}
              </label>
              <textarea
                id="review-comment"
                rows={4}
                maxLength={2000}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-texto resize-y"
                placeholder={t('reviews.commentPlaceholder')}
              />
              <p className="text-xs text-texto-secundario text-right mt-1">
                {comment.length}/2000
              </p>
            </div>

            {submitError && (
              <p className="text-sm text-error bg-red-50 border border-red-200 rounded p-2">
                {submitError}
              </p>
            )}
            {submitted && (
              <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded p-2">
                {t('reviews.submitted')}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="bg-primary text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? t('auth.submitting') : t('reviews.submit')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}