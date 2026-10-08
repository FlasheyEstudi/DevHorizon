// =============================================================================
// pb/seeds/index.js
// =============================================================================
// Seeds every ArtesaNica PocketBase collection from JSON files in
// `pb/seeds/collections/`. Replaces/supersedes the old
// `pb/seed_geo_stores.js` (stores only).
//
// USAGE:
//   1. Start PocketBase server:    ./pocketbase.exe serve
//   2. Run seed (any of these forms):
//        node pb/seeds/index.js
//        $env:POCKETBASE_ADMIN_PASSWORD='xxx'; node pb/seeds/index.js
//
// REQUIRES (env or default):
//   - POCKETBASE_URL          (default: http://127.0.0.1:8090)
//   - POCKETBASE_ADMIN_EMAIL  (default: admin@artesa-nica.local)
//   - POCKETBASE_ADMIN_PASSWORD (REQUIRED — no default for safety)
//
// IDEMPOTENT: each record is skipped if its unique identifier (slug or
// email, or (user, product) for cart/review) already exists in the DB.
// SAFE TO RE-RUN.
//
// POST-PROCESSING: after reviews are seeded, recomputes products.rating_avg
// and products.rating_count so the marketplace UI shows correct values.
// =============================================================================

import PocketBase from 'pocketbase';
import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnvFile, resolveRefs } from './seed.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const COLLECTIONS_DIR = join(__dirname, 'collections');

// Auto-load .env if PB admin password isn't already set.
if (!process.env.POCKETBASE_ADMIN_PASSWORD) {
  const found = loadEnvFile(process.cwd()) || loadEnvFile(__dirname);
  if (found) {
    Object.assign(process.env, found.vars);
    console.log(`[env] Loaded ${Object.keys(found.vars).length} vars from ${found.source}`);
  }
}

const PB_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';
const ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL || 'admin@artesa-nica.local';
const ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD;

if (!ADMIN_PASSWORD) {
  console.error('POCKETBASE_ADMIN_PASSWORD no esta definida. Set en .env o como env var.');
  console.error('Ejemplo: POCKETBASE_ADMIN_PASSWORD=tu_password node pb/seeds/index.js');
  process.exit(1);
}

// Create order matches dependency order (parents before children).
// Each entry is the file name without the .json suffix.
const COLLECTION_ORDER = [
  'users',
  'categories',
  'stores',
  'products',
  'cart_items',
  'orders',
  'reviews',
  'news',
];

// -----------------------------------------------------------------------------
// Per-collection helpers
// -----------------------------------------------------------------------------

async function findExistingByUniqueId(pb, collName, record) {
  // Each collection has a different "natural" idempotency key. Use it.
  switch (collName) {
    case 'users':
      return pb.collection(collName).getList(1, 1, { filter: `email = "${record.email}"` });
    case 'stores':
    case 'categories':
    case 'products':
    case 'news':
      return pb.collection(collName).getList(1, 1, { filter: `slug = "${record.slug}"` });
    case 'cart_items':
    case 'reviews': {
      const userId = record._resolvedUserId;
      const productId = record._resolvedProductId;
      if (!userId || !productId) return { items: [], totalItems: 0 };
      return pb.collection(collName).getList(1, 1, {
        filter: `user = "${userId}" && product = "${productId}"`,
      });
    }
    case 'orders':
      // Orders have no natural dedupe key — caller's responsibility.
      // Use _key as a marker; if _key is present in notes we dedupe by it.
      if (record._key) {
        return pb.collection(collName).getList(1, 1, {
          filter: `notes ~ "${record._key}"`,
        });
      }
      return { items: [], totalItems: 0 };
    default:
      return { items: [], totalItems: 0 };
  }
}

async function createCollection(pb, collName, records, keyToRecord) {
  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const record of records) {
    const { _key, ...data } = record;

    // Pre-resolve IDs for cart_items and reviews so we can check idempotency.
    const probeData = { ...data };
    if (collName === 'cart_items' || collName === 'reviews') {
      const userRec = data._userRef ? keyToRecord.get(`users:${data._userRef}`) : null;
      const productRec = data._productRef ? keyToRecord.get(`products:${data._productRef}`) : null;
      if (userRec) probeData._resolvedUserId = userRec.id;
      if (productRec) probeData._resolvedProductId = productRec.id;
    }

    try {
      const existing = await findExistingByUniqueId(pb, collName, probeData);
      if (existing.items.length > 0) {
        const existing0 = existing.items[0];
        // Cache the existing record so downstream collections can still ref it.
        if (_key) {
          keyToRecord.set(`${collName}:${_key}`, {
            id: existing0.id,
            name: existing0.name || existing0.slug || _key,
            price: existing0.price,
          });
        }
        console.log(`SKIP  ${collName}:${_key} (ya existe)`);
        skipped++;
        continue;
      }

      // Resolve all `_XRef` / `_XRefs` keys against the map.
      const resolved = resolveRefs(data, keyToRecord);

      // Reviews: snapshot the reviewer's display name (user_name_snapshot)
      // because the users collection has a restricted viewRule that can
      // block `expand=user` from the public /api/reviews endpoint.
      if (collName === 'reviews') {
        const userRec = keyToRecord.get(`users:${data._userRef}`);
        if (userRec) resolved.user_name_snapshot = userRec.name;
      }

      // Orders: derive `total` from the items snapshot when not specified,
      // so seed JSON stays clean. (Caller can override `total` to model
      // shipping / discounts.)
      if (collName === 'orders' && Array.isArray(resolved.items) && resolved.total == null) {
        resolved.total = resolved.items.reduce(
          (sum, item) => sum + (item.price || 0) * (item.quantity || 0),
          0
        );
      }

      const created0 = await pb.collection(collName).create(resolved);
      if (_key) {
        keyToRecord.set(`${collName}:${_key}`, {
          id: created0.id,
          name: created0.name || created0.slug || _key,
          price: created0.price,
        });
      }
      console.log(`CREATE ${collName}:${_key} -> ${created0.id}`);
      created++;
    } catch (err) {
      console.error(`FAIL  ${collName}:${_key}: ${err.message}`);
      failed++;
    }
  }

  return { created, skipped, failed };
}

// -----------------------------------------------------------------------------
// Post-processing: recompute products.rating_avg / rating_count from reviews.
// -----------------------------------------------------------------------------

async function recomputeProductRatings(pb) {
  const products = await pb.collection('products').getFullList();
  let updated = 0;
  for (const product of products) {
    const reviews = await pb.collection('reviews').getFullList({
      filter: `product = "${product.id}"`,
      fields: 'rating',
    });
    if (reviews.length === 0) continue;
    const sum = reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
    const avg = Math.round(sum / reviews.length);
    await pb.collection('products').update(product.id, {
      rating_avg: avg,
      rating_count: reviews.length,
    });
    updated++;
  }
  return updated;
}

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------

async function main() {
  const pb = new PocketBase(PB_URL);
  console.log(`Conectando a ${PB_URL}...`);

  try {
    await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log('Autenticado como admin OK.');
  } catch (err) {
    console.error('Error de autenticacion:', err.message);
    console.error('Verifica POCKETBASE_ADMIN_EMAIL y POCKETBASE_ADMIN_PASSWORD.');
    process.exit(1);
  }

  if (!existsSync(COLLECTIONS_DIR)) {
    console.error(`No se encontro el directorio: ${COLLECTIONS_DIR}`);
    process.exit(1);
  }

  // Verify all expected JSON files are present.
  const presentFiles = new Set(await readdir(COLLECTIONS_DIR));
  const missing = COLLECTION_ORDER
    .map((c) => `${c}.json`)
    .filter((f) => !presentFiles.has(f));
  if (missing.length > 0) {
    console.error(`Faltan archivos de seed: ${missing.join(', ')}`);
    process.exit(1);
  }

  const keyToRecord = new Map();
  const totals = { created: 0, skipped: 0, failed: 0 };

  for (const collName of COLLECTION_ORDER) {
    const filePath = join(COLLECTIONS_DIR, `${collName}.json`);
    const records = JSON.parse(await readFile(filePath, 'utf8'));
    console.log(`\n=== ${collName} (${records.length} registros) ===`);
    const stats = await createCollection(pb, collName, records, keyToRecord);
    totals.created += stats.created;
    totals.skipped += stats.skipped;
    totals.failed += stats.failed;
  }

  console.log('\n=== Recalculando rating_avg / rating_count de productos ===');
  const updatedProducts = await recomputeProductRatings(pb);
  console.log(`Productos actualizados: ${updatedProducts}`);

  console.log('');
  console.log('========================================');
  console.log(`Resumen: ${totals.created} creados, ${totals.skipped} saltados, ${totals.failed} fallidos.`);
  console.log('========================================');
  if (totals.created > 0 || totals.skipped > 0) {
    console.log('');
    console.log('Credenciales de los usuarios de demo (documentadas en README.md):');
    console.log('  admin   admin@artesa-nica.local    / Admin1234!');
    console.log('  sellers <store-slug>@artesa-nica.local / Seller1234!');
    console.log('  buyers  <name>@artesa-nica.local  / Buyer1234!');
  }
}

main().catch((err) => {
  console.error('Error fatal:', err);
  process.exit(1);
});
