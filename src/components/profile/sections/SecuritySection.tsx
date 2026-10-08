// =============================================================================
// sections/SecuritySection.tsx — Autenticación en dos pasos (TOTP / RFC 6238)
// =============================================================================
// Estado del 2FA del usuario:
//   - GET  /api/auth/2fa/status  → { enabled, pendingSetup, recoveryCodesRemaining }
//   - POST /api/auth/2fa/setup   → genera el secreto pendiente + URI otpauth
//   - POST /api/auth/2fa/enable  → confirma un código y emite códigos de
//                                  recuperación (se muestran UNA sola vez)
//   - POST /api/auth/2fa/disable → exige contraseña + código vigente
//
// El secreto y los códigos de recuperación viven en campos `hidden` de
// PocketBase: este componente solo recibe el secreto una vez, durante el
// enrolamiento, para poder mostrarlo/mostrar su URI.
// =============================================================================

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Copy, Download, KeyRound, ShieldCheck, ShieldOff } from 'lucide-react';
import { useTranslations } from '../../../i18n/utils';
import type { Lang } from '../../../i18n/ui';
import Section from '../shared/Section';
import { Field } from '../shared/Field';
import { csrfHeaders } from '@/lib/csrf-client';

interface SecuritySectionProps {
  lang: Lang;
}

interface TwoFactorStatus {
  enabled: boolean;
  pendingSetup: boolean;
  recoveryCodesRemaining: number;
}

interface SetupPayload {
  secret: string;
  otpauthUrl: string;
  issuer: string;
  account: string;
}

type Phase = 'loading' | 'idle' | 'setup' | 'recovery' | 'unavailable';

const JSON_HEADERS = (): Record<string, string> => ({
  'Content-Type': 'application/json',
  Origin: window.location.origin,
  ...csrfHeaders(),
});

export default function SecuritySection({ lang }: SecuritySectionProps) {
  const t = useTranslations(lang);

  const [phase, setPhase] = useState<Phase>('loading');
  const [status, setStatus] = useState<TwoFactorStatus>({
    enabled: false,
    pendingSetup: false,
    recoveryCodesRemaining: 0,
  });
  const [setup, setSetup] = useState<SetupPayload | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const errorMessage = useCallback(
    (code: string): string => {
      switch (code) {
        case 'invalid_code':
          return t('profile.security.error.invalidCode');
        case 'invalid_credentials':
          return t('profile.security.error.credentials');
        case 'two_factor_already_enabled':
          return t('profile.security.error.alreadyEnabled');
        case 'two_factor_unavailable':
        case 'auth_backend_unavailable':
          return t('profile.security.error.unavailable');
        default:
          return t('profile.security.error.generic');
      }
    },
    [t]
  );

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/2fa/status', {
        headers: { Origin: window.location.origin, ...csrfHeaders() },
        credentials: 'include',
      });
      if (res.status === 503) {
        setPhase('unavailable');
        return;
      }
      if (!res.ok) {
        setPhase('idle');
        return;
      }
      const data = (await res.json()) as TwoFactorStatus;
      setStatus(data);
      setPhase('idle');
    } catch {
      setPhase('idle');
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const startSetup = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch('/api/auth/2fa/setup', {
        method: 'POST',
        headers: JSON_HEADERS(),
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(errorMessage(data.error || ''));
        return;
      }
      const data = (await res.json()) as SetupPayload;
      setSetup(data);
      setCode('');
      setPhase('setup');
    } catch {
      setError(t('profile.security.error.generic'));
    } finally {
      setBusy(false);
    }
  };

  const confirmSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/2fa/enable', {
        method: 'POST',
        headers: JSON_HEADERS(),
        credentials: 'include',
        body: JSON.stringify({ code: code.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(errorMessage(data.error || ''));
        return;
      }
      const data = (await res.json()) as { recoveryCodes: string[] };
      setRecoveryCodes(data.recoveryCodes ?? []);
      setStatus({
        enabled: true,
        pendingSetup: false,
        recoveryCodesRemaining: (data.recoveryCodes ?? []).length,
      });
      setPhase('recovery');
    } catch {
      setError(t('profile.security.error.generic'));
    } finally {
      setBusy(false);
    }
  };

  const disableTwoFactor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: JSON_HEADERS(),
        credentials: 'include',
        body: JSON.stringify({ password, code: disableCode.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(errorMessage(data.error || ''));
        return;
      }
      setPassword('');
      setDisableCode('');
      setStatus({ enabled: false, pendingSetup: false, recoveryCodesRemaining: 0 });
      setPhase('idle');
      setNotice(t('profile.security.disabled.success'));
    } catch {
      setError(t('profile.security.error.generic'));
    } finally {
      setBusy(false);
    }
  };

  const copyValue = async (value: string, key: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      window.setTimeout(() => setCopied(null), 2500);
    } catch {
      setError(t('profile.security.error.generic'));
    }
  };

  const downloadRecoveryCodes = () => {
    const header = `${t('profile.security.recovery.title')} — ArtesaNica\n\n`;
    const blob = new Blob([header + recoveryCodes.join('\n') + '\n'], {
      type: 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'artesanica-codigos-recuperacion.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (phase === 'loading') {
    return <Section title={t('profile.security.title')} loading />;
  }

  return (
    <Section
      title={t('profile.security.title')}
      description={t('profile.security.description')}
      error={error}
    >
      {notice && (
        <p className="text-sm text-exito bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-xl p-4">
          {notice}
        </p>
      )}

      {phase === 'unavailable' && (
        <div className="bg-blanco dark:bg-zinc-900 border border-borde rounded-2xl p-6">
          <p className="text-sm text-error">
            {t('profile.security.error.unavailable')}
          </p>
        </div>
      )}

      {/* Estado actual ---------------------------------------------------- */}
      {phase !== 'unavailable' && (
        <div className="bg-blanco dark:bg-zinc-900 border border-borde rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="flex items-start gap-4">
            <div
              className={
                status.enabled
                  ? 'size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0'
                  : 'size-12 rounded-xl bg-fondo text-texto-secundario flex items-center justify-center shrink-0'
              }
            >
              {status.enabled ? (
                <ShieldCheck className="size-6" />
              ) : (
                <ShieldOff className="size-6" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-texto">
                {status.enabled
                  ? t('profile.security.status.enabled')
                  : t('profile.security.status.disabled')}
              </p>
              <p className="text-sm text-texto-secundario mt-1">
                {status.enabled
                  ? t('profile.security.recoveryRemaining').replace(
                      '{count}',
                      String(status.recoveryCodesRemaining)
                    )
                  : t('profile.security.status.disabledHint')}
              </p>
            </div>
            {status.enabled && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-exito bg-exito/10 px-3 py-1.5 rounded-full shrink-0">
                <CheckCircle2 className="size-3.5" />
                {t('profile.security.status.badge')}
              </span>
            )}
          </div>

          {phase === 'idle' && !status.enabled && !status.pendingSetup && (
            <button
              type="button"
              onClick={startSetup}
              disabled={busy}
              className="inline-flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-primary-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <ShieldCheck className="size-4" />
              {t('profile.security.enable.start')}
            </button>
          )}

          {/* Enrolamiento: secreto + código de confirmación ---------------- */}
          {(phase === 'setup' || (phase === 'idle' && status.pendingSetup)) &&
            setup && (
              <form
                onSubmit={confirmSetup}
                className="border-t border-borde pt-5 space-y-4"
              >
                <div>
                  <h3 className="font-semibold text-texto">
                    {t('profile.security.setup.title')}
                  </h3>
                  <p className="text-sm text-texto-secundario mt-1">
                    {t('profile.security.setup.description')}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <span className="block text-sm font-medium text-texto">
                    {t('profile.security.setup.secretLabel')}
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <code className="px-3.5 py-2.5 rounded-xl border border-borde bg-fondo text-texto font-mono text-sm break-all">
                      {setup.secret}
                    </code>
                    <button
                      type="button"
                      onClick={() => copyValue(setup.secret, 'secret')}
                      className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-borde text-sm font-medium text-texto hover:bg-fondo transition-colors"
                    >
                      <Copy className="size-4" />
                      {copied === 'secret'
                        ? t('profile.security.setup.copied')
                        : t('profile.security.setup.copy')}
                    </button>
                  </div>
                  <p className="text-xs text-texto-secundario">
                    {t('profile.security.setup.secretHint')}
                  </p>
                </div>

                {setup.otpauthUrl && (
                  <p className="text-xs">
                    <a
                      href={setup.otpauthUrl}
                      className="inline-flex items-center gap-1.5 text-primary hover:text-primary-dark font-medium"
                    >
                      <KeyRound className="size-3.5" />
                      {t('profile.security.setup.openInApp')}
                    </a>
                  </p>
                )}

                <Field
                  label={t('profile.security.setup.codeLabel')}
                  name="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  required
                  value={code}
                  onChange={(e) =>
                    setCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                  }
                  placeholder="123456"
                  helper={t('profile.security.setup.codeHint')}
                />

                <button
                  type="submit"
                  disabled={busy || code.length !== 6}
                  className="inline-flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-primary-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <ShieldCheck className="size-4" />
                  {busy
                    ? t('profile.security.setup.confirming')
                    : t('profile.security.setup.confirm')}
                </button>
              </form>
            )}

          {/* Enrolamiento iniciado en otra sesión: reintentar -------------- */}
          {phase === 'idle' && status.pendingSetup && !setup && (
            <div className="border-t border-borde pt-5 space-y-3">
              <p className="text-sm text-texto-secundario">
                {t('profile.security.setup.resumeHint')}
              </p>
              <button
                type="button"
                onClick={startSetup}
                disabled={busy}
                className="inline-flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-primary-dark transition-colors disabled:opacity-60"
              >
                <ShieldCheck className="size-4" />
                {t('profile.security.setup.restart')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Códigos de recuperación (se muestran una única vez) -------------- */}
      {phase === 'recovery' && recoveryCodes.length > 0 && (
        <div className="bg-blanco dark:bg-zinc-900 border border-borde rounded-2xl p-6 shadow-2xs space-y-4">
          <div>
            <h3 className="font-semibold text-texto">
              {t('profile.security.recovery.title')}
            </h3>
            <p className="text-sm text-texto-secundario mt-1">
              {t('profile.security.recovery.description')}
            </p>
          </div>
          <ul className="grid grid-cols-2 gap-2 font-mono text-sm">
            {recoveryCodes.map((recoveryCode) => (
              <li
                key={recoveryCode}
                className="px-3 py-2 rounded-lg border border-borde bg-fondo text-texto text-center"
              >
                {recoveryCode}
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => copyValue(recoveryCodes.join('\n'), 'recovery')}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-borde text-sm font-medium text-texto hover:bg-fondo transition-colors"
            >
              <Copy className="size-4" />
              {copied === 'recovery'
                ? t('profile.security.setup.copied')
                : t('profile.security.recovery.copyAll')}
            </button>
            <button
              type="button"
              onClick={downloadRecoveryCodes}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-borde text-sm font-medium text-texto hover:bg-fondo transition-colors"
            >
              <Download className="size-4" />
              {t('profile.security.recovery.download')}
            </button>
            <button
              type="button"
              onClick={() => {
                setRecoveryCodes([]);
                setPhase('idle');
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-colors"
            >
              {t('profile.security.recovery.saved')}
            </button>
          </div>
        </div>
      )}

      {/* Desactivar 2FA --------------------------------------------------- */}
      {status.enabled && (phase === 'idle' || phase === 'recovery') && (
        <form
          onSubmit={disableTwoFactor}
          className="bg-blanco dark:bg-zinc-900 border border-borde rounded-2xl p-6 shadow-2xs space-y-4"
        >
          <div>
            <h3 className="font-semibold text-texto">
              {t('profile.security.disable.title')}
            </h3>
            <p className="text-sm text-texto-secundario mt-1">
              {t('profile.security.disable.description')}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label={t('profile.security.disable.password')}
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Field
              label={t('profile.security.disable.code')}
              name="disableCode"
              inputMode="numeric"
              required
              value={disableCode}
              onChange={(e) => setDisableCode(e.target.value.trim())}
              placeholder="123456"
              helper={t('profile.security.disable.codeHint')}
            />
          </div>
          <button
            type="submit"
            disabled={busy || !password || disableCode.length < 6}
            className="inline-flex items-center gap-2 bg-error text-white px-5 py-2.5 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <ShieldOff className="size-4" />
            {busy
              ? t('profile.security.disable.submitting')
              : t('profile.security.disable.submit')}
          </button>
        </form>
      )}
    </Section>
  );
}
