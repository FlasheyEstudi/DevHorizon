/// <reference path="../pb_data/types.d.ts" />

// =============================================================================
// 1700000014_add_created_updated_fields.js
// =============================================================================
// Agrega campos `created_at` y `updated_at` (autodate) a las 7 colecciones del
// proyecto. Los system fields `created` y `updated` que PB mantiene
// implicitamente funcionan para filtros pero su sort validator los rechaza
// en PB 0.27 ("invalid sort field \"created\""). Estos campos explicitos son
// sortables, indexables y comparables con rangos.
//
// POR QUE `autodate` y no `date`:
//   PocketBase tiene un tipo de campo `autodate` que se mantiene solo:
//     - onCreate: si true, setea `now()` automaticamente al crear
//     - onUpdate: si true, setea `now()` automaticamente al editar
//   Usamos:
//     - created_at: onCreate=true, onUpdate=false  (se preserva en updates)
//     - updated_at: onCreate=true, onUpdate=true   (se refresca en cada cambio)
//   NO necesitamos un hook manual para mantenerlos — PB lo hace solo.
//   (El hook `pb/pb_hooks/on-record-date-stamps.js` que existia antes fue
//   eliminado porque autodate es la primitiva oficial.)
//
// Por que no usar los nombres `created`/`updated`:
//   PocketBase reserva esos nombres para system fields. Agregar campos
//   custom con esos nombres colisiona. Usamos `created_at`/`updated_at`
//   como convencion.
//
// Backfill: copiamos `created` -> `created_at` y `updated` -> `updated_at`
// para todos los registros existentes. Los registros nuevos los maneja
// autodate solo.
//
// Down: remueve los campos de cada coleccion.
// =============================================================================

const COLLECTIONS = [
  "users",
  "categories",
  "stores",
  "products",
  "orders",
  "cart_items",
  "reviews",
];

migrate(
  (app) => {
    for (const name of COLLECTIONS) {
      const collection = app.findCollectionByNameOrId(name);

      // Add created_at si no existe (idempotente).
      //
      // IMPORTANTE: en PB 0.27, `onCreate` y `onUpdate` van a NIVEL DEL FIELD,
      // NO dentro de `options`. PB los busca por los JSON tags del struct
      // AutodateField en Go (`json:"onCreate"` / `json:"onUpdate"`), que son
      // propiedades de primer nivel. Anidarlos en `options` hace que se
      // pierdan silenciosamente y la validacion de PB falle con
      // "either onCreate or onUpdate must be enabled".
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

      // Add updated_at si no existe.
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

      // Backfill desde los system fields `created` y `updated` para los
      // registros existentes (autodate solo dispara en create/update, asi
      // que los registros pre-existentes quedan en NULL sin esto).
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
    }
  },
  (app) => {
    for (const name of COLLECTIONS) {
      const collection = app.findCollectionByNameOrId(name);
      try {
        collection.fields.removeByName("created_at");
      } catch (_) {}
      try {
        collection.fields.removeByName("updated_at");
      } catch (_) {}
      app.save(collection);
    }
  }
);