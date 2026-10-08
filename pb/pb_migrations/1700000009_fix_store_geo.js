// =============================================================================
// 1700000009_fix_store_geo.js
// =============================================================================
// Fixes the partially-applied 1700000008 migration. That migration:
//   - Added `department` (works) ✓
//   - Called setName('address_text') on the existing TEXT `location` (DID
//     NOT persist in PB 0.27)
//   - The check `if (!fields.getByName('location'))` then saw the still-text
//     `location` field and skipped adding the geoPoint `location`.
//
// Result: `stores.location` is still TEXT and there is no `address_text`.
// Seed data (if any) wrote JSON-stringified geoPoints into the text field.
//
// This migration:
//   1. If `location` is TEXT: snapshots existing values to memory, drops the
//      field, re-adds it as `address_text` (preserving plain-text data).
//   2. Adds `address_text` if missing.
//   3. Adds `location` geoPoint field if missing.
// =============================================================================

migrate(
  (app) => {
    const stores = app.findCollectionByNameOrId('stores');

    // Step 1: detect and handle a leftover TEXT `location` field.
    // PB 0.27 API: use getByName() (NOT .get()), and getType() for type check.
    const existingLocation = stores.fields.getByName('location');
    const existingLocationType =
      existingLocation && typeof existingLocation.getType === 'function'
        ? existingLocation.getType()
        : existingLocation?.type;

    if (existingLocation && existingLocationType === 'text') {
      // Snapshot existing text values BEFORE dropping the field.
      const snapshot = [];
      try {
        const records = app.findRecordsByCollection(stores);
        for (const r of records) {
          const v = r.get('location');
          // Only keep clean text (not JSON-stringified geoPoints from failed seed).
          if (typeof v === 'string' && v.trim() !== '' && !v.startsWith('{')) {
            snapshot.push({ id: r.id, address: v });
          }
        }
      } catch (_) {
        // Empty collection or no records — fine.
      }

      stores.fields.removeByName('location');
      app.save(stores);

      // Field references go stale after save — re-fetch.
      const storesAfter = app.findCollectionByNameOrId('stores');

      // Add address_text if missing.
      if (!storesAfter.fields.getByName('address_text')) {
        storesAfter.fields.add(
          new Field({
            name: 'address_text',
            type: 'text',
            required: false,
          }),
        );
      }

      // Restore data from snapshot.
      if (snapshot.length > 0) {
        const refreshed = app.findCollectionByNameOrId('stores');
        for (const { id, address } of snapshot) {
          try {
            const r = app.findRecord(refreshed, id);
            r.set('address_text', address);
            app.save(r);
          } catch (_) {
            // Record might have been deleted concurrently; ignore.
          }
        }
      }
    }

    // Step 2 + 3: ensure address_text and geoPoint location both exist.
    const final = app.findCollectionByNameOrId('stores');

    if (!final.fields.getByName('address_text')) {
      final.fields.add(
        new Field({
          name: 'address_text',
          type: 'text',
          required: false,
        }),
      );
    }

    if (!final.fields.getByName('location')) {
      final.fields.add(
        new Field({
          name: 'location',
          type: 'geoPoint',
          required: false,
        }),
      );
    }

    app.save(final);
  },
  (app) => {
    // Down: drop geoPoint location, drop address_text, restore TEXT location.
    // Cannot restore address_text values without a backup snapshot.
    const stores = app.findCollectionByNameOrId('stores');
    try {
      stores.fields.removeByName('location');
    } catch (_) {}
    try {
      stores.fields.removeByName('address_text');
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