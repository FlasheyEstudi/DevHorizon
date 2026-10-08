/// <reference path="../pb_data/types.d.ts" />

// =============================================================================
// 1700000007_auth_hardening.js
// =============================================================================
// Configura los rate limits globales de PocketBase 0.27 para los endpoints
// de autenticacion sensibles del proyecto ArtesaNica.
//
// Aplica las siguientes reglas por IP (audience: cualquier origen):
//   - authWithPassword:        5 requests / minuto
//   - requestPasswordReset:    3 requests / hora
//   - confirmPasswordReset:    5 requests / hora
//
// En PB 0.27 los rate limits viven en `app.settings().rateLimits.rules`
// (NO son un campo de la coleccion `users`, como en versiones <= 0.22).
// duration esta en SEGUNDOS (ver RateLimitRule.duration en types.d.ts).
//
// Down: desactiva el rate limiter globalmente y limpia las reglas.
// =============================================================================

const RATE_LIMIT_LABELS = {
  authWithPassword: "POST /api/collections/users/auth-with-password",
  requestPasswordReset: "POST /api/collections/users/request-password-reset",
  confirmPasswordReset: "POST /api/collections/users/confirm-password-reset",
};

const RATE_LIMIT_RULES = [
  { key: "authWithPassword", maxRequests: 5, duration: 60 },
  { key: "requestPasswordReset", maxRequests: 3, duration: 3600 },
  { key: "confirmPasswordReset", maxRequests: 5, duration: 3600 },
];

migrate((app) => {
  const settings = app.settings();

  // Idempotente: si la regla ya existe con los mismos valores, no la duplicamos.
  const existing = settings.rateLimits.rules || [];
  const existingLabels = new Set(existing.map((r) => r.label));

  const merged = [...existing];
  for (const rule of RATE_LIMIT_RULES) {
    if (existingLabels.has(RATE_LIMIT_LABELS[rule.key])) continue;
    merged.push({
      label: RATE_LIMIT_LABELS[rule.key],
      audience: "", // aplica a guests y authed
      duration: rule.duration,
      maxRequests: rule.maxRequests,
    });
  }

  settings.rateLimits.enabled = true;
  settings.rateLimits.rules = merged;

  app.save(settings);
}, (app) => {
  const settings = app.settings();
  settings.rateLimits.enabled = false;
  settings.rateLimits.rules = [];
  app.save(settings);
});