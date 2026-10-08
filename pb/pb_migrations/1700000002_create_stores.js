/// <reference path="../pb_data/types.d.ts" />

// =============================================================================
// 1700000002_create_stores.js
// =============================================================================
// Crea la coleccion `stores`. Cada seller tiene una o mas tiendas.
// =============================================================================

migrate((app) => {
  const usersCol = app.findCollectionByNameOrId("users");

  const collection = new Collection({
    name: "stores",
    type: "base",
    listRule: "", // publico
    viewRule: "", // publico
    createRule: "@request.auth.role = 'seller' || @request.auth.role = 'admin'",
    updateRule: "@request.auth.id != '' && (owner = @request.auth.id || @request.auth.role = 'admin')",
    deleteRule: "@request.auth.role = 'admin' || owner = @request.auth.id",
    fields: [
      { name: "name", type: "text", required: true },
      { name: "slug", type: "text", required: true, options: { pattern: "^[a-z0-9-]+$" } },
      { name: "description", type: "text", required: false },
      { name: "location", type: "text", required: false }, // ciudad / direccion
      {
        name: "category",
        type: "select",
        required: false,
        maxSelect: 1,
        values: ["ceramica", "textil", "madera", "cuero", "joyeria", "cesteria", "otro"],
      },
      // Owner = user que creo la tienda. Un seller puede tener varias tiendas.
      {
        name: "owner",
        type: "relation",
        required: true,
        collectionId: usersCol.id,
        cascadeDelete: true,
        maxSelect: 1,
      },
      // Logo.
      {
        name: "logo",
        type: "file",
        required: false,
        maxSelect: 1,
        maxSize: 3 * 1024 * 1024,
        mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/svg+xml"],
      },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_stores_slug ON stores (slug)",
    ],
  });

  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("stores");
  app.delete(collection);
});