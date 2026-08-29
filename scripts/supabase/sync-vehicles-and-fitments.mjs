import fs from 'node:fs/promises';

const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/$/, '');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY GitHub secret.');

const auth = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json'
};

const raw = JSON.parse(await fs.readFile('data/vehicle-catalog-sync.json', 'utf8'));
const vehicles = Array.isArray(raw.vehicles) ? raw.vehicles : [];
if (!vehicles.length) throw new Error('vehicle-catalog-sync.json contains no vehicles.');

// Vehicle writes are performed inside Supabase Edge Functions, where the
// project's service role is available. This avoids GitHub's RLS context.
const vehicleUrl = `${SUPABASE_URL}/functions/v1/sync-vehicle-catalog`;
const vehicleSourceBatch = 1000;
for (let offset = 0; offset < vehicles.length; offset += vehicleSourceBatch) {
  const r = await fetch(vehicleUrl, {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ limit: vehicleSourceBatch, offset })
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`Vehicle sync offset ${offset} failed: ${r.status} ${text}`);
  console.log(`VEHICLE_SYNC offset=${offset} result=${text}`);
}
console.log(`VEHICLES_SOURCE_CATALOG=${vehicles.length}`);

// The fitment Edge Function currently caps a single request at 500 records.
// Keep the user-facing processing groups at 40k, while safely executing the
// underlying function in bounded 500-record calls.
const functionUrl = `${SUPABASE_URL}/functions/v1/sync-part-fitments`;
const totalParts = 196220;
const groupSize = 40000;
const functionBatch = 500;

for (let groupOffset = 0; groupOffset < totalParts; groupOffset += groupSize) {
  const groupEnd = Math.min(groupOffset + groupSize, totalParts);
  console.log(`FITMENT_GROUP start=${groupOffset} end=${groupEnd}`);

  for (let offset = groupOffset; offset < groupEnd; offset += functionBatch) {
    const limit = Math.min(functionBatch, groupEnd - offset);
    const r = await fetch(functionUrl, {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ limit, offset })
    });
    const text = await r.text();
    if (!r.ok) throw new Error(`Fitment batch offset ${offset} failed: ${r.status} ${text}`);
    console.log(`FITMENT_BATCH offset=${offset} limit=${limit} result=${text}`);
  }

  console.log(`FITMENT_GROUP_DONE start=${groupOffset} end=${groupEnd}`);
}

console.log('FITMENT_SYNC_COMPLETE');
