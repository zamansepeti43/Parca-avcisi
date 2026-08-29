import fs from 'node:fs/promises';

const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/$/, '');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY GitHub secret.');

const auth = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' };
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
      const response = await fetch(url, { ...options, headers: { ...auth, ...(options.headers || {}) }, signal: controller.signal });
      const text = await response.text();
      if (response.ok) return text;
      last = `${response.status} ${text.slice(0, 500)}`;
      console.warn(`${label} failed attempt ${attempt}/5: ${last}`);
    } catch (error) {
      last = error?.name === 'AbortError' ? 'request timeout' : String(error);
      console.warn(`${label} failed attempt ${attempt}/5: ${last}`);
    } finally { clearTimeout(timer); }
    if (attempt < 5) await sleep(attempt * 3000);
  }
  throw new Error(`${label} failed after 5 attempts: ${last}`);
};

const getJson = async (table, select, offset, label) => {
  const url = `${SUPABASE_URL}/rest/v1/${table}?select=${encodeURIComponent(select)}&order=id.asc`;
  const text = await request(url, { method: 'GET', headers: { Range: `${offset}-${offset + PAGE - 1}`, Prefer: 'count=none' } }, label);
  return JSON.parse(text);
};

const normalize = (value) => String(value ?? '')
  .normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, '');
const normalizeYear = (value, fallback) => {
  const n = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(n) ? n : fallback;
};
const yearOverlap = (vf, vt, af, at) => (vf ?? 0) <= (at ?? 9999) && (af ?? 0) <= (vt ?? 9999);
const appArrays = (record) => {
  const out = [];
  for (const key of ['structured_applications', 'applications']) {
    const value = record[key];
    const arr = Array.isArray(value) ? value : [];
    for (const item of arr) {
      if (item && typeof item === 'object') out.push(item);
      else if (typeof item === 'string') out.push({ raw: item });
    }
  }
  return out;
};
const vehicleKey = (make, model, yearFrom, yearTo, engine) => [normalize(make), normalize(model), yearFrom ?? 0, yearTo ?? 9999, normalize(engine)].join('|');

const raw = JSON.parse(await fs.readFile('data/vehicle-catalog-sync.json', 'utf8'));
const vehiclesFromCatalog = Array.isArray(raw.vehicles) ? raw.vehicles : [];
if (!vehiclesFromCatalog.length) throw new Error('vehicle-catalog-sync.json contains no vehicles.');

// 1) Sync the canonical TR vehicle catalog first.
const vehicleUrl = `${SUPABASE_URL}/functions/v1/sync-vehicle-catalog`;
for (let offset = 0; offset < vehiclesFromCatalog.length; offset += 500) {
  const batch = vehiclesFromCatalog.slice(offset, offset + 500);
  const text = await request(vehicleUrl, { method: 'POST', body: JSON.stringify({ vehicles: batch }) }, `Vehicle sync ${offset}`);
  console.log(`VEHICLE_SYNC offset=${offset} count=${batch.length} result=${text.slice(0, 400)}`);
}
console.log(`VEHICLES_SOURCE_CATALOG=${vehiclesFromCatalog.length}`);

// 2) Small indexes: no giant RPC joins.
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
const vehiclesByMake = new Map();
for (let offset = 0;; offset += PAGE) {
  const rows = await getJson('vehicles', 'id,make,model,year_from,year_to,engine_code', offset, `Load vehicles ${offset}`);
  for (const row of rows) {
    const key = vehicleKey(row.make, row.model, row.year_from, row.year_to, row.engine_code);
    vehiclesByKey.set(key, row.id);
    const makeKey = normalize(row.make);
    if (!vehiclesByMake.has(makeKey)) vehiclesByMake.set(makeKey, []);
    vehiclesByMake.get(makeKey).push(row);
  }
  console.log(`VEHICLE_INDEX offset=${offset} count=${rows.length}`);
  if (rows.length < PAGE) break;
}

const pendingVehicles = new Map();
let catalogOffset = 0;
let catalogRecords = 0;
let newVehicles = 0;
let fitmentsWritten = 0;
let fitmentBuffer = [];
const fitmentKeys = new Set();

const flushVehicles = async () => {
  if (!pendingVehicles.size) return;
  const rows = [...pendingVehicles.values()];
  for (let i = 0; i < rows.length; i += 200) {
    const batch = rows.slice(i, i + 200);
    const text = await request(`${SUPABASE_URL}/rest/v1/vehicles`, {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(batch.map(({ make, model, year_from, year_to, engine_code }) => ({ make, model, year_from, year_to, engine_code, source_quality: 0.99 }))),
    }, `Insert vehicles ${i}`);
    const inserted = JSON.parse(text);
    for (const row of inserted) {
      vehiclesByKey.set(vehicleKey(row.make, row.model, row.year_from, row.year_to, row.engine_code), row.id);
      const makeKey = normalize(row.make);
      if (!vehiclesByMake.has(makeKey)) vehiclesByMake.set(makeKey, []);
      vehiclesByMake.get(makeKey).push(row);
    }
    newVehicles += inserted.length;
  }
  pendingVehicles.clear();
};

const flushFitments = async () => {
  if (!fitmentBuffer.length) return;
  const batch = fitmentBuffer;
  fitmentBuffer = [];
  fitmentKeys.clear();
  await request(`${SUPABASE_URL}/rest/v1/part_vehicle_fitments?on_conflict=part_id,vehicle_id`, {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(batch),
  }, `Insert fitments count=${batch.length}`);
  fitmentsWritten += batch.length;
};

const modelMatch = (rawText, candidates) => {
  const text = normalize(rawText);
  if (!text) return null;
  let best = null;
  for (const vehicle of candidates) {
    const model = normalize(vehicle.model);
    if (model.length < 3) continue;
    if (text.includes(model) && (!best || model.length > best.model.length)) best = { vehicle, model };
  }
  return best?.vehicle ?? null;
};

const engineMatches = (rawText, candidates) => {
  const text = normalize(rawText);
  if (!text) return [];
  const hits = [];
  for (const vehicle of candidates) {
    const engine = normalize(vehicle.engine_code);
    if (engine.length < 4) continue;
    if (!/[0-9]/.test(engine) && engine.length < 5) continue;
    if (text.includes(engine)) hits.push(vehicle);
  }
  return hits;
};

const resolveVehicles = (record, app) => {
  const make = String(app?.make ?? '').trim();
  if (!make) return [];
  const candidates = vehiclesByMake.get(normalize(make)) ?? [];
  if (!candidates.length) return [];

  const appModel = String(app?.model ?? app?.model_type ?? '').trim();
  const rawText = String(app?.raw ?? app?.raw_text ?? '');
  const appYearFrom = normalizeYear(app?.year_from, 0);
  const appYearTo = normalizeYear(app?.year_to, 9999);
  const appEngine = normalize(app?.engine_code ?? '');

  // Exact structured model is preferred.
  let modelCandidates = candidates;
  if (appModel) {
    const wanted = normalize(appModel);
    modelCandidates = candidates.filter((v) => normalize(v.model) === wanted && yearOverlap(v.year_from, v.year_to, appYearFrom, appYearTo));
  } else {
    const matched = modelMatch(rawText, candidates);
    if (matched) modelCandidates = candidates.filter((v) => normalize(v.model) === normalize(matched.model) && yearOverlap(v.year_from, v.year_to, appYearFrom, appYearTo));
    else {
      const engines = engineMatches(rawText, candidates);
      if (engines.length) return engines;
      return [];
    }
  }

  if (!modelCandidates.length) return [];
  if (appEngine) {
    const exactEngine = modelCandidates.filter((v) => normalize(v.engine_code) === appEngine);
    if (exactEngine.length) return exactEngine;
  }
  return modelCandidates;
};

for (;;) {
  const rows = await getJson('ai_catalog_records', 'id,brand,part_number,applications,structured_applications,source_quality', catalogOffset, `Load catalog ${catalogOffset}`);
  if (!rows.length) break;

  for (const record of rows) {
    catalogRecords++;
    const partId = partsByKey.get(`${normalize(record.brand)}|${normalize(record.part_number)}`);
    if (!partId) continue;

    for (const app of appArrays(record)) {
      const matches = resolveVehicles(record, app);
      for (const vehicle of matches) {
        const fitmentKey = `${partId}|${vehicle.id}`;
        if (fitmentKeys.has(fitmentKey)) continue;
        fitmentKeys.add(fitmentKey);
        const quality = Number(app?.source_quality ?? record.source_quality ?? (app?.model || app?.model_type ? 0.90 : 0.82));
        fitmentBuffer.push({
          part_id: partId,
          vehicle_id: vehicle.id,
          match_method: 'catalog_direct',
          confidence: Math.max(0, Math.min(1, Number.isFinite(quality) ? quality : 0.90)),
          source_record_id: record.id,
        });
        if (fitmentBuffer.length >= FITMENT_FLUSH) await flushFitments();
      }
    }
  }

  await flushVehicles();
  if (rows.length < PAGE) break;
  catalogOffset += PAGE;
  console.log(`CATALOG_PROGRESS records=${catalogRecords} fitments=${fitmentsWritten} vehicles_added=${newVehicles}`);
}

await flushVehicles();
await flushFitments();

console.log(JSON.stringify({
  FITMENT_SYNC_COMPLETE: true,
  mode: 'catalog_direct_batched_raw_model_engine',
  catalog_records_processed: catalogRecords,
  vehicles_added: newVehicles,
  fitments_written: fitmentsWritten,
}));
