// =============================================================================
// api/admin.ts — Helpers compartidos de los endpoints /api/admin/*
// =============================================================================
// - jsonResponse(): respuesta JSON uniforme para los endpoints de admin.
// - requireAdminContext(): resuelve el cliente PocketBase del request y exige
//   rol 'admin'. Retorna { pb, admin } o un Response de error (401/403) listo
//   para devolver desde el handler.
//
// Se centraliza para que todos los endpoints de administracion (categorias,
// noticias, sugerencias) compartan el mismo guard y el mismo shape de error,
// en vez de duplicar el chequeo de rol en cada archivo.
// =============================================================================

import type { APIContext } from 'astro';
import type PocketBase from 'pocketbase';
import type { RecordModel } from 'pocketbase';
import { pocketbaseFor } from '../pocketbase';

export function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export interface AdminContext {
  pb: PocketBase;
  admin: RecordModel;
}

/**
 * Exige rol admin. Devuelve el contexto o un Response de error (401 sin
 * sesion / 403 sin rol admin).
 *
 * El cliente PB viene de `locals.pb` (lo inyecta el middleware con la cookie
 * del request); el fallback a `pocketbaseFor` cubre ejecuciones sin middleware.
 */
export function requireAdminContext(context: APIContext): AdminContext | Response {
  const pb: PocketBase =
    (context.locals.pb as PocketBase | undefined) ?? pocketbaseFor(context.request);

  const record = pb.authStore.record;
  if (!record) return jsonResponse({ error: 'unauthorized' }, 401);

  if ((record as { role?: string }).role !== 'admin') {
    return jsonResponse({ error: 'forbidden' }, 403);
  }

  return { pb, admin: record };
}
