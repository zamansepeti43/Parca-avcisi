import fs from 'node:fs/promises';
import crypto from 'node:crypto';

const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/$/, '');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY GitHub secret.');

const headers = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' };
const raw = JSON.parse(await fs.readFile('data/vehicle-catalog-sync.json', 'utf8'));
const vehicles = Array.isArray(raw.vehicles) ? raw.vehicles : [];
if (!vehicles.length) throw new Error('vehicle-catalog-sync.json contains no vehicles.');

function uuidFromKey(key) {
  const h = crypto.createHash('sha1').update(`parca-avcisi:${key}`).digest();
  h[6] = (h[6] & 0x0f) | 0x50;
  h[8] = (h[8] & 0x3f) | 0x80;
  return [...h.subarray(0, 16)].map((x, i) => `${x.toString(16).padStart(2,'0')}${[3,5,7,9].includes(i) ? '-' : ''}`).join('');
}
const key = v => [v.make,v.model,v.year,v.body,v.engine,v.fuel,v.transmission,v.trim].map(x=>String(x??'').trim().toLocaleUpperCase('tr-TR')).join('|');
const rows = vehicles.map(v => ({
  id: uuidFromKey(key(v)), make: v.make, model: v.model,
  year_from: v.year ? Number(v.year) : null, year_to: v.year ? Number(v.year) : null,
  engine: v.engine ?? null, fuel: v.fuel ?? null, variant: v.variant ?? null,
  trim: v.trim ?? null, body_style: v.body ?? null, engine_code: v.engine_code ?? null,
  source_url: v.source_url ?? null, source_quality: v.source_quality ?? null
}));

async function post(path, body, extra = {}) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { method:'POST', headers:{...headers,...extra}, body:JSON.stringify(body) });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}: ${await r.text()}`);
}
for (let i=0;i<rows.length;i+=500) {
  await post('vehicles', rows.slice(i,i+500));
  console.log(`vehicles ${Math.min(i+500,rows.length)}/${rows.length}`);
}
console.log(`VEHICLES_SYNCED=${rows.length}`);

const functionUrl = `${SUPABASE_URL}/functions/v1/sync-part-fitments`;
const totalParts = 196220;
const batch = 40000;
for (let offset=0; offset<totalParts; offset+=batch) {
  const r = await fetch(functionUrl, {
    method:'POST',
    headers:{apikey:SERVICE_KEY, Authorization:`Bearer ${SERVICE_KEY}`, 'Content-Type':'application/json'},
    body:JSON.stringify({limit:batch, offset})
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`Fitment batch offset ${offset} failed: ${r.status} ${text}`);
  console.log(`FITMENT_BATCH offset=${offset} result=${text}`);
}
