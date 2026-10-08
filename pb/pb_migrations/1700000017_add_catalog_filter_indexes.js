/// <reference path="../pb_data/types.d.ts" />

// =============================================================================
// 1700000017_add_catalog_filter_indexes.js
// =============================================================================
// Agrega índices de base de datos en SQLite para optimizar las consultas
// de filtrado avanzado en el catálogo de productos:
//   1. `products (status, price)`: acelera el filtrado por estado y rango de precios.
//   2. `products (store)`: acelera el join / relación con tiendas.
//   3. `stores (department)`: acelera el filtrado de tiendas y productos por departamento.
// =============================================================================

migrate((app) => {
  // 1. Índices para products
  const products = app.findCollectionByNameOrId("products");
  const prodIndexes = products.indexes || [];

  const newProdIndexes = [
    "CREATE INDEX idx_products_status_price ON products (status, price)",
    "CREATE INDEX idx_products_store ON products (store)",
  ];

  for (const idx of newProdIndexes) {
    const idxName = idx.split(" ")[2];
    if (!prodIndexes.some((existing) => existing.includes(idxName))) {
      prodIndexes.push(idx);
    }
  }
  products.indexes = prodIndexes;
  app.save(products);

  // 2. Índices para stores
  const stores = app.findCollectionByNameOrId("stores");
  const storeIndexes = stores.indexes || [];
  const deptIndex = "CREATE INDEX idx_stores_department ON stores (department)";

  if (!storeIndexes.some((existing) => existing.includes("idx_stores_department"))) {
    storeIndexes.push(deptIndex);
  }
  stores.indexes = storeIndexes;
  app.save(stores);
}, (app) => {
  // Revertir índices de products
  try {
    const products = app.findCollectionByNameOrId("products");
    products.indexes = (products.indexes || []).filter(
      (sql) =>
        !sql.includes("idx_products_status_price") &&
        !sql.includes("idx_products_store")
    );
    app.save(products);
  } catch (_) {}

  // Revertir índices de stores
  try {
    const stores = app.findCollectionByNameOrId("stores");
    stores.indexes = (stores.indexes || []).filter(
      (sql) => !sql.includes("idx_stores_department")
    );
    app.save(stores);
  } catch (_) {}
});
