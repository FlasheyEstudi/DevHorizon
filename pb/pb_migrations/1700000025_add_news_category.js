/// <reference path="../pb_data/types.d.ts" />

// =============================================================================
// 1700000025_add_news_category.js
// =============================================================================
// Agrega el campo `category` (select) a la coleccion `news`.
//
// POR QUE HACE FALTA:
//   `NewsContent.astro` renderiza chips de filtro por categoria ("Tradición",
//   "Nuevos Productos", "Comunidad", "Eventos") y marca cada card con
//   `data-category={item.category}`, pero la coleccion `news` (1700000016)
//   nunca tuvo ese campo: el filtro operaba sobre `undefined`. Con el campo,
//   el panel /admin puede asignar categoria al publicar y el listado filtra
//   de verdad.
//
// Los valores del select coinciden EXACTAMENTE con las claves que ya usa el
// front (tradicion, nuevos_productos, comunidad, eventos) para no tener que
// mapear en la vista.
//
// Se agrega tambien un indice por `category` para el filtrado del listado.
//
// Down: remueve el campo y el indice.
// =============================================================================

const NEWS_CATEGORIES = ["tradicion", "nuevos_productos", "comunidad", "eventos"];

migrate((app) => {
  const collection = app.findCollectionByNameOrId("news");

  if (!collection.fields.getByName("category")) {
    collection.fields.add(new Field({
      name: "category",
      type: "select",
      required: false,
      maxSelect: 1,
      values: NEWS_CATEGORIES,
    }));
  }

  const indexes = collection.indexes || [];
  if (!indexes.some((sql) => sql.includes("idx_news_category"))) {
    indexes.push("CREATE INDEX idx_news_category ON news (category)");
  }
  collection.indexes = indexes;

  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("news");
  try {
    collection.fields.removeByName("category");
  } catch (_) {}
  collection.indexes = (collection.indexes || []).filter(
    (sql) => !sql.includes("idx_news_category")
  );
  app.save(collection);
});
