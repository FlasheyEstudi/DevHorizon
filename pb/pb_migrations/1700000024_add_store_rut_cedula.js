/// <reference path="../pb_data/types.d.ts" />

// =============================================================================
// 1700000024_add_store_rut_cedula.js
// =============================================================================
// Agrega los campos fiscales y de identificación `cedula` y `rut`
// a la colección `stores`.
// =============================================================================

migrate(
  (app) => {
    const stores = app.findCollectionByNameOrId("stores");

    if (!stores.fields.getByName("cedula")) {
      stores.fields.add(
        new Field({
          name: "cedula",
          type: "text",
          required: false,
        })
      );
    }

    if (!stores.fields.getByName("rut")) {
      stores.fields.add(
        new Field({
          name: "rut",
          type: "text",
          required: false,
        })
      );
    }

    app.save(stores);
  },
  (app) => {
    const stores = app.findCollectionByNameOrId("stores");

    if (stores.fields.getByName("cedula")) {
      stores.fields.removeByName("cedula");
    }

    if (stores.fields.getByName("rut")) {
      stores.fields.removeByName("rut");
    }

    app.save(stores);
  }
);
