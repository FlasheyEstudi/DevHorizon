// =============================================================================
// 1700000010_finalize_store_geo.js
// =============================================================================
// Final schema fix after partial applications of 1700000008 and 1700000009.
//
// State before this migration:
//   - `location` is TEXT (legacy from pre-geo feature)
//   - `address_text` exists (TEXT)
//   - `department` exists (select 17 values)
//   - Data copy from `location` -> `address_text` was done MANUALLY via a
//     one-shot node script BEFORE this migration. So we can safely drop
//     the TEXT `location` field with no data loss.
//
// State after this migration:
//   - `location` is geoPoint (optional)
//   - `address_text` is TEXT
//   - `department` is select 17 values
// =============================================================================

migrate(
  (app) => {
    const stores = app.findCollectionByNameOrId('stores');
    const locField = stores.fields.getByName('location');

    if (locField) {
      const locType =
        typeof locField.getType === 'function' ? locField.getType() : locField.type;
      if (locType !== 'geoPoint') {
        stores.fields.removeByName('location');
        app.save(stores);
      }
    }

    // Re-fetch (field references go stale after save).
    const after = app.findCollectionByNameOrId('stores');

    if (!after.fields.getByName('location')) {
      after.fields.add(
        new Field({
          name: 'location',
          type: 'geoPoint',
          required: false,
        }),
      );
      app.save(after);
    }
  },
  (app) => {
    // Down: drop geoPoint location, restore TEXT location.
    const stores = app.findCollectionByNameOrId('stores');
    try {
      stores.fields.removeByName('location');
    } catch (_) {}
    if (!stores.fields.getByName('location')) {
      stores.fields.add(
        new Field({
          name: 'location',
          type: 'text',
          required: false,
        }),
      );
    }
    app.save(stores);
  },
);