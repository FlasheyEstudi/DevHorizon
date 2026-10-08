/// <reference path="../pb_data/types.d.ts" />

// =============================================================================
// 1700000011_fix_products_listrule.js
// =============================================================================
// Cierra la fuga de productos en `draft` y `archived` por la API publica.
//
// Antes: listRule="" y viewRule="" -> cualquier visitante (incluso
//        anonimo) veia TODO el catalogo, incluyendo drafts.
// Ahora: solo `published` para visitantes.
//        Sellers ven sus propios drafts/archived.
//        Admin ve todo.
//
// Tambien ajusta `viewRule` para que un GET directo de un id no
// esquive la proteccion del list.
// =============================================================================

migrate((app) => {
  const products = app.findCollectionByNameOrId("products");

  products.listRule =
    "status = 'published' || " +
    "@request.auth.role = 'admin' || " +
    "(@request.auth.role = 'seller' && store.owner = @request.auth.id)";

  products.viewRule = products.listRule;

  app.save(products);
}, (app) => {
  const products = app.findCollectionByNameOrId("products");

  products.listRule = "";
  products.viewRule = "";

  app.save(products);
});