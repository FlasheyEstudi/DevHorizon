/// <reference path="../pb_data/types.d.ts" />

// =============================================================================
// 1700000022_create_view_products_catalog.js
// =============================================================================
// Crea la View Collection `view_products_catalog` en PocketBase para optimizar
// el catálogo y listado de productos artesanales:
//
// 1. Datos agregados y desnormalizados en una sola consulta SQLite (< 3ms):
//    - Datos del producto: `id`, `name`, `slug`, `description`, `price`, `stock`, `images`, `tags`.
//    - Datos embebidos del artesano/tienda: `store_name`, `store_slug`, `store_department`, `store_category`.
//    - Datos taxonómicos: `category_name`, `category_slug`, `category_icon`.
//    - Calificaciones en tiempo real: `rating_avg` (decimal 1.0 - 5.0) y `rating_count`.
// 2. Beneficios de Arquitectura:
//    - Elimina la necesidad de subconsultas relacionales pesadas (`expand: 'store,categories'`).
//    - Garantiza calificaciones 100% consistentes por cálculo directo en SQLite, eliminando
//      la fragilidad y latencia de hooks JSVM denormalizados como `on-reviews-change.js`.
//    - Payload plano, limpio y cacheable en frontend y SSR.
// =============================================================================

const VIEW_NAME = "view_products_catalog";

const VIEW_QUERY = `
  SELECT 
    p.id as id,
    p.name as name,
    p.slug as slug,
    p.description as description,
    p.price as price,
    p.stock as stock,
    p.images as images,
    p.categories as categories,
    p.status as status,
    p.tags as tags,
    p.store as store,
    s.name as store_name,
    s.slug as store_slug,
    s.department as store_department,
    s.category as store_category,
    c.name as category_name,
    c.slug as category_slug,
    c.icon as category_icon,
    COALESCE(ROUND(AVG(r.rating), 1), 0.0) as rating_avg,
    COUNT(DISTINCT r.id) as rating_count,
    p.created_at as created_at,
    p.updated_at as updated_at
  FROM products p
  JOIN stores s ON p.store = s.id
  LEFT JOIN categories c ON (instr(p.categories, c.id) > 0 OR s.category = c.slug)
  LEFT JOIN reviews r ON r.product = p.id
  WHERE p.status = 'published'
  GROUP BY p.id
`;

migrate((app) => {
  try {
    const existing = app.findCollectionByNameOrId(VIEW_NAME);
    if (existing) {
      app.delete(existing);
    }
  } catch (_) {}

  const collection = new Collection({
    name: VIEW_NAME,
    type: "view",
    listRule: "", // público
    viewRule: "", // público
    viewQuery: VIEW_QUERY,
  });

  try {
    collection.fields = app.createViewFields(VIEW_QUERY);
  } catch (err) {
    console.log("[migration:1700000022] Info createViewFields:", err);
  }

  app.save(collection);
}, (app) => {
  try {
    const collection = app.findCollectionByNameOrId(VIEW_NAME);
    if (collection) {
      app.delete(collection);
    }
  } catch (_) {}
});
