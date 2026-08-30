const BASE = process.env.SUPABASE_URL?.replace(/\/$/, '');
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!BASE || !KEY) throw new Error('Missing Supabase secrets');
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };
const PAGE = 1000;
const FLUSH = 500;
const norm = v => String(v ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, '');
const overlap = (a, b, c, d) => (a ?? 0) <= (d ?? 9999) && (c ?? 0) <= (b ?? 9999);

async function get(table, select, afterId = null) {
  const u = new URL(`${BASE}/rest/v1/${table}`);
  u.searchParams.set('select', select);
  u.searchParams.set('order', 'id.asc');
  u.searchParams.set('limit', String(PAGE));
  if (afterId) u.searchParams.set('id', `gt.${afterId}`);
  const r = await fetch(u, { headers: H });
  if (!r.ok) throw new Error(`${table} ${r.status}: ${(await r.text()).slice(0, 300)}`);
  return r.json();
}

async function getProgress() {
  const u = new URL(`${BASE}/rest/v1/fitment_sync_progress`);
  u.searchParams.set('select', 'last_part_id');
  u.searchParams.set('id', 'eq.true');
  u.searchParams.set('limit', '1');
  const r = await fetch(u, { headers: H });
  if (!r.ok) throw new Error(`progress ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const rows = await r.json();
  return rows[0]?.last_part_id ?? null;
}

async function saveProgress(lastPartId) {
  const r = await fetch(`${BASE}/rest/v1/fitment_sync_progress`, {
    method: 'POST',
    headers: { ...H, Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ id: true, last_part_id: lastPartId, updated_at: new Date().toISOString() })
  });
  if (!r.ok) throw new Error(`progress ${r.status}: ${(await r.text()).slice(0, 300)}`);
}

async function post(rows) {
  for (let i = 0; i < rows.length; i += FLUSH) {
    const b = rows.slice(i, i + FLUSH);
    const r = await fetch(`${BASE}/rest/v1/rpc/insert_fitment_batch`, {
      method: 'POST',
      headers: { ...H, Prefer: 'return=minimal' },
      body: JSON.stringify({ p_rows: b })
    });
    if (!r.ok) throw new Error(`fitment ${r.status}: ${(await r.text()).slice(0, 300)}`);
    written += b.length;
  }
}

let written = 0, parts = 0, apps = 0;

const vehicles = [];
let vehicleCursor = null;
for (;;) {
  const rows = await get('vehicles', 'id,make,model,year_from,year_to,engine_code', vehicleCursor);
  if (!rows.length) break;
  vehicles.push(...rows);
  vehicleCursor = rows[rows.length - 1].id;
  if (rows.length < PAGE) break;
}

const vehiclesByMake = new Map();
const vehiclesByMakeModel = new Map();
const modelNamesByMake = new Map();
for (const v of vehicles) {
  const makeN = norm(v.make);
  const modelN = norm(v.model);
  if (!makeN) continue;
  if (!vehiclesByMake.has(makeN)) vehiclesByMake.set(makeN, []);
  vehiclesByMake.get(makeN).push({ ...v, makeN, modelN, engineN: norm(v.engine_code) });
  const key = `${makeN}|${modelN}`;
  if (!vehiclesByMakeModel.has(key)) vehiclesByMakeModel.set(key, []);
  vehiclesByMakeModel.get(key).push({ ...v, makeN, modelN, engineN: norm(v.engine_code) });
  if (modelN) {
    if (!modelNamesByMake.has(makeN)) modelNamesByMake.set(makeN, []);
    modelNamesByMake.get(makeN).push(modelN);
  }
}
for (const [k, arr] of modelNamesByMake) modelNamesByMake.set(k, [...new Set(arr)].sort((a, b) => b.length - a.length));
const makes = [...vehiclesByMake.keys()].sort((a, b) => b.length - a.length);

let lastPartId = await getProgress();
console.log(`FITMENT_RESUME last_part_id=${lastPartId ?? 'START'}`);
let buffer = [];
const seen = new Set();

for (;;) {
  const rows = await get('parts', 'id,applications,brand,part_number', lastPartId);
  if (!rows.length) break;

  for (const p of rows) {
    parts++;
    const arr = Array.isArray(p.applications) ? p.applications : [];
    for (const raw of arr) {
      apps++;
      const a = raw && typeof raw === 'object' ? raw : { raw: String(raw ?? '') };
      let make = String(a.make ?? '').trim();
      let model = String(a.model ?? a.model_type ?? '').trim();
      const text = String(a.raw ?? a.raw_text ?? a.text ?? '');
      const textN = norm(text);

      if (!make) {
        const hit = makes.find(m => textN.includes(m));
        if (hit) make = hit;
      }
      const makeN = norm(make);
      if (!makeN) continue;
      const cand = vehiclesByMake.get(makeN);
      if (!cand?.length) continue;

      let modelN = norm(model);
      if (!modelN) {
        const names = modelNamesByMake.get(makeN) ?? [];
        modelN = names.find(m => m.length >= 3 && textN.includes(m)) ?? '';
      }

      // CRITICAL: never fall back to every vehicle of a make.
      // If no model can be identified, skip this application rather than
      // creating thousands of false-positive fitments.
      let matches = modelN ? (vehiclesByMakeModel.get(`${makeN}|${modelN}`) ?? []) : [];
      const yf = Number.parseInt(a.year_from, 10);
      const yt = Number.parseInt(a.year_to, 10);
      if (Number.isFinite(yf) || Number.isFinite(yt)) {
        matches = matches.filter(v => overlap(v.year_from, v.year_to, Number.isFinite(yf) ? yf : 0, Number.isFinite(yt) ? yt : 9999));
      }
      const eng = norm(a.engine_code);
      if (eng) {
        const exact = matches.filter(v => v.engineN === eng);
        if (exact.length) matches = exact;
      }

      for (const v of matches) {
        const k = `${p.id}|${v.id}`;
        if (seen.has(k)) continue;
        seen.add(k);
        buffer.push({ part_id: p.id, vehicle_id: v.id, match_method: 'catalog_direct', confidence: 0.95, source_record_id: null });
        if (buffer.length >= FLUSH * 2) {
          await post(buffer);
          buffer = [];
        }
      }
    }
  }

  await post(buffer);
  buffer = [];
  lastPartId = rows[rows.length - 1].id;
  await saveProgress(lastPartId);
  console.log(`DIRECT_PROGRESS parts=${parts} apps=${apps} written=${written} checkpoint=${lastPartId}`);
  if (rows.length < PAGE) break;
}

await post(buffer);
buffer = [];
await saveProgress(null);
console.log(JSON.stringify({ FITMENT_SYNC_COMPLETE: true, mode: 'parts_applications_direct', parts_processed: parts, applications_processed: apps, fitments_written: written }));
