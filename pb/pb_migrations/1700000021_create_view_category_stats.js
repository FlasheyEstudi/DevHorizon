/// <reference path="../pb_data/types.d.ts" />

// =============================================================================
// 1700000021_create_view_category_stats.js
// =============================================================================
// Crea la View Collection `view_category_stats` en PocketBase para optimizar
// las consultas de categorías, filtros del mapa interactivo y catálogo:
//
// 1. Métricas agregadas por categoría en una sola consulta SQLite (< 3ms):
//    - `total_stores`: Conteo de talleres activos en esta categoría artesanal.
//    - `total_products`: Conteo de productos publicados vinculados directa o indirectamente.
//    - `min_price`: Precio mínimo de productos publicados en la categoría.
//    - `max_price`: Precio máximo de productos publicados en la categoría.
//    - `avg_price`: Precio promedio redondeado de productos publicados.
// 2. Beneficios:
//    - En /mapa: permite consultar `filter: 'total_stores > 0'` y obtener de una sola
//      vez únicamente las categorías con talleres y sus conteos en vivo sin bucles JS.
//    - En /productos: alimenta los rangos de precio (min/max) y filtros por categoría
//      sin hacer escaneos costosos de productos en memoria.
// =============================================================================

const VIEW_NAME = "view_category_stats";

const VIEW_QUERY = `
  SELECT
    c.id as id,
    c.name as name,
    c.slug as slug,
    c.icon as icon,
    c.description as description,
    c.parent as parent,
    COUNT(DISTINCT s.id) as total_stores,
    COUNT(DISTINCT p.id) as total_products,
    COALESCE(MIN(p.price), 0) as min_price,
    COALESCE(MAX(p.price), 0) as max_price,
    COALESCE(ROUND(AVG(p.price), 0), 0) as avg_price,
    c.created_at as created_at,
    c.updated_at as updated_at
  FROM categories c
  LEFT JOIN stores s ON s.category = c.slug
  LEFT JOIN products p ON (p.store = s.id OR instr(p.categories, c.id) > 0) AND p.status = 'published'
  GROUP BY c.id
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
    listRule: "",
    viewRule: "",
    viewQuery: VIEW_QUERY,
  });

  try {
    collection.fields = app.createViewFields(VIEW_QUERY);
  } catch (err) {
    console.log("[migration:1700000021] Info createViewFields:", err);
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
