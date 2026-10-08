// =============================================================================
// pb-url.ts — Utilidades ligeras para resolucion de URLs de PocketBase
// =============================================================================
// No importa el SDK de PocketBase (`pocketbase`), por lo que es 100% seguro de
// importar en islas de React cliente (evita cargar el bundle SDK en el browser).
// =============================================================================

import { useEffect, useState } from 'react';

export const FALLBACK_POCKETBASE_URL = 'https://vapor-invented.pockethost.io';
const INITIAL_CONFIG_URL =
	(typeof import.meta !== 'undefined' &&
		import.meta.env &&
		(import.meta.env.POCKETBASE_URL || import.meta.env.PUBLIC_POCKETBASE_URL)) ||
	'http://127.0.0.1:8090';

const SESSION_CACHE_KEY = 'pb_active_url';
const CACHE_TTL_MS = 5000;

function cleanUrl(url: string): string {
	return url.replace(/\/+$/, '');
}

let resolvedUrl: string | null = null;
let lastCheckTimestamp = 0;

const primaryUrlClean = cleanUrl(INITIAL_CONFIG_URL);
if (!primaryUrlClean.includes('127.0.0.1') && !primaryUrlClean.includes('localhost')) {
	resolvedUrl = primaryUrlClean;
}

if (typeof window !== 'undefined') {
	try {
		const cached = sessionStorage.getItem(SESSION_CACHE_KEY);
		if (cached) resolvedUrl = cached;
	} catch {
		// Silent catch for sessionStorage errors (e.g. disabled cookies).
	}
}

type Listener = (url: string) => void;
const listeners = new Set<Listener>();

export function subscribePocketBaseUrl(listener: Listener): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

function notifyListeners(url: string) {
	listeners.forEach((fn) => {
		try {
			fn(url);
		} catch {}
	});
}

/**
 * Resuelve y devuelve la URL activa de PocketBase.
 * Si la URL configurada es local (localhost / 127.0.0.1), verifica disponibilidad via /api/health.
 * Si falla o da timeout, conmuta automaticamente a FALLBACK_POCKETBASE_URL.
 */
export async function getPocketBaseUrl(): Promise<string> {
	const primaryUrl = cleanUrl(INITIAL_CONFIG_URL);
	const fallbackUrl = cleanUrl(FALLBACK_POCKETBASE_URL);

	if (!primaryUrl.includes('127.0.0.1') && !primaryUrl.includes('localhost')) {
		resolvedUrl = primaryUrl;
		return resolvedUrl;
	}

	const now = Date.now();
	if (resolvedUrl && now - lastCheckTimestamp < CACHE_TTL_MS) {
		return resolvedUrl;
	}

	let nextUrl = fallbackUrl;
	try {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), 300);
		const res = await fetch(`${primaryUrl}/api/health`, {
			method: 'GET',
			signal: controller.signal,
		});
		clearTimeout(timer);
		if (res.ok) {
			nextUrl = primaryUrl;
		}
	} catch {
		nextUrl = fallbackUrl;
	}

	const changed = resolvedUrl !== nextUrl;
	resolvedUrl = nextUrl;
	lastCheckTimestamp = now;

	if (typeof window !== 'undefined') {
		try {
			sessionStorage.setItem(SESSION_CACHE_KEY, resolvedUrl);
		} catch {}
		if (changed) {
			notifyListeners(resolvedUrl);
		}
	}

	return resolvedUrl;
}

/**
 * Devuelve sincronamente la ultima URL resuelta de PocketBase (o la configurada inicialmente).
 */
export function getPocketBaseUrlSync(): string {
	return resolvedUrl || cleanUrl(INITIAL_CONFIG_URL);
}

/**
 * Helper para construir la URL publica de un archivo de PocketBase.
 */
export function pbFileUrl(collectionId: string, recordId: string, filename: string): string {
	const baseUrl = getPocketBaseUrlSync();
	const col = collectionId || 'products';
	return `${baseUrl}/api/files/${col}/${recordId}/${filename}`;
}

/**
 * Hook de React para reaccionar a cambios en la URL activa de PocketBase.
 */
export function usePocketBaseUrl(): string {
	const [url, setUrl] = useState<string>(() => getPocketBaseUrlSync());

	useEffect(() => {
		const unsubscribe = subscribePocketBaseUrl((newUrl) => {
			setUrl(newUrl);
		});
		getPocketBaseUrl().then((resolved) => {
			setUrl(resolved);
		});
		return unsubscribe;
	}, []);

	return url;
}

if (typeof window !== 'undefined') {
	getPocketBaseUrl().catch(() => {});
}
