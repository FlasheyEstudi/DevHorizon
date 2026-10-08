// =============================================================================
// pb/seeds/seed.js
// =============================================================================
// Shared utilities for the ArtesaNica seed scripts.
//   - loadEnvFile: tiny .env loader (no dotenv dependency).
//   - resolveRefs: turns `_userRef` / `_storeRef` / etc. into PocketBase IDs
//                  and `_itemsRefs` into a proper `items` snapshot.
// =============================================================================

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

// -----------------------------------------------------------------------------
// .env loader — same approach used by seed_geo_stores.js so both scripts
// stay consistent. Walks up from `start` looking for a .env file.
// -----------------------------------------------------------------------------
export function loadEnvFile(start) {
  let dir = resolve(start);
  for (let i = 0; i < 6; i++) {
    const candidate = join(dir, '.env');
    if (existsSync(candidate)) {
      const text = readFileSync(candidate, 'utf8');
      const parsed = {};
      for (const rawLine of text.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;
        const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/i);
        if (!m) continue;
        let value = m[2].trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        parsed[m[1]] = value;
      }
      return { source: candidate, vars: parsed };
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

// -----------------------------------------------------------------------------
// Reference map for `_XRef` -> PB field name + target collection.
//
// Convention in seed JSON files:
//   "_userRef":     "maria"     ->  user:        <users:maria>.id
//   "_ownerRef":    "maria"     ->  owner:       <users:maria>.id
//   "_storeRef":    "taller-…"  ->  store:       <stores:taller-…>.id
//   "_productRef":  "olla-…"    ->  product:     <products:olla-…>.id
//   "_parentRef":   "ceramica"  ->  parent:      <categories:ceramica>.id
//   "_categoryRefs": ["ceramica","barro"]
//                                ->  categories:  [ … ids … ]
//   "_itemsRefs":   [{ "_productRef": "olla-…", "quantity": 2 }, ...]
//                                ->  items: [ {productId, name, price, quantity} ]
// -----------------------------------------------------------------------------
const SINGLE_REFS = {
  user: 'users',
  owner: 'users',
  store: 'stores',
  product: 'products',
  parent: 'categories',
};

/**
 * Resolve all `_XRef` / `_XRefs` keys in `data` against `keyToRecord`.
 * Mutates and returns a new object with the references replaced.
 *
 * @param {object} data         The record data (without _key).
 * @param {Map}    keyToRecord  Map of "collName:key" -> record reference {id, name, price, …}.
 * @returns {object}            Resolved data ready for pb.collection().create().
 */
export function resolveRefs(data, keyToRecord) {
  const out = { ...data };

  for (const [fieldName, collName] of Object.entries(SINGLE_REFS)) {
    const refKey = `_${fieldName}Ref`;
    if (refKey in out) {
      const key = out[refKey];
      const rec = keyToRecord.get(`${collName}:${key}`);
      if (!rec) throw new Error(`Missing ref ${refKey}="${key}" (collection ${collName})`);
      out[fieldName] = rec.id;
      delete out[refKey];
    }
  }

  if ('_categoryRefs' in out) {
    out.categories = out._categoryRefs.map((key) => {
      const rec = keyToRecord.get(`categories:${key}`);
      if (!rec) throw new Error(`Missing ref _categoryRefs[]="${key}"`);
      return rec.id;
    });
    delete out._categoryRefs;
  }

  // Orders: items is a JSON snapshot, not a relation. Each item must
  // embed the product id, name and unit price at the moment of purchase.
  if ('_itemsRefs' in out) {
    out.items = out._itemsRefs.map(({ _productRef, quantity }) => {
      const product = keyToRecord.get(`products:${_productRef}`);
      if (!product) throw new Error(`Missing ref _itemsRefs[]._productRef="${_productRef}"`);
      return {
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity,
      };
    });
    delete out._itemsRefs;
  }

  return out;
}
