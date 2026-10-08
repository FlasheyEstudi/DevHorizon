// =============================================================================
// 1700000015_exclude_dev_from_rate_limits.js
// =============================================================================
// Excluye 127.0.0.1 y ::1 de los rate limits globales de PB. Solo aplica a
// dev local — en prod los rate limits siguen activos para todos los IPs.
//
// Por que:
//   PocketBase 0.27 trae rate limits por default que se activan al instalar:
//     { label: "*:auth",            duration: 3,    maxRequests: 2   }
//     { label: "*:create",          duration: 5,    maxRequests: 20  }
//     { label: "/api/batch",        duration: 1,    maxRequests: 3   }
//     { label: "/api/",             duration: 10,   maxRequests: 300 }
//   En dev, con HMR de Vite + Astro SSR, el dev server hace muchas llamadas
//   paralelas desde 127.0.0.1 (products, categories, stores, auth-refresh) y
//   estos limites se disparan, devolviendo 429 "Too Many Requests" al browser
//   en operaciones triviales como navegar entre /perfil y /.
//
// Idempotente: si los IPs ya estan en excludedIPs, no duplica.
// =============================================================================

const DEV_IPS = ["127.0.0.1", "::1", "::ffff:127.0.0.1"];

migrate((app) => {
  const settings = app.settings();
  const rl = settings.rateLimits ?? { rules: [], excludedIPs: [], enabled: true };
  const existing = new Set(rl.excludedIPs ?? []);
  const merged = [...(rl.excludedIPs ?? [])];
  for (const ip of DEV_IPS) {
    if (!existing.has(ip)) merged.push(ip);
  }
  settings.rateLimits = {
    ...rl,
    excludedIPs: merged,
    enabled: true,
  };
  app.save(settings);
}, (app) => {
  // Down: removemos solo los IPs que este script agrego (best-effort).
  const settings = app.settings();
  const current = settings.rateLimits?.excludedIPs ?? [];
  settings.rateLimits = {
    ...settings.rateLimits,
    excludedIPs: current.filter((ip) => !DEV_IPS.includes(ip)),
  };
  app.save(settings);
});