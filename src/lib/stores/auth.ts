// =============================================================================
// auth.ts — Auth store global con nanostores
// =============================================================================
// Mantiene el usuario actual en memoria. La fuente de verdad es la cookie
// `pb_auth` que el server setea en /api/auth/login. En cada carga de pagina
// se llama a /api/auth/me para refrescar.
// =============================================================================

import { atom } from 'nanostores';
import { csrfHeaders } from '@lib/csrf-client';

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  role?: 'user' | 'seller' | 'admin';
  avatar?: string;
  created?: string;
  updated?: string;
}

/**
 * Resultado del paso 1 del login.
 * Cuando la cuenta tiene 2FA activo el servidor NO emite sesión: devuelve
 * `twoFactorRequired: true` y hay que llamar a `verifyTwoFactor(code)`.
 */
export type LoginResult =
  | { twoFactorRequired: true }
  | { twoFactorRequired: false; user: AuthUser };

export const authUser = atom<AuthUser | null>(null);
export const authLoading = atom<boolean>(false);

/** Hace login via API y guarda el user en el store. */
export async function login(
  email: string,
  password: string
): Promise<LoginResult> {
  authLoading.set(true);
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: window.location.origin,
        ...csrfHeaders(),
      },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Error al autenticar' }));
      throw new Error(err.error || 'Error al autenticar');
    }
    const data = await res.json();
    if (data.twoFactorRequired) {
      return { twoFactorRequired: true };
    }
    authUser.set(data.user);
    return { twoFactorRequired: false, user: data.user };
  } finally {
    authLoading.set(false);
  }
}

/**
 * Paso 2 del login: canjea el desafío 2FA (cookie HttpOnly `pb_2fa`) por la
 * sesión real usando un código TOTP de 6 dígitos o un código de recuperación.
 */
export async function verifyTwoFactor(code: string): Promise<AuthUser> {
  authLoading.set(true);
  try {
    const res = await fetch('/api/auth/2fa/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: window.location.origin,
        ...csrfHeaders(),
      },
      body: JSON.stringify({ code }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'invalid_code' }));
      const error = new Error(err.error || 'invalid_code') as Error & {
        attemptsRemaining?: number;
      };
      if (typeof err.attemptsRemaining === 'number') {
        error.attemptsRemaining = err.attemptsRemaining;
      }
      throw error;
    }
    const data = await res.json();
    authUser.set(data.user);
    return data.user;
  } finally {
    authLoading.set(false);
  }
}

/** Hace logout y limpia el store. */
export async function logout(): Promise<void> {
  await fetch('/api/auth/logout', {
    method: 'POST',
    headers: {
      Origin: window.location.origin,
      ...csrfHeaders(),
    },
  });
  authUser.set(null);
}

let refreshPromise: Promise<AuthUser | null> | null = null;

/** Refresca el user actual desde /api/auth/me. Deduplica llamadas concurrentes en vuelo. */
export async function refreshAuth(): Promise<AuthUser | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: {
          Origin: window.location.origin,
          ...csrfHeaders(),
        },
      });
      if (res.status === 401) {
        authUser.set(null);
        return null;
      }
      const data = await res.json();
      authUser.set(data.user);
      return data.user;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}