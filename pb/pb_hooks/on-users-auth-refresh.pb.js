/// <reference path="../pb_data/types.d.ts" />

// =============================================================================
// on-users-auth-refresh.js
// =============================================================================
// Hook de auditoria para los eventos `onRecordAuthRefreshRequest` de
// PocketBase 0.27 (POST /api/collections/users/auth-refresh).
//
// v1: solo emite una linea JSON a stdout con campos allow-listed.
// NO logueamos email, password, token completo, IP ni User-Agent.
// v2 (futuro): persistir en una coleccion `auth_events` para dashboard.
// =============================================================================

console.log("[auth-refresh-hook] module loaded; registering onRecordAuthRefreshRequest");

try {
  onRecordAuthRefreshRequest((e) => {
    // Solo campos allow-listed para v1. e.record puede ser undefined si
    // el refresh fallo (token expirado / invalido) — manejamos ambos casos.
    const userId = e.record && e.record.id ? e.record.id : null;
    console.log(JSON.stringify({
      event: "auth.refresh",
      userId: userId,
      ts: new Date().toISOString(),
    }));
  });
} catch (err) {
  // Si la API del hook cambia entre versiones de PB, no queremos romper
  // el arranque del server. El hook es no-critico (auditoria).
  console.error("[auth-refresh-hook] failed to register:", err && err.message ? err.message : err);
}