// =============================================================================
// useGeolocation.ts — React hook for the browser geolocation API.
// =============================================================================
// Wraps navigator.geolocation.getCurrentPosition with:
//   - sessionStorage caching so we don't re-prompt within the same session.
//   - Status state machine (idle | pending | granted | denied | outOfNI |
//     unsupported | error) for explicit UI handling.
//   - Validates result against NICARAGUA_BOUNDS so we can show a clear
//     "out of Nicaragua" message instead of an empty distance-sorted list.
//
// Auto-requests on mount (per UX decision: geolocation is the default sort
// signal for /mapa). Components that want manual control can pass
// `{ autoRequest: false }`.
// =============================================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { isWithinNicaragua } from '@/lib/geo';

export type GeoStatus =
  | 'idle'
  | 'pending'
  | 'granted'
  | 'denied'
  | 'unsupported'
  | 'outOfNI'
  | 'error';

export interface GeoCoords {
  lat: number;
  lon: number;
  accuracy?: number;
}

export interface GeoState {
  status: GeoStatus;
  coords: GeoCoords | null;
  error: string | null;
}

const CACHE_KEY = 'artesa-geo-cache-v1';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 min

interface CachedGeo {
  coords: GeoCoords;
  ts: number;
}

function readCache(): CachedGeo | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedGeo;
    if (!parsed || typeof parsed.ts !== 'number') return null;
    if (Date.now() - parsed.ts > CACHE_TTL_MS) return null;
    if (!parsed.coords) return null;
    // typeof NaN === 'number', asi que el typeof-check no alcanza.
    // Hay que validar finiteness para evitar pasar (NaN, NaN) a Leaflet
    // si el GPS del navegador devolvio coordenadas corruptas.
    if (!Number.isFinite(parsed.coords.lat)) return null;
    if (!Number.isFinite(parsed.coords.lon)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(coords: GeoCoords): void {
  try {
    sessionStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ coords, ts: Date.now() } satisfies CachedGeo),
    );
  } catch {
    /* sessionStorage disabled */
  }
}

function clearCache(): void {
  try {
    sessionStorage.removeItem(CACHE_KEY);
  } catch {
    /* noop */
  }
}

interface UseGeolocationOptions {
  /** Si false, no pide permiso al montar. Default true. */
  autoRequest?: boolean;
}

export function useGeolocation(
  options: UseGeolocationOptions = {},
): GeoState & { request: () => void; clear: () => void } {
  const { autoRequest = true } = options;
  const [state, setState] = useState<GeoState>(() => {
    const cached = readCache();
    if (cached) {
      const valid = isWithinNicaragua(cached.coords.lat, cached.coords.lon);
      return {
        status: valid ? 'granted' : 'outOfNI',
        coords: cached.coords,
        error: null,
      };
    }
    return { status: 'idle', coords: null, error: null };
  });

  const requestedRef = useRef(false);

  const request = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setState({
        status: 'unsupported',
        coords: null,
        error: 'Geolocation API no disponible',
      });
      return;
    }

    setState((prev) => ({ ...prev, status: 'pending', error: null }));

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: GeoCoords = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
        // Defensiva: algunos navegadores devuelven NaN si el GPS esta
        // degradado o si el usuario revoco permisos a medio camino.
        // Si pasan NaN, no cacheamos ni marcamos granted.
        if (!Number.isFinite(coords.lat) || !Number.isFinite(coords.lon)) {
          setState({
            status: 'error',
            coords: null,
            error: 'Coordenadas invalidas del navegador',
          });
          return;
        }
        const valid = isWithinNicaragua(coords.lat, coords.lon);
        if (valid) {
          writeCache(coords);
          setState({ status: 'granted', coords, error: null });
        } else {
          // Cacheamos igual para no re-pedir, pero marcamos outOfNI.
          writeCache(coords);
          setState({ status: 'outOfNI', coords, error: null });
        }
      },
      (err) => {
        let status: GeoStatus = 'error';
        if (err.code === err.PERMISSION_DENIED) status = 'denied';
        else if (err.code === err.TIMEOUT) status = 'error';
        setState({
          status,
          coords: null,
          error: err.message ?? 'Error desconocido',
        });
      },
      {
        enableHighAccuracy: false,
        timeout: 10_000,
        maximumAge: 5 * 60 * 1000,
      },
    );
  }, []);

  const clear = useCallback(() => {
    clearCache();
    setState({ status: 'idle', coords: null, error: null });
    requestedRef.current = false;
  }, []);

  useEffect(() => {
    if (!autoRequest) return;
    if (requestedRef.current) return;
    if (state.status !== 'idle') return; // ya tenemos cache valido
    requestedRef.current = true;
    request();
  }, [autoRequest, request, state.status]);

  return { ...state, request, clear };
}
