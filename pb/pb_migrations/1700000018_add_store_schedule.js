/// <reference path="../pb_data/types.d.ts" />

// =============================================================================
// 1700000018_add_store_schedule.js
// =============================================================================
// Agrega soporte de horarios reales y capacidades demostrativas a `stores`:
//   1. `schedule` (json): estructura diaria con horarios de apertura/cierre
//      por día de la semana ({ mon: { open: "08:00", close: "17:00", closed: false }, ... }).
//   2. `schedule_text` (text): resumen legible para visualización y SEO
//      (ej: "Lun - Sáb: 8:00 AM - 5:00 PM").
//   3. `is_demonstrative` (bool): indica si el taller ofrece demostraciones en
//      vivo de sus técnicas ancestrales (torno, telar, talla, etc.) a visitantes.
//
// Idempotente: comprueba la existencia de cada campo antes de agregarlo.
// Backfill: asigna horario estándar artesanal nicaragüense a registros existentes.
// Down: remueve los 3 campos de forma segura.
// =============================================================================

const DEFAULT_SCHEDULE = {
  mon: { open: "08:00", close: "17:00", closed: false },
  tue: { open: "08:00", close: "17:00", closed: false },
  wed: { open: "08:00", close: "17:00", closed: false },
  thu: { open: "08:00", close: "17:00", closed: false },
  fri: { open: "08:00", close: "17:00", closed: false },
  sat: { open: "08:00", close: "17:00", closed: false },
  sun: { open: "09:00", close: "13:00", closed: false },
};

const DEFAULT_SCHEDULE_TEXT = "Lun - Sáb: 8:00 AM - 5:00 PM";

migrate(
  (app) => {
    const stores = app.findCollectionByNameOrId("stores");
    let changed = false;

    // 1. Campo schedule (JSON estructurado)
    if (!stores.fields.getByName("schedule")) {
      stores.fields.add(
        new Field({
          name: "schedule",
          type: "json",
          required: false,
        })
      );
      changed = true;
    }

    // 2. Campo schedule_text (Texto amigable)
    if (!stores.fields.getByName("schedule_text")) {
      stores.fields.add(
        new Field({
          name: "schedule_text",
          type: "text",
          required: false,
        })
      );
      changed = true;
    }

    // 3. Campo is_demonstrative (Booleano: Taller Demostrativo en vivo)
    if (!stores.fields.getByName("is_demonstrative")) {
      stores.fields.add(
        new Field({
          name: "is_demonstrative",
          type: "bool",
          required: false,
        })
      );
      changed = true;
    }

    // 4. Índice de base de datos para filtrado eficiente por taller demostrativo
    const storeIndexes = stores.indexes || [];
    const demoIndex = "CREATE INDEX idx_stores_is_demonstrative ON stores (is_demonstrative)";
    if (!storeIndexes.some((existing) => existing.includes("idx_stores_is_demonstrative"))) {
      storeIndexes.push(demoIndex);
      stores.indexes = storeIndexes;
      changed = true;
    }

    if (changed) {
      app.save(stores);
    }

    // Backfill defensivo de datos para los talleres existentes
    try {
      app.db()
        .newQuery(
          "UPDATE stores SET " +
          "schedule = CASE WHEN schedule IS NULL OR schedule = '' OR schedule = 'null' THEN {:schedule} ELSE schedule END, " +
          "schedule_text = CASE WHEN schedule_text IS NULL OR schedule_text = '' THEN {:schedule_text} ELSE schedule_text END, " +
          "is_demonstrative = CASE WHEN is_demonstrative IS NULL OR is_demonstrative = 0 THEN 1 ELSE is_demonstrative END"
        )
        .bind({
          schedule: JSON.stringify(DEFAULT_SCHEDULE),
          schedule_text: DEFAULT_SCHEDULE_TEXT,
        })
        .execute();
    } catch (err) {
      console.log("[migration:1700000018] Aviso en backfill de datos:", err);
    }
  },
  (app) => {
    try {
      const stores = app.findCollectionByNameOrId("stores");
      let changed = false;

      if (stores.fields.getByName("schedule")) {
        stores.fields.removeByName("schedule");
        changed = true;
      }
      if (stores.fields.getByName("schedule_text")) {
        stores.fields.removeByName("schedule_text");
        changed = true;
      }
      if (stores.fields.getByName("is_demonstrative")) {
        stores.fields.removeByName("is_demonstrative");
        changed = true;
      }

      // Revertir índice
      if (stores.indexes && stores.indexes.length > 0) {
        const prevLen = stores.indexes.length;
        stores.indexes = stores.indexes.filter(
          (sql) => !sql.includes("idx_stores_is_demonstrative")
        );
        if (stores.indexes.length !== prevLen) {
          changed = true;
        }
      }

      if (changed) {
        app.save(stores);
      }
    } catch (_) {}
  }
);
