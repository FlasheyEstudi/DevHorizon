/// <reference path="../pb_data/types.d.ts" />

// =============================================================================
// 1700000023_add_news_date_fields.js
// =============================================================================
// Agrega los campos `created_at` y `updated_at` (autodate) a la coleccion
// `news`, que quedo sin ellos: la migracion 1700000014 los agrego a las otras
// siete colecciones, pero `news` se creo despues (1700000016) y no los incluyo.
//
// POR QUE HACEN FALTA:
//   PocketBase 0.27 no acepta los system fields `created`/`updated` como
//   criterio de orden ("invalid sort field"), asi que sin estos campos la
//   coleccion no tiene ninguna fecha sortable ni indexable. La pagina de
//   noticias ordenaba por `-created` y la consulta devolvia 400 (H-24 del
//   reporte), y el detalle formateaba `news.created`, que no existe (H-28).
//
// Mismo patron que 1700000014: `onCreate`/`onUpdate` van a nivel del field
// (no dentro de `options`) y se hace backfill de los registros existentes,
// porque autodate solo dispara en create/update. Ojo: en este proyecto las
// colecciones se crean con `new Collection({...})` y quedan solo con el system
// field `id`, asi que `created`/`updated` no existen como columnas: los
// registros previos se sellan con la fecha actual.
//
// Down: remueve los campos.
// =============================================================================

migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId("news");

    if (!collection.fields.getByName("created_at")) {
      collection.fields.add(
        new Field({
          name: "created_at",
          type: "autodate",
          required: false,
          onCreate: true,
          onUpdate: false,
        })
      );
    }

    if (!collection.fields.getByName("updated_at")) {
      collection.fields.add(
        new Field({
          name: "updated_at",
          type: "autodate",
          required: false,
          onCreate: true,
          onUpdate: true,
        })
      );
    }

    app.save(collection);

    // 1. Copia desde los system fields, si la instancia los tiene.
    try {
      const records = app.findRecordsByCollection(collection);
      for (const record of records) {
        const created = record.get("created");
        const updated = record.get("updated");
        let changed = false;
        if (created && !record.get("created_at")) {
          record.set("created_at", created);
          changed = true;
        }
        if (updated && !record.get("updated_at")) {
          record.set("updated_at", updated);
          changed = true;
        }
        if (changed) {
          app.save(record);
        }
      }
    } catch (_) {
      // Coleccion vacia -> nothing to backfill.
    }

    // 2. Los registros que queden sin fecha se sellan con la fecha actual
    //    (formato de PocketBase: "YYYY-MM-DD HH:MM:SS.sssZ").
    const stamp = new Date().toISOString().replace("T", " ");
    try {
      app
        .db()
        .newQuery(
          "UPDATE news SET created_at = {:stamp}, updated_at = {:stamp}" +
            " WHERE created_at IS NULL OR created_at = ''"
        )
        .bind({ stamp })
        .execute();
    } catch (_) {
      // Sin registros pendientes.
    }
  },
  (app) => {
    const collection = app.findCollectionByNameOrId("news");
    try {
      collection.fields.removeByName("created_at");
    } catch (_) {}
    try {
      collection.fields.removeByName("updated_at");
    } catch (_) {}
    app.save(collection);
  }
);
