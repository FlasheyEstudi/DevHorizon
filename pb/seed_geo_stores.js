// =============================================================================
// seed_geo_stores.js
// =============================================================================
// Seeds the `stores` collection with sample artisans across Nicaragua for
// testing the GeoPoint marketplace features (public mapa + onboarding +
// "Cerca de mí").
//
// USAGE:
//   1. Start PocketBase server:    ./pocketbase.exe serve
//   2. Run seed (any of these forms):
//        node pb/seed_geo_stores.js
//        node --env-file=.env pb/seed_geo_stores.js   (Node 22+)
//        $env:POCKETBASE_ADMIN_PASSWORD='xxx'; node pb/seed_geo_stores.js
//
// REQUIRES (read from env or defaults to dev):
//   - POCKETBASE_URL          (default: http://127.0.0.1:8090)
//   - POCKETBASE_ADMIN_EMAIL  (default: admin@artesa-nica.local)
//   - POCKETBASE_ADMIN_PASSWORD (REQUIRED — no default for safety)
//
// The script auto-loads a `.env` file from the cwd or parent directories if
// POCKETBASE_ADMIN_PASSWORD is not already in process.env (no dotenv dep
// needed — uses Node's fs + manual parse).
//
// IDEMPOTENT: skips any store whose `slug` already exists in the DB.
// SAFE TO RE-RUN.
// =============================================================================

import PocketBase from 'pocketbase';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Walk up from `start` looking for a `.env` file. Returns parsed env vars
 * or null if not found. Manual parser — no dotenv dependency.
 */
function loadEnvFile(start) {
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
        // Strip surrounding quotes (single or double).
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
  console.error('Ejemplo: POCKETBASE_ADMIN_PASSWORD=tu_password node pb/seed_geo_stores.js');
  process.exit(1);
}

// Sample artisans across Nicaragua. Each tuple: [slug, name, dept, lon, lat, address, description]
const STORES = [
  ['taller-maria-niquinohomo', 'Taller de Maria', 'Masaya', -86.0961, 11.9744, 'Niquinohomo, Masaya', 'Cerámica tradicional de Niquinohomo desde 1987.'],
  ['casa-bordados-granada', 'Casa de Bordados Granada', 'Granada', -85.9566, 11.9297, 'Calle La Calzada, Granada', 'Bordados a mano con hilos de seda natural.'],
  ['madera-viva-leon', 'Madera Viva', 'Leon', -86.8782, 12.4379, 'Centro historico, Leon', 'Tallas en madera de guayacan y cedro.'],
  ['cesteria-madre-tierra', 'Cesteria Madre Tierra', 'Matagalpa', -85.9173, 12.9250, 'San Ramon, Matagalpa', 'Cestas y sombreros de fibra de pino y junco.'],
  ['joyeria-volcanica', 'Joyeria Volcanica', 'Managua', -86.2704, 12.1149, 'Carretera a Masaya km 12', 'Joyas en piedra volcanica y plata.'],
  ['textiles-azules-esteli', 'Textiles Azules', 'Esteli', -86.3539, 13.0928, 'Barrio El Calvario, Esteli', 'Tejidos en indigo natural con telar de madera.'],
  ['cuero-herencia-boaco', 'Cuero y Herencia', 'Boaco', -85.6589, 12.4694, 'Boaco centro', 'Mochilas, cinturones y bolsos de cuero curtido artesanal.'],
  ['ceramica-jinotega', 'Cerámica de las Brumas', 'Jinotega', -85.9947, 13.0883, 'Valle de Jinotega', 'Cerámica negra con técnicas precolombinas.'],
  ['barro-rojo-tipitapa', 'Barro Rojo', 'Managua', -86.1449, 12.1978, 'Tipitapa', 'Artesanía en barro rojo pulido.'],
  ['tallas-carazo', 'Tallas Carazo', 'Carazo', -86.1333, 11.7333, 'Jinotepe, Carazo', 'Figuras talladas en madera de pochote.'],
  ['fibras-rivas', 'Fibras del Pacifico', 'Rivas', -85.8373, 11.4372, 'San Juan del Sur', 'Hamacas y tapices de algodon y pita.'],
  ['madera-san-carlos', 'Maderas del San Juan', 'Rio San Juan', -84.7747, 11.1967, 'San Carlos', 'Muebles rústicos en madera de caoba.'],
  ['arte-rama', 'Arte en Rama', 'Chinandega', -87.1500, 12.6231, 'Chinandega centro', 'Esculturas en madera y raices.'],
  ['hilados-silvestre', 'Hilados Silvestre', 'Chontales', -85.1800, 11.9400, 'Juigalpa, Chontales', 'Hilados en lana y algodon con tintes naturales.'],
  ['orfebreria-colonial', 'Orfebreria Colonial', 'Granada', -85.9519, 11.9306, 'Frente al Parque Central, Granada', 'Plateria colonial y filigrana tradicional.'],
];

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

  // Get a fallback user to assign as owner (since owner is required and a relation).
  // Use the first admin user; if none exists, fail with a clear message.
  let ownerId;
  try {
    const users = await pb.collection('users').getList(1, 1, { sort: '-created' });
    if (users.items.length === 0) {
      console.error('No hay usuarios en la coleccion users. Crea al menos uno antes de correr el seed.');
      console.error('Ejemplo: registra un usuario via /registro en el frontend, o crea uno via Admin UI.');
      process.exit(1);
    }
    ownerId = users.items[0].id;
    console.log(`Usando owner: ${users.items[0].email || users.items[0].username || users.items[0].id}`);
  } catch (err) {
    console.error('Error al buscar users:', err.message);
    process.exit(1);
  }

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const [slug, name, department, lon, lat, address_text, description] of STORES) {
    try {
      // Idempotency check by slug.
      const existing = await pb.collection('stores').getList(1, 1, { filter: `slug = "${slug}"` });
      if (existing.items.length > 0) {
        console.log(`SKIP  ${slug} (ya existe)`);
        skipped++;
        continue;
      }

      await pb.collection('stores').create({
        slug,
        name,
        description,
        category: 'otro',
        address_text,
        department,
        location: { lon, lat }, // MUST be {lon, lat} lowercase for geoPoint
        owner: ownerId,
      });
      console.log(`CREATE ${slug} (${department})`);
      created++;
    } catch (err) {
      console.error(`FAIL  ${slug}: ${err.message}`);
      failed++;
    }
  }

  console.log('');
  console.log(`Resumen: ${created} creadas, ${skipped} saltadas, ${failed} fallidas.`);
  if (created > 0) {
    console.log('');
    console.log('Listo. Refresca http://localhost:4321/mapa para ver los markers.');
    console.log('Para limpiar todos los stores seeded: node pb/seed_geo_stores.js --reset (TODO).');
  }
}

main().catch((err) => {
  console.error('Error fatal:', err);
  process.exit(1);
});