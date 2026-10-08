// =============================================================================
// refresh.ts — Conditional PB JWT rotation.
//
// Per design §3.5 + spec REQ-F1..F2:
//   If the access token in `pb_auth` has less than 5 minutes of lifetime
//   remaining, call pb.collection('users').authRefresh() to rotate it.
//   Otherwise skip the call to keep SSR renders cheap.
//
//   The JWT payload is decoded WITHOUT signature verification — PB SDK has
//   already verified the token via loadFromCookie. We only need the `exp`
//   claim to decide whether to refresh.
//
//   On authRefresh failure: log a warning and continue with the stale token
//   for this request so the user is not kicked out mid-render. They will be
//   asked to re-login on the next page load if the token is truly dead.
// =============================================================================

import type PocketBase from 'pocketbase';

const REFRESH_THRESHOLD_SECONDS = 300;

export interface JwtPayload {
  id?: string;
  type?: string;
  collectionId?: string;
  exp?: number;
  iat?: number;
}

export function decodeJwtPayload(token: string): JwtPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    // Node 22 + Edge runtimes expose globalThis.atob. PocketBase JWTs use
    // base64url; replace URL-safe chars before decoding.
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const json = atob(padded);
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * Refresh the PB access token if it is within REFRESH_THRESHOLD_SECONDS of
 * expiry. Returns true when a refresh was attempted and succeeded, false
 * otherwise (no token, plenty of lifetime, or refresh failed).
 */
export async function maybeRefresh(pb: PocketBase): Promise<boolean> {
  const token = pb.authStore.token;
  if (!token) return false;

  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') return false;

  const nowSeconds = Math.floor(Date.now() / 1000);
  const secondsLeft = payload.exp - nowSeconds;
  if (secondsLeft >= REFRESH_THRESHOLD_SECONDS) return false;

  try {
    await pb.collection('users').authRefresh();
    return true;
  } catch (err) {
    console.warn(
      JSON.stringify({
        event: 'auth.refresh.failed',
        hasRecord: Boolean(pb.authStore.record),
        msg: err instanceof Error ? err.message : String(err),
      })
    );
    return false;
  }
}
