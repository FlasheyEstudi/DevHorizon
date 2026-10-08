/// <reference path="../pb_data/types.d.ts" />

// =============================================================================
// on-orders-create.pb.js
// =============================================================================
// Valida que haya stock suficiente para cada item de la orden y descuenta
// el stock atomicamente antes de que la orden sea persistida.
//
// Bug 2: `products.stock` no se tocaba nunca. Podias vender infinitas
//        unidades de algo sin stock.
//
// Estrategia (hook transaccional onRecordCreate; PB 0.23+ exige e.next()):
//   1. Recorremos `orders.items` (snapshot: [{productId, quantity, ...}]).
//   2. Para cada item, fetch del product y validacion `stock >= quantity`.
//   3. Si algun item falla, throw ValidationError -> la orden NO se crea
//      y el cliente recibe 400 con el detalle.
//   4. Si todos pasan, guardamos los productos con su nuevo stock.
//      Al estar en onRecordCreate, los app.save() ocurren dentro de
//      la misma transaccion que la creacion de la orden -> atomico.
//      Si algo falla (incluida la propia creacion de la orden), todo
//      rollback junto.
//
// Edge cases manejados:
//   - items vacio o no-array -> rechaza la orden.
//   - item sin productId o quantity invalida -> rechaza la orden.
//   - product borrado entre carrito y orden -> rechaza SOLO ese item
//     (sumamos al mensaje de error, la orden no se crea).
//   - quantity > stock -> rechaza con detalle de cuantos quedan.
//
// Importante: los hooks de PB corren como super-admin, por lo que
// app.save() aqui bypasea las updateRule de `products` (no requieren
// que el buyer sea admin o dueno).
// =============================================================================

console.log("[orders-hook] registering onRecordCreate on orders");

try {
  onRecordCreate((e) => {
    // Los campos json en el JSVM se leen como texto: `get("items")` devuelve un
    // JSONRaw (bytes), no un array de objetos. Hay que parsearlos.
    let items = [];
    try {
      items = JSON.parse(e.record.getString("items") || "[]");
    } catch (_err) {
      items = [];
    }

    if (!Array.isArray(items) || items.length === 0) {
      throw new ValidationError("La orden no tiene items.");
    }

    const errors = [];
    const updates = [];

    for (const item of items) {
      const productId = item && item.productId;
      const qty = item && Number(item.quantity);

      if (!productId) {
        errors.push("Item sin productId: " + JSON.stringify(item));
        continue;
      }
      if (!Number.isFinite(qty) || qty < 1) {
        errors.push("Cantidad invalida para " + productId + ": " + item.quantity);
        continue;
      }

      let product;
      try {
        product = e.app.findRecordById("products", productId);
      } catch (_err) {
        // Producto borrado entre el carrito y el checkout.
        errors.push("Producto " + productId + " ya no existe.");
        continue;
      }

      const stock = Number(product.get("stock")) || 0;
      if (stock < qty) {
        errors.push(
          'Stock insuficiente para "' + product.get("name") +
          '" (disponible: ' + stock + ", solicitado: " + qty + ")."
        );
        continue;
      }

      // Stock OK -> programar descuento atomico.
      product.set("stock", stock - qty);
      updates.push(product);
    }

    if (errors.length > 0) {
      throw new ValidationError(errors.join(" "));
    }

    // Persistir descuentos dentro de la misma transaccion que la orden.
    for (const product of updates) {
      e.app.save(product);
    }

    // La cadena de hooks de PB 0.23+ exige continuar explicitamente.
    e.next();
  }, "orders");

  console.log("[orders-hook] onRecordCreate registrado en orders");

  // Repone el stock de los productos asociados a una orden cancelada o eliminada.
  function restoreOrderStock(app, record) {
    let items = [];
    try {
      items = JSON.parse(record.getString("items") || "[]");
    } catch (_err) {
      items = [];
    }
    if (!Array.isArray(items) || items.length === 0) return;

    for (const item of items) {
      const productId = item && item.productId;
      const qty = item && Number(item.quantity);
      if (!productId || !Number.isFinite(qty) || qty < 1) continue;

      try {
        const product = app.findRecordById("products", productId);
        const currentStock = Number(product.get("stock")) || 0;
        product.set("stock", currentStock + qty);
        app.save(product);
      } catch (_err) {
        // Producto eliminado del catálogo, ignorar
      }
    }
  }

  // Hook para reponer stock al cambiar el estado a 'cancelled'
  onRecordUpdate((e) => {
    const newStatus = e.record.getString("status");
    const oldRecord = typeof e.record.originalCopy === 'function' ? e.record.originalCopy() : null;
    const oldStatus = oldRecord ? oldRecord.getString("status") : null;
    if (newStatus === "cancelled" && oldStatus !== "cancelled") {
      restoreOrderStock(e.app, e.record);
    }
    e.next();
  }, "orders");

  // Hook para reponer stock si la orden se elimina antes de estar cancelada
  onRecordDelete((e) => {
    const status = e.record.getString("status");
    if (status !== "cancelled") {
      restoreOrderStock(e.app, e.record);
    }
    e.next();
  }, "orders");
} catch (err) {
  console.error("[orders-hook] failed to register:", err && err.message ? err.message : err);
}