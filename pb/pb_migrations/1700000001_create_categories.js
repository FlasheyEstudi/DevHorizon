/// <reference path="../pb_data/types.d.ts" />

// =============================================================================
// 1700000001_create_categories.js
// =============================================================================
// Crea la coleccion `categories` para clasificar productos.
// Soporta jerarquia (subcategorias) via `parent` self-relation.
// Se usa el patron de dos pasos: primero crear la collection sin la
// self-reference, luego agregar el campo `parent` con la collectionId.
// =============================================================================

migrate((app) => {
  // Paso 1: crear la collection sin la self-reference.
  const collection = new Collection({
    name: "categories",
    type: "base",
    listRule: "",
    viewRule: "",
    createRule: "@request.auth.role = 'admin'",
    updateRule: "@request.auth.role = 'admin'",
    deleteRule: "@request.auth.role = 'admin'",
    fields: [
      { name: "name", type: "text", required: true },
      { name: "slug", type: "text", required: true, options: { pattern: "^[a-z0-9-]+$" } },
      { name: "description", type: "text", required: false },
      { name: "icon", type: "text", required: false },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_categories_slug ON categories (slug)",
    ],
  });

  app.save(collection);

  // Paso 2: agregar el campo `parent` con la collectionId ya resuelta.
  collection.fields.add(new Field({
    name: "parent",
    type: "relation",
    required: false,
    collectionId: collection.id,
    cascadeDelete: false,
    maxSelect: 1,
  }));

  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("categories");
  app.delete(collection);
});