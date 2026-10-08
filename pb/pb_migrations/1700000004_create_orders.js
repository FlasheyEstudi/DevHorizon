/// <reference path="../pb_data/types.d.ts" />

// =============================================================================
// 1700000004_create_orders.js
// =============================================================================
// Crea la coleccion `orders`. Snapshot de items al momento de la compra.
// =============================================================================

migrate((app) => {
  const usersCol = app.findCollectionByNameOrId("users");

  const collection = new Collection({
    name: "orders",
    type: "base",
    listRule: "@request.auth.id != '' && (user = @request.auth.id || @request.auth.role = 'admin')",
    viewRule: "@request.auth.id != '' && (user = @request.auth.id || @request.auth.role = 'admin' || @request.auth.role = 'seller')",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.role = 'admin' || (@request.auth.role = 'seller' && status != 'paid')",
    deleteRule: "@request.auth.role = 'admin'",
    fields: [
      // User que hizo la orden.
      {
        name: "user",
        type: "relation",
        required: true,
        collectionId: usersCol.id,
        cascadeDelete: false,
        maxSelect: 1,
      },
      // Snapshot de items: [{ productId, name, price, quantity, image }].
      {
        name: "items",
        type: "json",
        required: true,
        options: { maxSize: 50000 },
      },
      {
        name: "total",
        type: "number",
        required: true,
        options: { min: 0 },
      },
      // Estado del pago y envio.
      {
        name: "status",
        type: "select",
        required: true,
        maxSelect: 1,
        values: ["pending", "paid", "shipped", "delivered", "cancelled"],
        defaultValue: "pending",
      },
      // Direccion de envio (json con campos completos).
      {
        name: "shipping_address",
        type: "json",
        required: true,
        options: { maxSize: 5000 },
      },
      // Metodo de pago.
      {
        name: "payment_method",
        type: "select",
        required: false,
        maxSelect: 1,
        values: ["cash", "transfer", "card", "other"],
      },
      // Notas del comprador.
      {
        name: "notes",
        type: "text",
        required: false,
      },
    ],
    indexes: [
      "CREATE INDEX idx_orders_status ON orders (status)",
      "CREATE INDEX idx_orders_user ON orders (user)",
    ],
  });

  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("orders");
  app.delete(collection);
});