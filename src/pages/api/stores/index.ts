// =============================================================================
// /api/stores
// =============================================================================
// GET  /api/stores?search=&page=&perPage=  -> Lista publica de tiendas.
// POST /api/stores                          -> Crea una tienda.
//
// POST body: { name, slug, description?, category, department,
//              address_text?, location?: { lat, lon } }
//
// Reglas:
//   - Auth requerida (401).
//   - CSRF validado (403).
//   - Slug unico (409 si existe).
//   - Department en el enum locked de 17 valores.
//   - Location opcional; si viene, debe estar dentro de Nicaragua y
//     no en Null Island (lon=0, lat=0).
//   - Auto-promocion: si el user.role === 'user', se promueve a 'seller'
//     en la misma operacion. Si ya es 'seller' o 'admin', no se toca.
//   - Un user solo puede tener UNA tienda: si ya es dueno, 409.
//
// Devuelve 201 con { store, promoted: boolean }.
// =============================================================================

import type { APIRoute } from 'astro';
import { z } from 'zod';
import { pocketbaseFor } from '../../../lib/pocketbase';
import { validateCsrf } from '../../../lib/auth/csrf';
import { setAuthCookie } from '../../../lib/auth/cookie';
import { DEPARTMENTS, isWithinNicaragua } from '../../../lib/geo';

export const prerender = false;

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const SLUG_PATTERN = /^[a-z0-9-]+$/;
const STORE_CATEGORIES = [
  'ceramica',
  'textil',
  'madera',
  'cuero',
  'joyeria',
  'cesteria',
  'otro',
] as const;

const LocationSchema = z.object({
  lat: z.number().min(10.7).max(15.0),
  lon: z.number().min(-87.7).max(-83.1),
});

const CreateBodySchema = z
  .object({
    name: z.string().min(2).max(200),
    slug: z.string().min(2).max(120).regex(SLUG_PATTERN),
    description: z.string().max(2000).optional().default(''),
    category: z.enum(STORE_CATEGORIES),
    department: z.enum(DEPARTMENTS),
    address_text: z.string().max(500).optional().default(''),
    location: LocationSchema.optional().nullable(),
  })
  .strict();

export const GET: APIRoute = async ({ url }) => {
  const pageParam = parseInt(url.searchParams.get('page') ?? '1', 10);
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;

  const perPageParam = parseInt(url.searchParams.get('perPage') ?? '30', 10);
  const perPage = Number.isInteger(perPageParam) && perPageParam > 0 ? Math.min(perPageParam, 100) : 30;

  const search = (url.searchParams.get('search') ?? '').trim();

  try {
    // Singleton publico: usamos `pb` porque GET no necesita auth.
    const { pb } = await import('../../../lib/pocketbase');
    const filter = search
      ? pb.filter('(name ~ {:search} || description ~ {:search})', { search })
      : '';
    const list = await pb.collection('stores').getList(page, perPage, {
      sort: '-created_at',
      filter,
    });
    return jsonResponse(list, 200);
  } catch {
    return jsonResponse({ error: 'Error al listar tiendas' }, 500);
  }
};

export const POST: APIRoute = async ({ request, cookies }) => {
  // 1. CSRF.
  const csrfError = validateCsrf(request, cookies);
  if (csrfError) return csrfError;

  // 2. Auth.
  const pb = pocketbaseFor(request);
  const authRecord = pb.authStore.record;
  if (!authRecord) {
    return jsonResponse({ error: 'unauthorized' }, 401);
  }

  // 3. Body parse + validate.
  const raw = await request.json().catch(() => null);
  const parsed = CreateBodySchema.safeParse(raw);
  if (!parsed.success) {
    return jsonResponse(
      { error: 'validation', details: z.flattenError(parsed.error) },
      400
    );
  }

  // 4. Location guard: not Null Island si viene location.
  if (
    parsed.data.location &&
    parsed.data.location.lat === 0 &&
    parsed.data.location.lon === 0
  ) {
    return jsonResponse(
      { error: 'validation', details: { location: ['null_island'] } },
      400
    );
  }
  if (
    parsed.data.location &&
    !isWithinNicaragua(parsed.data.location.lat, parsed.data.location.lon)
  ) {
    return jsonResponse(
      { error: 'validation', details: { location: ['out_of_bounds'] } },
      400
    );
  }

  // 5. Slug unico (PB no tiene UNIQUE constraint sobre slug; el seed
  //    crea el indice pero las APIs deben validar igual para evitar race
  //    conditions y devolver 409 explicito).
  try {
    const existing = await pb
      .collection('stores')
      .getList(1, 1, { filter: `slug = "${parsed.data.slug}"` });
    if (existing.items.length > 0) {
      return jsonResponse(
        { error: 'slug_taken', details: { slug: ['already_exists'] } },
        409
      );
    }
  } catch {
    // Fall through; PB create fallara igual si hay duplicado.
  }

  // 6. Un user solo puede tener UNA tienda.
  try {
    const owned = await pb
      .collection('stores')
      .getList(1, 1, { filter: pb.filter('owner = {:ownerId}', { ownerId: authRecord.id }) });
    if (owned.items.length > 0) {
      return jsonResponse({ error: 'already_owner' }, 409);
    }
  } catch {
    // Ignore.
  }

  // 7. Auto-promote a seller si role === 'user'.
  let promoted = false;
  if (authRecord.role === 'user') {
    try {
      const updatedUser = await pb
        .collection('users')
        .update(authRecord.id, { role: 'seller' });
      promoted = true;
      // Refrescar la cookie pb_auth con el record actualizado (que ahora
      // tiene role='seller'). Sin esto, el siguiente request leeria el
      // role viejo del cookie y endpoints role-gated (products POST,
      // dashboard stats) seguirian fallando.
      if (pb.authStore.token) {
        setAuthCookie(cookies, pb.authStore.token, updatedUser);
      }
    } catch {
      // Si falla el promote, devolvemos 500 — el rol no se cambio pero
      // tampoco creamos tienda (todo o nada).
      return jsonResponse({ error: 'promote_failed' }, 500);
    }
  }

  // 8. Crear tienda.
  try {
    const store = await pb.collection('stores').create({
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description,
      category: parsed.data.category,
      department: parsed.data.department,
      address_text: parsed.data.address_text,
      location: parsed.data.location ?? undefined,
      owner: authRecord.id,
    });
    return jsonResponse({ store, promoted }, 201);
  } catch (err: unknown) {
    // Si la creación de la tienda falló y el usuario había sido promovido,
    // revertir su rol a 'user' para mantener la consistencia transaccional (H-05).
    if (promoted) {
      try {
        const revertedUser = await pb.collection('users').update(authRecord.id, { role: 'user' });
        if (pb.authStore.token) {
          setAuthCookie(cookies, pb.authStore.token, revertedUser);
        }
      } catch {
        // Fallback silencioso de reversión
      }
    }

    const pbErr = err as { data?: { data?: Record<string, string> } };
    // Si el slug choca en la creacion (race), 409.
    const fieldErrors = pbErr?.data?.data ?? {};
    const slugError = Object.values(fieldErrors).some(
      (v) => typeof v === 'string' && v.toLowerCase().includes('slug')
    );
    if (slugError) {
      return jsonResponse(
        { error: 'slug_taken', details: { slug: ['already_exists'] } },
        409
      );
    }
    return jsonResponse({ error: 'create_failed', details: fieldErrors }, 500);
  }
};