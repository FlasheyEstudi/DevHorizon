/// <reference path="../pb_data/types.d.ts" />

// =============================================================================
// 1700000005_create_cart_items.js
// =============================================================================
// Crea la coleccion `cart_items`. Carrito persistente en DB.
// Cada user tiene un item por producto en su carrito.
// =============================================================================

migrate((app) => {
  const usersCol = app.findCollectionByNameOrId("users");
  const productsCol = app.findCollectionByNameOrId("products");

  const collection = new Collection({
    name: "cart_items",
    type: "base",
    listRule: "@request.auth.id != '' && user = @request.auth.id",
    viewRule: "@request.auth.id != '' && user = @request.auth.id",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != '' && user = @request.auth.id",
    deleteRule: "@request.auth.id != '' && user = @request.auth.id",
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
        name: "quantity",
        type: "number",
        required: true,
        options: { min: 1, noDecimal: true },
        defaultValue: 1,
      },
    ],
    indexes: [
      // Un user no puede tener dos cart_items del mismo producto.
      "CREATE UNIQUE INDEX idx_cart_user_product ON cart_items (user, product)",
    ],
  });

  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("cart_items");
  app.delete(collection);
});