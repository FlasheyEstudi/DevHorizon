/// <reference path="../pb_data/types.d.ts" />

// =============================================================================
// 1700000012_reviews_unique_user_product.js
// =============================================================================
// Agrega un indice UNIQUE sobre (user, product) en `reviews` para evitar
// que un mismo usuario deje multiples resenas del mismo producto.
//
// Antes: una persona podia dejar 5 estrellas, luego 1 estrella, y asi
//        inflar/castigar el rating. Ademas el rating_avg no tenia sentido
//        ponderado por usuario.
//
// Ahora: 1 resena por usuario por producto. Si intenta duplicar, la API
//        recibe un error de constraint y devuelve 400 con mensaje claro.
//
// NOTA DE MIGRACION: si ya existen duplicados en la DB, esta migracion
// falla al aplicar. Antes de correr, deduplicar:
//   DELETE FROM reviews WHERE id NOT IN (
//     SELECT MIN(id) FROM reviews GROUP BY user, product
//   );
// =============================================================================

migrate((app) => {
  const collection = app.findCollectionByNameOrId("reviews");
  collection.indexes = [
    ...(collection.indexes || []),
    "CREATE UNIQUE INDEX idx_reviews_user_product ON reviews (user, product)",
  ];
  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("reviews");
  // Remover el indice UNIQUE de la lista y persistir.
  collection.indexes = (collection.indexes || []).filter(
    (sql) => !sql.includes("idx_reviews_user_product")
  );
  app.save(collection);
});