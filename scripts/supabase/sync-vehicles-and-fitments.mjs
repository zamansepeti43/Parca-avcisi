import fs from 'node:fs/promises';

const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/$/, '');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY GitHub secret.');

const auth = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
};

const PAGE = 1000;
const FITMENT_FLUSH = 500;
const REQUEST_TIMEOUT_MS = 25000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const request = async (url, options = {}, label = 'request') => {
  let last = '';
  for (let attempt = 1; attempt <= 5; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        ...options,
        headers: { ...auth, ...(options.headers || {}) },
        signal: controller.signal,
      });
      const text = await response.text();
      if (response.ok) return text;
      last = `${response.status} ${text.slice(0, 500)}`;
      console.warn(`${label} failed attempt ${attempt}/5: ${last}`);
    } catch (error) {
      last = error?.name === 'AbortError' ? 'request timeout' : String(error);
      console.warn(`${label} failed attempt ${attempt}/5: ${last}`);
    } finally {
      clearTimeout(timer);
    }
    if (attempt < 5) await sleep(attempt * 3000);
  }
  throw new Error(`${label} failed after 5 attempts: ${last}`);
};

const getJson = async (table, select, offset, label) => {
  const url = `${SUPABASE_URL}/rest/v1/${table}?select=${encodeURIComponent(select)}&order=id.asc`;
  const text = await request(url, {
    method: 'GET',
    headers: { Range: `${offset}-${offset + PAGE - 1}`, Prefer: 'count=none' },
  }, label);
  return JSON.parse(text);
};

const normalize = (value) => String(value ?? '')
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toUpperCase()
  .replace(/[^A-Z0-9]+/g, '');

const normalizeYear = (value, fallback) => {
  const n = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(n) ? n : fallback;
};

const appArrays = (record) => [
  ...(Array.isArray(record.structured_applications) ? record.structured_applications : []),
  ...(Array.isArray(record.applications) ? record.applications : []),
];

const vehicleKey = (make, model, yearFrom, yearTo, engine) => [
  normalize(make), normalize(model), yearFrom ?? 0, yearTo ?? 9999, normalize(engine),
].join('|');

const raw = JSON.parse(await fs.readFile('data/vehicle-catalog-sync.json', 'utf8'));
const vehiclesFromCatalog = Array.isArray(raw.vehicles) ? raw.vehicles : [];
if (!vehiclesFromCatalog.length) throw new Error('vehicle-catalog-sync.json contains no vehicles.');

// 1) Sync the canonical TR vehicle catalog first.
const vehicleUrl = `${SUPABASE_URL}/functions/v1/sync-vehicle-catalog`;
for (let offset = 0; offset < vehiclesFromCatalog.length; offset += 500) {
  const batch = vehiclesFromCatalog.slice(offset, offset + 500);
  const text = await request(vehicleUrl, {
    method: 'POST',
    body: JSON.stringify({ vehicles: batch }),
  }, `Vehicle sync ${offset}`);
  console.log(`VEHICLE_SYNC offset=${offset} count=${batch.length} result=${text.slice(0, 400)}`);
}
console.log(`VEHICLES_SOURCE_CATALOG=${vehiclesFromCatalog.length}`);

// 2) Build small in-memory indexes. This avoids the old full-table RPC join
// that exceeded PostgREST/Postgres statement_timeout.
const partsByKey = new Map();
for (let offset = 0;; offset += PAGE) {
  const rows = await getJson('parts', 'id,brand,part_number', offset, `Load parts ${offset}`);
  for (const row of rows) {
    const key = `${normalize(row.brand)}|${normalize(row.part_number)}`;
    if (key !== '|') partsByKey.set(key, row.id);
  }
  console.log(`PART_INDEX offset=${offset} count=${rows.length}`);
  if (rows.length < PAGE) break;
}

const vehiclesByKey = new Map();
for (let offset = 0;; offset += PAGE) {
  const rows = await getJson(
    'vehicles',
    'id,make,model,year_from,year_to,engine_code',
    offset,
    `Load vehicles ${offset}`,
  );
  for (const row of rows) {
    const key = vehicleKey(row.make, row.model, row.year_from, row.year_to, row.engine_code);
    vehiclesByKey.set(key, row.id);
  }
  console.log(`VEHICLE_INDEX offset=${offset} count=${rows.length}`);
  if (rows.length < PAGE) break;
}

// 3) Walk catalog records in pages. Each page is small, so no SQL statement
// can grow into the giant IN()/Cartesian query that previously timed out.
let catalogOffset = 0;
let catalogRecords = 0;
let newVehicles = 0;
let fitmentsInserted = 0;
let fitmentBuffer = [];
const pendingVehicleKeys = new Set();

const flushVehicles = async () => {
  if (!pendingVehicleKeys.size) return;
  const rows = [];
  for (const key of pendingVehicleKeys) {
    const [make, model, yearFrom, yearTo, engine] = key.split('|');
    rows.push({
      make,
      model,
      year_from: Number(yearFrom) || null,
      year_to: Number(yearTo) || null,
      engine_code: engine || null,
      source_quality: 0.99,
    });
  }
  for (let i = 0; i < rows.length; i += 200) {
    const batch = rows.slice(i, i + 200);
    const text = await request(`${SUPABASE_URL}/rest/v1/vehicles`, {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify(batch),
    }, `Insert vehicles ${i}`);
    void text;
    newVehicles += batch.length;
  }
  pendingVehicleKeys.clear();
};

const flushFitments = async () => {
  if (!fitmentBuffer.length) return;
  const batch = fitmentBuffer;
  fitmentBuffer = [];
  const text = await request(
    `${SUPABASE_URL}/rest/v1/part_vehicle_fitments?on_conflict=part_id,vehicle_id`,
    {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(batch),
    },
    `Insert fitments count=${batch.length}`,
  );
  void text;
  fitmentsInserted += batch.length;
};

for (;;) {
  const rows = await getJson(
    'ai_catalog_records',
    'id,brand,part_number,applications,structured_applications,source_quality',
    catalogOffset,
    `Load catalog ${catalogOffset}`,
  );
  if (!rows.length) break;

  for (const record of rows) {
    catalogRecords++;
    const partId = partsByKey.get(`${normalize(record.brand)}|${normalize(record.part_number)}`);
    if (!partId) continue;

    const seenForRecord = new Set();
    for (const app of appArrays(record)) {
      const make = String(app?.make ?? '').trim();
      const model = String(app?.model ?? '').trim();
      if (!make || !model) continue;

      const yearFrom = normalizeYear(app?.year_from, 0) || null;
      const yearTo = normalizeYear(app?.year_to, 9999) || null;
      const engine = String(app?.engine_code ?? '').trim() || null;
      const key = vehicleKey(make, model, yearFrom, yearTo, engine);

      let vehicleId = vehiclesByKey.get(key);
      if (!vehicleId) {
        // Queue a new catalog-defined vehicle variant. We keep the key in the
        // index immediately so duplicate applications in later records do not
        // create duplicate rows in this run.
        pendingVehicleKeys.add(key);
        vehiclesByKey.set(key, `PENDING:${key}`);
        continue;
      }
      if (String(vehicleId).startsWith('PENDING:')) continue;

      const fitmentKey = `${partId}|${vehicleId}`;
      if (seenForRecord.has(fitmentKey)) continue;
      seenForRecord.add(fitmentKey);

      const quality = Number(app?.source_quality ?? record.source_quality ?? 0.99);
      fitmentBuffer.push({
        part_id: partId,
        vehicle_id: vehicleId,
        match_method: 'catalog_direct',
        confidence: Math.max(0, Math.min(1, Number.isFinite(quality) ? quality : 0.99)),
        source_record_id: record.id,
      });
      if (fitmentBuffer.length >= FITMENT_FLUSH) await flushFitments();
    }
  }

  // Insert newly discovered vehicle variants between catalog pages, then
  // subsequent pages can resolve them normally.
  await flushVehicles();
  if (rows.length < PAGE) break;
  catalogOffset += PAGE;
  console.log(`CATALOG_PROGRESS records=${catalogRecords} fitments=${fitmentsInserted} vehicles_added=${newVehicles}`);
}

await flushVehicles();
await flushFitments();

console.log(JSON.stringify({
  FITMENT_SYNC_COMPLETE: true,
  mode: 'catalog_direct_batched',
  catalog_records_processed: catalogRecords,
  vehicles_added: newVehicles,
  fitments_written: fitmentsInserted,
}));
