// =============================================================================
// /api/reviews
// =============================================================================
// GET  /api/reviews?product=<id>   -> lista publica de resenas de un producto
// POST /api/reviews                -> crea una resena (requiere sesion)
//
// POST body: { productId: string, rating: 1..5, comment?: string }
//
// Reglas adicionales validadas server-side (no las cubre el schema solo):
//   - Rating entre 1 y 5 (Zod).
//   - El usuario NO puede resenar su propio producto (validamos que
//     `product.store.owner !== currentUser.id`).
//   - Un usuario solo puede dejar UNA resena por producto (forzado por el
//     indice UNIQUE idx_reviews_user_product).
// =============================================================================

import type { APIRoute } from 'astro';
import { z } from 'zod';
import { validateCsrf } from '../../../lib/auth/csrf';

export const prerender = false;

const CreateReviewSchema = z.object({
	productId: z.string().min(1),
	rating: z.number().int().min(1).max(5),
	comment: z.string().max(2000).optional().default(''),
});

export const GET: APIRoute = async ({ request, locals }) => {
	const url = new URL(request.url);
	const productId = url.searchParams.get('product');
	if (!productId) {
		return new Response(JSON.stringify({ error: 'Falta ?product=<id>' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	// Usamos `locals.pb` (cliente per-request que el middleware ya hidrato
	// correctamente con `loadFromCookie`). Esto evita depender del helper
	// `pocketbaseWithAuth` que tenia un bug de shape de cookie.
	const pb = locals.pb;
	try {
		// No usamos expand: 'user' porque la viewRule de `users` (default PB) es
		// `id = @request.auth.id`, lo que rompe el expand desde otra sesion o
		// sin sesion. El nombre del autor viene denormalizado en
		// `user_name_snapshot` desde el POST.
		//
		// Sort: usamos `-created_at` (campo date explicito agregado por la
		// migracion 14). Mas expresivo que `-@rowid` y mantiene orden
		// cronologico real (no solo orden de insercion SQLite).
		const result = await pb.collection('reviews').getList(1, 100, {
			filter: pb.filter('product = {:productId}', { productId }),
			sort: '-created_at',
		});
		return new Response(JSON.stringify({ reviews: result.items }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (err: unknown) {
		const pbErr = err as {
			status?: number;
			message?: string;
			data?: {
				status?: number;
				message?: string;
				data?: Record<string, string>;
			};
		};
		console.error('[api/reviews][GET] error:', {
			productId,
			pbStatus: pbErr?.status,
			pbMessage: pbErr?.message,
			pbData: pbErr?.data,
			fieldErrors: pbErr?.data?.data,
			authIsValid: pb.authStore.isValid,
			hasRecord: !!pb.authStore.record,
			raw: err,
		});
		return new Response(JSON.stringify({ error: 'Error al listar reseñas' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
};

export const POST: APIRoute = async ({ request, locals, cookies }) => {
	// Validación de CSRF
	const csrfError = validateCsrf(request, cookies);
	if (csrfError) return csrfError;

	const pb = locals.pb;

	if (!pb.authStore.isValid || !pb.authStore.record) {
		return new Response(JSON.stringify({ error: 'No autenticado' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const body = await request.json().catch(() => null);
	const parsed = CreateReviewSchema.safeParse(body);
	if (!parsed.success) {
		return new Response(
			JSON.stringify({
				error: 'Datos invalidos',
				details: z.flattenError(parsed.error),
			}),
			{
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			},
		);
	}

	const currentUserId = pb.authStore.record.id as string;

	// 1. Verificar que el producto existe y conocer su tienda + owner.
	let product;
	try {
		product = await pb.collection('products').getOne(parsed.data.productId);
	} catch {
		return new Response(JSON.stringify({ error: 'Producto no encontrado' }), {
			status: 404,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	// 2. El dueno de la tienda del producto no puede resenar su propio producto.
	//    Como `store` es una relacion simple (no expandida por default), hacemos
	//    un fetch explicito para evitar surprises.
	try {
		const store = await pb.collection('stores').getOne(product.store as string);
		if (store.owner === currentUserId) {
			return new Response(
				JSON.stringify({
					error: 'No puedes reseñar tu propio producto',
				}),
				{
					status: 403,
					headers: { 'Content-Type': 'application/json' },
				},
			);
		}
	} catch {
		return new Response(JSON.stringify({ error: 'Tienda del producto no encontrada' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	// 3. Crear la resena. El indice UNIQUE (user, product) protege contra
	//    duplicados; si lo hay, PB devuelve un 4xx con shape:
	//      { status, message: "Failed to create record.", data: { "<field>": "..." } }
	//    El SDK expone `err.data` como el BODY COMPLETO, asi que los detalles
	//    de validacion estan en `err.data.data` (NO err.data.details).
	//    Para UNIQUE: data = { product: "Value must be unique", user: "..." }.
	const userName = (pb.authStore.record as { name?: string })?.name || pb.authStore.record.email || 'Anónimo';

	try {
		const review = await pb.collection('reviews').create({
			user: currentUserId,
			product: parsed.data.productId,
			rating: parsed.data.rating,
			comment: parsed.data.comment || '',
			user_name_snapshot: userName,
		});
		return new Response(JSON.stringify({ review }), {
			status: 201,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (err: unknown) {
		// PB SDK expone err.data como el response body completo. Shape real:
		//   { status: 400, message: "Failed to create record.",
		//     data: { <field>: "<mensaje>", ... } }
		const pbErr = err as {
			data?: {
				status?: number;
				message?: string;
				data?: Record<string, string>;
			};
			message?: string;
			status?: number;
		};
		const fieldErrors = pbErr?.data?.data || {};
		const isUniqueViolation = Object.values(fieldErrors).some(
			(v) => typeof v === 'string' && v.toLowerCase().includes('unique')
		);
		if (isUniqueViolation) {
			return new Response(
				JSON.stringify({
					error: 'Ya dejaste una reseña para este producto',
				}),
				{
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				},
			);
		}
		console.error('[api/reviews][POST] error:', err);
		return new Response(
			JSON.stringify({
				error: 'Error al crear la reseña',
			}),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			},
		);
	}
};
