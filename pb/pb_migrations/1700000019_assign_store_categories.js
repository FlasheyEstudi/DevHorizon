/// <reference path="../pb_data/types.d.ts" />

// =============================================================================
// 1700000019_assign_store_categories.js
// =============================================================================
// Asigna las categorías artesanales auténticas a los talleres de muestra
// (reemplazando el valor por defecto 'otro' por su oficio real:
//  cerámica, textil, madera, cuero, joyería, cestería).
//
// Idempotente y seguro.
// =============================================================================

const STORE_CATEGORY_MAPPINGS = [
  { slug: 'taller-maria-niquinohomo', category: 'ceramica' },
  { slug: 'casa-bordados-granada', category: 'textil' },
  { slug: 'madera-viva-leon', category: 'madera' },
  { slug: 'cesteria-madre-tierra', category: 'cesteria' },
  { slug: 'joyeria-volcanica', category: 'joyeria' },
  { slug: 'textiles-azules-esteli', category: 'textil' },
  { slug: 'cuero-herencia-boaco', category: 'cuero' },
  { slug: 'ceramica-jinotega', category: 'ceramica' },
  { slug: 'barro-rojo-tipitapa', category: 'ceramica' },
  { slug: 'tallas-carazo', category: 'madera' },
  { slug: 'fibras-rivas', category: 'cesteria' },
  { slug: 'madera-san-carlos', category: 'madera' },
  { slug: 'arte-rama', category: 'madera' },
  { slug: 'hilados-silvestre', category: 'textil' },
  { slug: 'orfebreria-colonial', category: 'joyeria' },
];

migrate(
  (app) => {
    try {
      for (const item of STORE_CATEGORY_MAPPINGS) {
        app.db()
          .newQuery(
            "UPDATE stores SET category = {:category} WHERE slug = {:slug} AND (category IS NULL OR category = '' OR category = 'otro')"
          )
          .bind({ category: item.category, slug: item.slug })
          .execute();
      }
    } catch (err) {
      console.log("[migration:1700000019] Error asignando categorías:", err);
    }
  },
  (app) => {
    try {
      for (const item of STORE_CATEGORY_MAPPINGS) {
        app.db()
          .newQuery(
            "UPDATE stores SET category = 'otro' WHERE slug = {:slug} AND category = {:category}"
          )
          .bind({ slug: item.slug, category: item.category })
          .execute();
      }
    } catch (_) {}
  }
);
