import fs from 'node:fs/promises';

const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/$/, '');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY GitHub secret.');

const auth = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' };
const raw = JSON.parse(await fs.readFile('data/vehicle-catalog-sync.json', 'utf8'));
const vehicles = Array.isArray(raw.vehicles) ? raw.vehicles : [];
if (!vehicles.length) throw new Error('vehicle-catalog-sync.json contains no vehicles.');

const vehicleUrl = `${SUPABASE_URL}/functions/v1/sync-vehicle-catalog`;
const vehicleBatch = 500;
for (let offset = 0; offset < vehicles.length; offset += vehicleBatch) {
  const batch = vehicles.slice(offset, offset + vehicleBatch);
  const r = await fetch(vehicleUrl, { method: 'POST', headers: auth, body: JSON.stringify({ vehicles: batch }) });
  const text = await r.text();
  if (!r.ok) throw new Error(`Vehicle sync offset ${offset} failed: ${r.status} ${text}`);
  console.log(`VEHICLE_SYNC offset=${offset} count=${batch.length} result=${text}`);
}
console.log(`VEHICLES_SOURCE_CATALOG=${vehicles.length}`);

// Resume immediately after the last successful batch from the failed run.
// Once this recovery run completes, reset this value to null for normal nightly syncs.
let afterId = '4e175564-ac50-4984-8495-ba0f54ed9fbb';
const functionUrl = `${SUPABASE_URL}/functions/v1/sync-part-fitments`;
const functionBatch = 500;
let batchNo = 0;
while (true) {
  const r = await fetch(functionUrl, { method: 'POST', headers: auth, body: JSON.stringify({ limit: functionBatch, after_id: afterId }) });
  const text = await r.text();
  if (!r.ok) throw new Error(`Fitment recovery batch after ${afterId} failed: ${r.status} ${text}`);
  let result;
  try { result = JSON.parse(text); } catch { throw new Error(`Invalid fitment response: ${text}`); }
  batchNo++;
  console.log(`FITMENT_RECOVERY_BATCH=${batchNo} after_id=${afterId} result=${text}`);
  const nextId = result.last_id;
  if (!result.has_more || !nextId || nextId === afterId) break;
  afterId = nextId;
}
console.log('FITMENT_SYNC_RECOVERY_COMPLETE');
