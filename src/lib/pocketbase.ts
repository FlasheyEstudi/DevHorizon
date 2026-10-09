// =============================================================================
// pocketbase.ts
// =============================================================================
// Cliente PocketBase para uso SERVER-SIDE y CLIENT-SIDE.
//
// Estrategia de Fallback:
//   - Intenta conectar al servidor PocketBase configurado (por defecto localhost:8090).
//   - Si localhost no responde o no esta disponible, conmuta automaticamente
//     a https://vapor-invented.pockethost.io.
// =============================================================================

import PocketBase from 'pocketbase';
import { getPocketBaseUrl, getPocketBaseUrlSync } from './pb-url';
import { runtimeEnv } from './env';

export { getPocketBaseUrl, getPocketBaseUrlSync, pbFileUrl, FALLBACK_POCKETBASE_URL } from './pb-url';

const INITIAL_CONFIG_URL =
	cleanUrl(runtimeEnv('POCKETBASE_URL', import.meta.env.POCKETBASE_URL)) ||
	cleanUrl(
		runtimeEnv('PUBLIC_POCKETBASE_URL', import.meta.env.PUBLIC_POCKETBASE_URL),
	) ||
	'http://127.0.0.1:8090';

function cleanUrl(url: string): string {
	return url.replace(/\/+$/, '');
}

/** Hook interceptor para asegurar que las peticiones apunten a la URL activa. */
function interceptRequest(url: string, options: Record<string, unknown>) {
	const activeUrl = getPocketBaseUrlSync();
	const primaryUrl = cleanUrl(INITIAL_CONFIG_URL);
	if (activeUrl !== primaryUrl && url.startsWith(primaryUrl)) {
		url = activeUrl + url.substring(primaryUrl.length);
	}
	return { url, options };
}

/**
 * Cliente PocketBase singleton SIN sesion.
 */
export const pb = new PocketBase(getPocketBaseUrlSync());
pb.autoCancellation(false);
pb.beforeSend = (url, options) => interceptRequest(url, options);

/**
 * Per-request PocketBase client.
 */
export function pocketbaseFor(request: Request): PocketBase {
	const activeUrl = getPocketBaseUrlSync();
	const client = new PocketBase(activeUrl);
	client.autoCancellation(true);
	client.beforeSend = (url, options) => interceptRequest(url, options);
	const cookieHeader = request.headers.get('cookie') ?? '';
	client.authStore.loadFromCookie(cookieHeader);
	client.authStore.onChange(() => {});
	return client;
}

/**
 * Crea un cliente PocketBase NUEVO con la cookie `pb_auth` del request actual reenviada.
 */
export function pocketbaseWithAuth(cookieHeader: string | null): PocketBase {
	const activeUrl = getPocketBaseUrlSync();
	const client = new PocketBase(activeUrl);
	client.autoCancellation(false);
	client.beforeSend = (url, options) => interceptRequest(url, options);

	if (cookieHeader) {
		client.authStore.loadFromCookie(cookieHeader);
	}

	return client;
}

/**
 * Cliente PocketBase dedicado para operaciones de admin.
 *
 * Completamente aislado del singleton publico `pb` — tiene su propio
 * authStore para que las credenciales de admin nunca contaminen las
 * queries publicas SSR que usan `pb`.
 */
const adminPb = new PocketBase(getPocketBaseUrlSync());
adminPb.autoCancellation(false);
adminPb.beforeSend = (url, options) => interceptRequest(url, options);

let adminAuthPromise: Promise<void> | null = null;

export async function ensureAdminAuth(): Promise<PocketBase> {
	await getPocketBaseUrl();

	// Si el token de admin ya esta cargado y es valido, retornar inmediatamente.
	if (adminPb.authStore.isValid) {
		return adminPb;
	}

	if (!adminAuthPromise) {
		adminAuthPromise = (async () => {
			try {
				const email = runtimeEnv(
					'POCKETBASE_ADMIN_EMAIL',
					import.meta.env.POCKETBASE_ADMIN_EMAIL,
				);
				const password = runtimeEnv(
					'POCKETBASE_ADMIN_PASSWORD',
					import.meta.env.POCKETBASE_ADMIN_PASSWORD,
				);
				if (!email || !password) {
					throw new Error('POCKETBASE_ADMIN_EMAIL y POCKETBASE_ADMIN_PASSWORD requeridos para admin auth.');
				}
				
				// Autenticación de superusuario (PocketBase v0.23.0+ usa '_superusers')
				// autoRefreshThreshold renueva automáticamente el token 30m antes de expirar.
				await adminPb.collection('_superusers').authWithPassword(email, password, {
					autoRefreshThreshold: 30 * 60,
				});
			} catch (err) {
				adminAuthPromise = null;
				throw err;
			}
		})();
	}

	try {
		await adminAuthPromise;
	} catch (err) {
		adminAuthPromise = null;
		throw err;
	}

	return adminPb;
}

