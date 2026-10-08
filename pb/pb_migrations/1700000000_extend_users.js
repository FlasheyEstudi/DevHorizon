/// <reference path="../pb_data/types.d.ts" />

// =============================================================================
// 1700000000_extend_users.js
// =============================================================================
// Extiende la coleccion `users` (built-in de PocketBase) con campos extra
// para ArtesaNica: role, phone, avatar, locale.
// =============================================================================

migrate((app) => {
  const collection = app.findCollectionByNameOrId("users");

  // Campo role: select con tres opciones.
  collection.fields.add(new Field({
    name: "role",
    type: "select",
    required: true,
    maxSelect: 1,
    values: ["user", "seller", "admin"],
    defaultValue: "user",
  }));

  // Telefono de contacto (opcional, validado como texto libre).
  collection.fields.add(new Field({
    name: "phone",
    type: "text",
    required: false,
  }));

  // Avatar del usuario.
  collection.fields.add(new Field({
    name: "avatar",
    type: "file",
    required: false,
    maxSelect: 1,
    maxSize: 5 * 1024 * 1024, // 5 MB
    mimeTypes: ["image/jpeg", "image/png", "image/webp"],
  }));

  // Locale preferido del usuario (para i18n).
  collection.fields.add(new Field({
    name: "locale",
    type: "select",
    required: false,
    maxSelect: 1,
    values: ["es", "en"],
    defaultValue: "es",
  }));

  // Email verificado (PocketBase ya lo trae, pero lo dejamos explicito).
  // El campo `verified` viene por default; no lo recreamos.

  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("users");
  collection.fields.removeByName("role");
  collection.fields.removeByName("phone");
  collection.fields.removeByName("avatar");
  collection.fields.removeByName("locale");
  app.save(collection);
});