// =============================================================================
// POST /api/auth/register
// =============================================================================
// Crea un nuevo user en PocketBase y devuelve el user + token en cookie.
//
// Per spec REQ-E1..E3 (privilege escalation fix):
//   - Zod `.strict()` rejects ANY extra field, including role / verified /
//     emailVisibility. The only accepted fields are: email, password,
//     passwordConfirm, name, phone, avatar, locale.
//   - Role is NEVER read from the body. PB applies its collection default
//     (`user` or `buyer`) automatically; we do not pass role to .create().
//
// Per spec REQ-A2, REQ-C, REQ-D1, REQ-D2:
//   - PB client from Astro.locals.pb.
//   - CSRF validated via helper.
//   - Cookie via setAuthCookie().
//   - Structured log via logAuthEvent() — never log email/password/token.
//
// Body: { email, password, passwordConfirm, name?, phone?, avatar?, locale? }
// =============================================================================

import type { APIRoute } from 'astro';
import { z } from 'zod';
import { setAuthCookie } from '../../../lib/auth/cookie';
import { validateCsrf } from '../../../lib/auth/csrf';
import { logAuthEvent } from '../../../lib/auth/logger';

export const prerender = false;

const RegisterSchema = z
  .object({
    email: z.string().email({ message: 'Email inválido' }),
    password: z.string().min(8),
    passwordConfirm: z.string().min(8),
    name: z.string().min(1).optional(),
    phone: z.string().optional(),
    avatar: z.string().optional(),
    locale: z.enum(['es', 'en']).default('es'),
  })
  .strict()
  .refine((data) => data.password === data.passwordConfirm, {
    message: 'Passwords do not match',
    path: ['passwordConfirm'],
  });

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function clientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

export const POST: APIRoute = async ({ request, cookies, locals }) => {
  // 1. CSRF.
  const csrfError = validateCsrf(request, cookies);
  if (csrfError) return csrfError;

  // 2. Parse + validate body. .strict() rejects any extra field.
  const body = await request.json().catch(() => null);
  const parsed = RegisterSchema.safeParse(body);
  if (!parsed.success) {
    // Surface unrecognized_keys errors distinctly so the client knows the
    // field was disallowed rather than malformed.
    const issues = parsed.error.issues;
    const unrecognized = issues.find((i) => i.code === 'unrecognized_keys');
    if (unrecognized) {
      logAuthEvent('auth.register_rejected', {
        ip: clientIp(request),
      });
      const fields = z.flattenError(parsed.error).fieldErrors;
      return jsonResponse(
        { error: 'Invalid field', fields },
        400
      );
    }

    logAuthEvent('auth.register_validation_error', {
      ip: clientIp(request),
    });
    return jsonResponse(
      { error: 'Invalid request', details: z.flattenError(parsed.error) },
      400
    );
  }

  // 3. Per-request PB client.
  const pb = locals.pb;

  // 4. Create user. PB requires passwordConfirm in the create payload.
  let createdUser;
  try {
    createdUser = await pb.collection('users').create({
      email: parsed.data.email,
      password: parsed.data.password,
      passwordConfirm: parsed.data.password,
      name: parsed.data.name ?? '',
      role: 'user',
      phone: parsed.data.phone,
      avatar: parsed.data.avatar,
      locale: parsed.data.locale,
    });
  } catch (err: unknown) {
    const status = (err as { status?: number }).status ?? 500;
    logAuthEvent('auth.register_failed', {
      ip: clientIp(request),
    });
    const message =
      status === 400 || status === 409
        ? 'El correo electrónico ya está registrado o los datos son inválidos'
        : 'Error interno al registrar el usuario';
    return jsonResponse({ error: message }, status >= 400 && status < 600 ? status : 500);
  }

  // 5. Auto-login para otorgar sesión inmediata.
  try {
    const authData = await pb
      .collection('users')
      .authWithPassword(parsed.data.email, parsed.data.password);

    setAuthCookie(cookies, authData.token, authData.record);

    logAuthEvent('auth.register_success', {
      userId: authData.record.id,
      ip: clientIp(request),
    });

    return jsonResponse({ user: authData.record }, 201);
  } catch {
    // Si la creación fue exitosa pero el login automático falló,
    // se devuelve 201 indicando que la cuenta existe para que ingrese manualmente.
    return jsonResponse({ user: createdUser, requiresLogin: true }, 201);
  }
};