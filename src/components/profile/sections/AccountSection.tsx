// =============================================================================
// sections/AccountSection.tsx — Edicion de perfil + cambio de password
// =============================================================================
// Tres bloques:
//   1. Avatar (upload via /api/users/me/avatar con FormData + CSRF form).
//   2. Datos personales (name, phone, locale) via PATCH /api/users/me.
//   3. Cambio de password via POST /api/auth/change-password (existente).
//
// Despues de cualquier mutacion exitosa, hace refreshAuth() para que el
// Header avatar / dropdown reflejen los cambios.
// =============================================================================

import { useEffect, useRef, useState } from 'react';
import { Camera, Save } from 'lucide-react';
import { useTranslations } from '../../../i18n/utils';
import type { Lang } from '../../../i18n/ui';
import { refreshAuth } from '../../../lib/stores/auth';
import Section from '../shared/Section';
import { Field } from '../shared/Field';
import { SelectField } from '../shared/Field';
import { pbFileUrl } from '@lib/pb-url';
import { csrfHeaders } from '@/lib/csrf-client';

interface AccountSectionProps {
  lang: Lang;
}

export default function AccountSection({ lang }: AccountSectionProps) {
  const t = useTranslations(lang);
  const fileRef = useRef<HTMLInputElement>(null);

  // Profile data state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [locale, setLocale] = useState<'es' | 'en'>('es');
  const [currentAvatar, setCurrentAvatar] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [bootDone, setBootDone] = useState(false);

  // Profile submit state
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Avatar upload state
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  // Password state
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [pwdSuccess, setPwdSuccess] = useState(false);

  // Boot: fetch current user from /api/users/me.
  useEffect(() => {
    let aborted = false;
    (async () => {
      try {
        const res = await fetch('/api/users/me', {
          headers: { Origin: window.location.origin, ...csrfHeaders() },
          credentials: 'include',
        });
        if (!res.ok) return;
        const data = await res.json();
        if (aborted || !data.user) return;
        setName(data.user.name ?? '');
        setPhone(data.user.phone ?? '');
        setLocale(data.user.locale ?? 'es');
        setCurrentAvatar(data.user.avatar ?? null);
        setUserId(data.user.id ?? null);
        setBootDone(true);
      } catch {
        // Silent.
      }
    })();
    return () => {
      aborted = true;
    };
  }, []);

  const avatarUrl =
    userId && currentAvatar
      ? pbFileUrl('users', userId, currentAvatar)
      : null;

  // Profile submit.
  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (profileSaving) return;
    setProfileSaving(true);
    setProfileError(null);
    setProfileSuccess(false);
    try {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Origin: window.location.origin,
          ...csrfHeaders(),
        },
        credentials: 'include',
        body: JSON.stringify({ name, phone, locale }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || t('profile.account.save.error'));
      }
      await refreshAuth();
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3500);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : t('profile.account.save.error'));
    } finally {
      setProfileSaving(false);
    }
  };

  // Avatar upload.
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    setAvatarError(null);
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      const res = await fetch('/api/users/me/avatar', {
        method: 'POST',
        headers: {
          Origin: window.location.origin,
          ...csrfHeaders(),
        },
        credentials: 'include',
        body: fd,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Upload failed');
      }
      const data = await res.json();
      setCurrentAvatar(data.user?.avatar ?? null);
      await refreshAuth();
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setAvatarUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  // Password change.
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwdSaving) return;
    if (newPwd !== confirmPwd) {
      setPwdError(t('profile.account.password.mismatch'));
      return;
    }
    setPwdSaving(true);
    setPwdError(null);
    setPwdSuccess(false);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: window.location.origin,
          ...csrfHeaders(),
        },
        credentials: 'include',
        body: JSON.stringify({
          oldPassword: currentPwd,
          newPassword: newPwd,
          newPasswordConfirm: newPwd,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || t('profile.account.password.error'));
      }
      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');
      setPwdSuccess(true);
      setTimeout(() => setPwdSuccess(false), 3500);
    } catch (err) {
      setPwdError(err instanceof Error ? err.message : t('profile.account.password.error'));
    } finally {
      setPwdSaving(false);
    }
  };

  if (!bootDone) {
    return <Section loading />;
  }

  return (
    <Section title={t('profile.account.title')}>
      {/* Avatar */}
      <div className="bg-blanco border border-borde rounded-xl p-6">
        <h3 className="font-semibold text-texto mb-1">
          {t('profile.account.avatar.title')}
        </h3>
        <p className="text-sm text-texto-secundario mb-4">
          {t('profile.account.avatar.help')}
        </p>
        <div className="flex items-center gap-4">
          <AvatarPreview avatarUrl={avatarUrl} />
          <div className="flex-1">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarChange}
              className="hidden"
              disabled={avatarUploading}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={avatarUploading}
              className="inline-flex items-center gap-2 bg-blanco border border-borde text-texto px-4 py-2 rounded-lg text-sm font-medium hover:bg-fondo transition-colors disabled:opacity-50"
            >
              <Camera className="size-4" />
              {avatarUploading
                ? t('profile.account.avatar.uploading')
                : t('profile.account.avatar.upload')}
            </button>
            {avatarError && (
              <p role="alert" className="text-xs text-error mt-2">
                {avatarError}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Profile data */}
      <form
        onSubmit={handleProfileSave}
        className="bg-blanco border border-borde rounded-xl p-6 space-y-4"
      >
        <h3 className="font-semibold text-texto">Datos personales</h3>
        <Field
          label={t('profile.account.fields.name')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={2}
          maxLength={120}
        />
        <Field
          label={t('profile.account.fields.phone')}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          optional
          maxLength={40}
        />
        <SelectField
          label={t('profile.account.fields.locale')}
          value={locale}
          onChange={(e) => setLocale(e.target.value as 'es' | 'en')}
          options={[
            { value: 'es', label: 'Espanol' },
            { value: 'en', label: 'English' },
          ]}
        />
        {profileError && (
          <p role="alert" className="text-sm text-error">
            {profileError}
          </p>
        )}
        {profileSuccess && (
          <p role="alert" className="text-sm text-exito">
            {t('profile.account.save.success')}
          </p>
        )}
        <button
          type="submit"
          disabled={profileSaving}
          aria-busy={profileSaving}
          className="inline-flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50"
        >
          <Save className="size-4" />
          {profileSaving ? t('profile.common.saving') : t('profile.common.save')}
        </button>
      </form>

      {/* Password */}
      <form
        onSubmit={handlePasswordChange}
        className="bg-blanco border border-borde rounded-xl p-6 space-y-4"
      >
        <h3 className="font-semibold text-texto">
          {t('profile.account.password.title')}
        </h3>
        <Field
          label={t('profile.account.password.current')}
          type="password"
          value={currentPwd}
          onChange={(e) => setCurrentPwd(e.target.value)}
          required
          autoComplete="current-password"
        />
        <Field
          label={t('profile.account.password.new')}
          type="password"
          value={newPwd}
          onChange={(e) => setNewPwd(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
        />
        <Field
          label={t('profile.account.password.confirm')}
          type="password"
          value={confirmPwd}
          onChange={(e) => setConfirmPwd(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
        />
        {pwdError && (
          <p role="alert" className="text-sm text-error">
            {pwdError}
          </p>
        )}
        {pwdSuccess && (
          <p role="alert" className="text-sm text-exito">
            {t('profile.account.password.success')}
          </p>
        )}
        <button
          type="submit"
          disabled={pwdSaving}
          aria-busy={pwdSaving}
          className="inline-flex items-center gap-2 bg-secondary text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-secondary-dark transition-colors disabled:opacity-50"
        >
          {pwdSaving ? t('profile.common.saving') : t('profile.account.password.change')}
        </button>
      </form>
    </Section>
  );
}

// =============================================================================
// AvatarPreview — imagen o iniciales
// =============================================================================
function AvatarPreview({ avatarUrl }: { avatarUrl: string | null }) {
  return (
    <div className="w-20 h-20 rounded-full bg-primary text-white flex items-center justify-center text-2xl font-bold shrink-0 overflow-hidden">
      {avatarUrl ? (
        <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
      ) : (
        '?'
      )}
    </div>
  );
}