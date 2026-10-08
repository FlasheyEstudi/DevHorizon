/// <reference path="../pb_data/types.d.ts" />

// =============================================================================
// catalog-api.pb.js
// =============================================================================
// Hook y endpoint especializado para el catálogo de productos:
//   GET /api/catalog/meta
//
// Retorna metadatos optimizados para filtros de catálogo:
//   - Conteo de productos publicados por departamento (utilizando índices SQL).
//   - Rango real de precios (minPrice, maxPrice) de productos en venta.
// =============================================================================

console.log("[catalog-hook] module loaded; registering /api/catalog/meta");

try {
  routerAdd("GET", "/api/catalog/meta", (e) => {
    try {
      // 1. Conteo por departamento (join indexado con stores).
      // En PocketBase JSVM, db.all() requiere un DynamicModel tipado con arrayOf().
      const deptRows = arrayOf(new DynamicModel({
        department: "",
        total: 0,
      }));

      $app.db()
        .newQuery(
          "SELECT s.department as department, COUNT(p.id) as total " +
          "FROM products p " +
          "INNER JOIN stores s ON p.store = s.id " +
          "WHERE p.status = 'published' " +
          "GROUP BY s.department"
        )
        .all(deptRows);

      // Formatear a diccionario { [department]: count }
      const byDepartment = {};
      for (const row of deptRows) {
        if (row.department) {
          byDepartment[row.department] = Number(row.total || 0);
        }
      }

      // 2. Rango de precios global de productos publicados
      const statsRow = new DynamicModel({
        minPrice: 0,
        maxPrice: 0,
        totalProducts: 0,
      });

      try {
        $app.db()
          .newQuery(
            "SELECT COALESCE(MIN(price), 0) as minPrice, COALESCE(MAX(price), 0) as maxPrice, COUNT(id) as totalProducts " +
            "FROM products " +
            "WHERE status = 'published'"
          )
          .one(statsRow);
      } catch (_) {
        // En caso de que no haya productos publicados
      }

      return e.json(200, {
        byDepartment,
        minPrice: Number(statsRow.minPrice || 0),
        maxPrice: Number(statsRow.maxPrice || 0),
        totalProducts: Number(statsRow.totalProducts || 0),
      });
    } catch (err) {
      console.error("[catalog-hook] error computing catalog meta:", err && err.message ? err.message : err);
      return e.json(500, { error: "Failed to compute catalog metadata" });
    }
  });
} catch (err) {
  console.error("[catalog-hook] failed to register /api/catalog/meta:", err && err.message ? err.message : err);
}
