/// <reference path="../pb_data/types.d.ts" />

// =============================================================================
// 1700000008_add_store_geo.js
// =============================================================================
// Adds geographic awareness to the `stores` collection for the
// geopoint-marketplace-features change.
//
// Schema delta:
//   1. Renames existing TEXT `location` -> `address_text` (idempotent).
//      Safe even if the field was already renamed in a prior run; data
//      is preserved in the renamed column.
//   2. Adds geoPoint `location` (optional). PocketBase stores geoPoint
//      fields as `{lon, lat}` JS objects (not JSON strings).
//   3. Adds `department` select with the 17 locked Nicaraguan divisions
//      (15 departments + 2 autonomous regions). Required, maxSelect: 1.
//      The list is locked by the proposal/spec; do not edit here without
//      re-running the full SDD cycle.
//
// Idempotent: safe to re-run. Each step guards against prior application
// using try/catch on the legacy rename + existence checks on new fields.
//
// Down: mirror up (remove new fields, rename address_text back to location).
// =============================================================================

const DEPARTMENT_VALUES = [
  'Boaco',
  'Carazo',
  'Chinandega',
  'Chontales',
  'Estelí',
  'Granada',
  'Jinotega',
  'León',
  'Madriz',
  'Managua',
  'Masaya',
  'Matagalpa',
  'Nueva Segovia',
  'Río San Juan',
  'RAAN',
  'RAAS',
  'Rivas',
];

migrate(
  (app) => {
    const stores = app.findCollectionByNameOrId('stores');

    // 1. Rename existing TEXT `location` -> `address_text`.
    //    The try/catch covers two idempotency scenarios:
    //      a) Migration already ran: `location` no longer exists, the catch
    //         branch fires and we move on. `address_text` is already present.
    //      b) Fresh DB: `location` exists as text. We rename it.
    //    We additionally check the field type to avoid renaming the new
    //    geoPoint `location` if a partial earlier run left things inconsistent.
    try {
      const existing = stores.fields.get('location');
      if (existing && existing.type !== 'geoPoint') {
        existing.setName('address_text');
      }
    } catch (_) {
      // Field `location` does not exist (already renamed or never present).
    }

    // 2. Add geoPoint `location` if not already present.
    if (!stores.fields.getByName('location')) {
      stores.fields.add(
        new Field({
          name: 'location',
          type: 'geoPoint',
          required: false,
        })
      );
    }

    // 3. Add `department` select if not already present.
    if (!stores.fields.getByName('department')) {
      stores.fields.add(
        new Field({
          name: 'department',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: DEPARTMENT_VALUES,
        })
      );
    }

    app.save(stores);
  },
  (app) => {
    // Down: remove new fields, rename address_text back to location.
    // Text data preserved in address_text — rollback restores the previous
    // TEXT field name (no data loss in either direction).
    const stores = app.findCollectionByNameOrId('stores');
    try {
      stores.fields.removeByName('department');
    } catch (_) {}
    try {
      stores.fields.removeByName('location');
    } catch (_) {}
    try {
      const textField = stores.fields.get('address_text');
      if (textField && textField.type === 'text') {
        textField.setName('location');
      }
    } catch (_) {}
    app.save(stores);
  }
);