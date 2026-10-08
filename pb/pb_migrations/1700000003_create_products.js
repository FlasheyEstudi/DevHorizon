/// <reference path="../pb_data/types.d.ts" />

// =============================================================================
// 1700000003_create_products.js
// =============================================================================
// Crea la coleccion `products`. Pertenecen a una tienda y pueden tener
// varias imagenes y categorias.
// =============================================================================

migrate((app) => {
  const storesCol = app.findCollectionByNameOrId("stores");
  const categoriesCol = app.findCollectionByNameOrId("categories");

  const collection = new Collection({
    name: "products",
    type: "base",
    listRule: "", // publico
    viewRule: "", // publico
    createRule: "@request.auth.role = 'seller' || @request.auth.role = 'admin'",
    updateRule: "@request.auth.id != '' && (@request.auth.role = 'admin' || store.owner = @request.auth.id)",
    deleteRule: "@request.auth.role = 'admin' || store.owner = @request.auth.id",
    fields: [
      { name: "name", type: "text", required: true },
      { name: "slug", type: "text", required: true, options: { pattern: "^[a-z0-9-]+$" } },
      { name: "description", type: "text", required: false },
      { name: "price", type: "number", required: true, options: { min: 0 } },
      { name: "stock", type: "number", required: true, options: { min: 0 }, defaultValue: 0 },
      // Imagenes del producto.
      {
        name: "images",
        type: "file",
        required: false,
        maxSelect: 8,
        maxSize: 5 * 1024 * 1024,
        mimeTypes: ["image/jpeg", "image/png", "image/webp"],
      },
      // Tienda a la que pertenece.
      {
        name: "store",
        type: "relation",
        required: true,
        collectionId: storesCol.id,
        cascadeDelete: true,
        maxSelect: 1,
      },
      // Categorias (puede estar en varias).
      {
        name: "categories",
        type: "relation",
        required: false,
        collectionId: categoriesCol.id,
        cascadeDelete: false,
        maxSelect: 5,
      },
      // Tags libres (json array de strings).
      {
        name: "tags",
        type: "json",
        required: false,
        options: { maxSize: 2000 },
      },
      // Rating promedio (calculado por hook o por reviews agregadas).
      {
        name: "rating_avg",
        type: "number",
        required: false,
        options: { min: 0, max: 5, noDecimal: true },
        defaultValue: 0,
      },
      {
        name: "rating_count",
        type: "number",
        required: false,
        options: { min: 0, noDecimal: true },
        defaultValue: 0,
      },
      // Estado del producto.
      {
        name: "status",
        type: "select",
        required: true,
        maxSelect: 1,
        values: ["draft", "published", "archived"],
        defaultValue: "draft",
      },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_products_slug ON products (slug)",
      "CREATE INDEX idx_products_status ON products (status)",
    ],
  });

  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("products");
  app.delete(collection);
});