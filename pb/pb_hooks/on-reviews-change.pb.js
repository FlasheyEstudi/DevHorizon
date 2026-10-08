/// <reference path="../pb_data/types.d.ts" />

// =============================================================================
// on-reviews-change.pb.js
// =============================================================================
// Mantiene `products.rating_avg` y `products.rating_count` sincronizados
// cuando se crea, edita o borra una review.
//
// Bug 1: los campos denormalizados nunca se actualizaban, por lo que
//        rating_avg quedaba en 0 y rating_count en 0 indefinidamente.
//
// Estrategia: despues de cualquier mutacion exitosa sobre `reviews`,
// recalculamos avg+count del product asociado leyendo TODAS las reviews
// de ese product. Como `rating_avg` en el schema es `noDecimal`
// (entero 0-5), redondeamos al entero mas cercano.
//
// Edge case: si un usuario cambia el `product` de su propia review
// (improbable porque el updateRule lo prohibe en la practica, pero
// defensivo), solo recalculamos el product NUEVO. El VIEJO quedaria
// desincronizado. Trade-off aceptado: no se permite cambio de product.
// =============================================================================

console.log("[reviews-hook] module loaded; registering onRecordAfter*Success on reviews");

function recomputeProductRating(app, productId) {
  if (!productId) return;

  const reviews = app.findRecordsByFilter(
    "reviews",
    "product = {:pid}",
    null, // sort
    0,   // limit (0 = sin limite)
    0,   // offset
    { pid: productId }
  );

  const count = reviews.length;
  let avg = 0;
  if (count > 0) {
    let sum = 0;
    for (const r of reviews) {
      sum += Number(r.get("rating")) || 0;
    }
    // rating_avg es noDecimal (entero 0-5) segun el schema.
    avg = Math.round(sum / count);
  }

  const product = app.findRecordById("products", productId);
  product.set("rating_count", count);
  product.set("rating_avg", avg);
  app.save(product);
}

try {
  onRecordAfterCreateSuccess((e) => {
    const productId = e.record.get("product");
    recomputeProductRating(e.app, productId);
  }, "reviews");

  onRecordAfterUpdateSuccess((e) => {
    const productId = e.record.get("product");
    recomputeProductRating(e.app, productId);
  }, "reviews");

  onRecordAfterDeleteSuccess((e) => {
    const productId = e.record.get("product");
    recomputeProductRating(e.app, productId);
  }, "reviews");

  console.log("[reviews-hook] onRecordAfter*Success registrados en reviews");
} catch (err) {
  // Si la API del hook cambia entre versiones de PB, no rompemos el arranque.
  console.error("[reviews-hook] failed to register:", err && err.message ? err.message : err);
}