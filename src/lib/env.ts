// =============================================================================
// env.ts — Lectura de variables de entorno válida en dev, Vercel y Docker.
// =============================================================================
// Vite reemplaza literalmente `import.meta.env.X` en el bundle durante el
// build. En un despliegue autoalojado (Docker) eso dejaría la configuración
// "congelada" con lo que existía al construir la imagen — y los secretos
// quedarían dentro de la imagen.
//
// Este helper prioriza `process.env` en el servidor (12-factor: la
// configuración entra por el entorno de ejecución) y cae al valor de
// `import.meta.env` (dev y bundle de cliente) cuando no existe. No cambia el
// comportamiento en desarrollo ni en Vercel, donde ambos valores coinciden.
//
// Nota: se accede a `process` vía `globalThis` para no depender de
// `@types/node` ni romper el bundle del navegador (donde `process` no existe).
//
// Uso:
//   runtimeEnv('POCKETBASE_ADMIN_EMAIL', import.meta.env.POCKETBASE_ADMIN_EMAIL)
// =============================================================================

interface ProcessLike {
  env?: Record<string, string | undefined>;
}

function processEnv(): Record<string, string | undefined> | undefined {
  if (typeof globalThis === 'undefined') return undefined;
  const maybeProcess = (globalThis as { process?: ProcessLike }).process;
  return maybeProcess && typeof maybeProcess.env === 'object'
    ? maybeProcess.env ?? undefined
    : undefined;
}

/** Valor de `process.env[name]` si existe y no está vacío; si no, el fallback. */
export function runtimeEnv(name: string, fallback?: string): string {
  const env = processEnv();
  if (env) {
    const fromProcess = env[name];
    if (typeof fromProcess === 'string' && fromProcess !== '') {
      return fromProcess;
    }
  }
  return typeof fallback === 'string' ? fallback : '';
}
