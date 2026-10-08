/// <reference path="../pb_data/types.d.ts" />

// =============================================================================
// 1700000020_create_view_stores_directory.js
// =============================================================================
// Crea la View Collection `view_stores_directory` en PocketBase para optimizar
// las consultas de directorio y mapa artesanal:
//
// 1. Consolida datos de `stores` con sus métricas agregadas en SQLite:
//    - `total_products`: Conteo de productos publicados (status = 'published').
//    - `rating_avg`: Calificación promedio real (1.0 - 5.0) o 0.0 si no tiene reseñas.
//    - `total_reviews`: Total de reseñas reales de clientes.
// 2. Elimina el problema N+1 de tener que consultar reseñas y productos por separado
//    o mostrar mocks fijos ("4.9 (84)") en MapSidebar y MapBottomSheet.
// 3. Consulta de solo lectura nativa ejecutada en < 5ms.
// =============================================================================

const VIEW_NAME = "view_stores_directory";

const VIEW_QUERY = `
  SELECT 
    s.id as id,
    s.name as name,
    s.slug as slug,
    s.description as description,
    s.category as category,
    s.department as department,
    s.address_text as address_text,
    s.location as location,
    s.logo as logo,
    s.owner as owner,
    s.is_demonstrative as is_demonstrative,
    s.schedule as schedule,
    s.schedule_text as schedule_text,
    COUNT(DISTINCT p.id) as total_products,
    COALESCE(ROUND(AVG(r.rating), 1), 0.0) as rating_avg,
    COUNT(DISTINCT r.id) as total_reviews,
    s.created_at as created_at,
    s.updated_at as updated_at
  FROM stores s
  LEFT JOIN products p ON p.store = s.id AND p.status = 'published'
  LEFT JOIN reviews r ON r.product = p.id
  GROUP BY s.id
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
    console.log("[migration:1700000020] Info createViewFields:", err);
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
