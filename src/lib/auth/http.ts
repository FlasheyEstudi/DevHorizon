// =============================================================================
// http.ts — Helpers compartidos por los endpoints de autenticación.
// =============================================================================
// Respuestas JSON y extracción de IP del cliente, para no repetir el mismo
// boilerplate en cada endpoint de /api/auth/2fa/*.
// =============================================================================

/** Respuesta de error JSON con el formato `{ error }` del resto de /api/auth. */
export function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Respuesta JSON 200 con el payload indicado. */
export function jsonOk(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** IP del cliente según el proxy (Vercel la envía en x-forwarded-for). */
export function clientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}
