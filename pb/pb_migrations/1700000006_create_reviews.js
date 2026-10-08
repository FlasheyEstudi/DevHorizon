/// <reference path="../pb_data/types.d.ts" />

// =============================================================================
// 1700000006_create_reviews.js
// =============================================================================
// Crea la coleccion `reviews`. Resenas de productos.
// =============================================================================

migrate((app) => {
  const usersCol = app.findCollectionByNameOrId("users");
  const productsCol = app.findCollectionByNameOrId("products");

  const collection = new Collection({
    name: "reviews",
    type: "base",
    listRule: "", // publico
    viewRule: "", // publico
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != '' && user = @request.auth.id",
    deleteRule: "@request.auth.id != '' && (user = @request.auth.id || @request.auth.role = 'admin')",
    fields: [
      {
        name: "user",
        type: "relation",
        required: true,
        collectionId: usersCol.id,
        cascadeDelete: true,
        maxSelect: 1,
      },
      {
        name: "product",
        type: "relation",
        required: true,
        collectionId: productsCol.id,
        cascadeDelete: true,
        maxSelect: 1,
      },
      {
        name: "rating",
        type: "number",
        required: true,
        options: { min: 1, max: 5, noDecimal: true },
      },
      {
        name: "comment",
        type: "text",
        required: false,
        options: { max: 2000 },
      },
    ],
    indexes: [
      "CREATE INDEX idx_reviews_product ON reviews (product)",
    ],
  });

  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("reviews");
  app.delete(collection);
});