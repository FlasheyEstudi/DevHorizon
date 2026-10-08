/// <reference path="../pb_data/types.d.ts" />

// =============================================================================
// 1700000024_add_user_2fa.js
// =============================================================================
// Agrega autenticación en dos pasos (TOTP, RFC 6238) a la colección `users`.
//
// Campos nuevos:
//   1. `totp_enabled`        (bool)   — 2FA activo para el usuario.
//   2. `totp_secret`         (text)   — secreto Base32 confirmado (160 bits).
//   3. `totp_pending_secret` (text)   — secreto durante el enrolamiento, aún
//                                       sin confirmar con un código válido.
//   4. `totp_recovery_codes` (json)   — array de hashes SHA-256 de los códigos
//                                       de recuperación de un solo uso.
//   5. `totp_last_counter`   (number) — último paso temporal TOTP aceptado;
//                                       bloquea la reutilización de un código
//                                       ya consumido (replay).
//
// IMPORTANTE — todos los campos son `hidden: true`:
//   PocketBase excluye los campos hidden de TODA respuesta de la API pública
//   (list/view/create/update y las respuestas de auth con password). Solo el
//   cliente de superusuario (que usa `ensureAdminAuth()` server-side) puede
//   leerlos y escribirlos. Gracias a esto el secreto TOTP nunca llega al
//   navegador y ningún usuario puede auto-activarse el 2FA por un PATCH
//   directo a /api/collections/users/records/{id}.
//
// Idempotente: cada campo se agrega solo si no existe.
// Down: elimina los 5 campos (los secretos se descartan; el 2FA se desactiva).
// =============================================================================

const TOTP_FIELDS = [
  { name: "totp_enabled", type: "bool" },
  { name: "totp_secret", type: "text", max: 128 },
  { name: "totp_pending_secret", type: "text", max: 128 },
  { name: "totp_recovery_codes", type: "json" },
  { name: "totp_last_counter", type: "number" },
];

migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    let changed = false;

    for (const spec of TOTP_FIELDS) {
      if (users.fields.getByName(spec.name)) continue;

      const data = {
        name: spec.name,
        type: spec.type,
        required: false,
        hidden: true,
      };
      if (spec.max) {
        data.max = spec.max;
      }

      users.fields.add(new Field(data));
      changed = true;
    }

    if (changed) {
      app.save(users);
    }
  },
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    let changed = false;

    for (const spec of TOTP_FIELDS) {
      if (!users.fields.getByName(spec.name)) continue;
      users.fields.removeByName(spec.name);
      changed = true;
    }

    if (changed) {
      app.save(users);
    }
  }
);
