import fs from 'node:fs/promises';

const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/$/, '');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY GitHub secret.');

const auth = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' };
const raw = JSON.parse(await fs.readFile('data/vehicle-catalog-sync.json', 'utf8'));
const vehicles = Array.isArray(raw.vehicles) ? raw.vehicles : [];
if (!vehicles.length) throw new Error('vehicle-catalog-sync.json contains no vehicles.');

const postJsonWithRetry = async (url, body, label) => {
  let last = '';
  for (let attempt = 1; attempt <= 5; attempt++) {
    const r = await fetch(url, { method: 'POST', headers: auth, body: JSON.stringify(body) });
    const text = await r.text();
    if (r.ok) return text;
    last = `${r.status} ${text}`;
    console.warn(`${label} attempt ${attempt}/5 failed: ${last}`);
    if (attempt < 5) await new Promise(resolve => setTimeout(resolve, attempt * 15000));
  }
  throw new Error(`${label} failed after 5 attempts: ${last}`);
};

const vehicleUrl = `${SUPABASE_URL}/functions/v1/sync-vehicle-catalog`;
const vehicleBatch = 500;
for (let offset = 0; offset < vehicles.length; offset += vehicleBatch) {
  const batch = vehicles.slice(offset, offset + vehicleBatch);
  const text = await postJsonWithRetry(vehicleUrl, { vehicles: batch }, `Vehicle sync offset ${offset}`);
  console.log(`VEHICLE_SYNC offset=${offset} count=${batch.length} result=${text}`);
}
console.log(`VEHICLES_SOURCE_CATALOG=${vehicles.length}`);

// sync-part-fitments v13: canonical matching plus raw application fallback with catalog-derived vehicle nodes.
let afterId = null;
const functionUrl = `${SUPABASE_URL}/functions/v1/sync-part-fitments`;
const functionBatch = 500;
let batchNo = 0;
while (true) {
  const payload = { limit: functionBatch, ...(afterId ? { after_id: afterId } : {}) };
  const text = await postJsonWithRetry(functionUrl, payload, `Fitment batch after ${afterId ?? 'START'}`);
  let result;
  try { result = JSON.parse(text); } catch { throw new Error(`Invalid fitment response: ${text}`); }
  batchNo++;
  console.log(`FITMENT_BATCH=${batchNo} after_id=${afterId ?? 'START'} result=${text}`);
  const nextId = result.last_id;
  if (!result.has_more || !nextId || nextId === afterId) break;
  afterId = nextId;
}
console.log('FITMENT_SYNC_COMPLETE');
