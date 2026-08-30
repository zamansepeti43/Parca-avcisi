const BASE = process.env.SUPABASE_URL?.replace(/\/$/, '');
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!BASE || !KEY) throw new Error('Missing Supabase secrets');
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };
const PAGE = 1000;
const FLUSH = 500;
const norm = v => String(v ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, '');
const tokens = v => String(v ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toUpperCase().match(/[A-Z0-9]+/g) ?? [];
const overlap = (a, b, c, d) => (a ?? 0) <= (d ?? 9999) && (c ?? 0) <= (b ?? 9999);

async function get(table, select, afterId = null, order = 'id.asc') {
  const u = new URL(`${BASE}/rest/v1/${table}`);
  u.searchParams.set('select', select);
  u.searchParams.set('order', order);
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

let written = 0, parts = 0, apps = 0, matchedCandidates = 0;

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

function modelAliases(model) {
  const raw = String(model ?? '').trim();
  const out = new Set();
  const compact = norm(raw);
  if (compact.length >= 2) out.add(compact);
  const words = tokens(raw);
  if (words.length > 1) {
    out.add(words.join(''));
    for (const w of words) if (w.length >= 3) out.add(w);
  }
  const numericLetter = raw.match(/\b(\d{1,4})\s*([A-Za-z])\b/i);
  if (numericLetter) out.add(norm(`${numericLetter[1]}${numericLetter[2]}`));
  const numeric = raw.match(/\b(\d{1,4})\b/);
  if (numeric && Number(numeric[1]) >= 10) out.add(numeric[1]);
  return [...out];
}

function boundaryContains(text, value) {
  const n = norm(value);
  if (!n || n.length < 2) return false;
  if (/^\d+[A-Z]?$/.test(n)) return new RegExp(`(?:^|[^A-Z0-9])${n}(?:$|[^A-Z0-9])`, 'i').test(String(text));
  return norm(text).includes(n);
}

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
const modelAliasesByMake = new Map();
const modelNamesByMake = new Map();
for (const v of vehicles) {
  const makeN = norm(v.make);
  const modelN = norm(v.model);
  if (!makeN || !modelN) continue;
  const vehicle = { ...v, makeN, modelN, engineN: norm(v.engine_code) };
  if (!vehiclesByMake.has(makeN)) vehiclesByMake.set(makeN, []);
  vehiclesByMake.get(makeN).push(vehicle);
  const key = `${makeN}|${modelN}`;
  if (!vehiclesByMakeModel.has(key)) vehiclesByMakeModel.set(key, []);
  vehiclesByMakeModel.get(key).push(vehicle);
  if (!modelNamesByMake.has(makeN)) modelNamesByMake.set(makeN, []);
  modelNamesByMake.get(makeN).push(modelN);
  for (const alias of modelAliases(v.model)) {
    if (alias.length < 2) continue;
    const akey = `${makeN}|${alias}`;
    if (!modelAliasesByMake.has(akey)) modelAliasesByMake.set(akey, []);
    modelAliasesByMake.get(akey).push(vehicle);
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
      const model = String(a.model ?? a.model_type ?? '').trim();
      const text = String(a.raw ?? a.raw_text ?? a.text ?? '');
      const textN = norm(text);

      // Prefer an explicit application make, but recover it from raw text when missing.
      if (!make) {
        const hit = makes.find(m => textN.includes(m));
        if (hit) make = hit;
      }
      const makeN = norm(make);
      if (!makeN) continue;
      const cand = vehiclesByMake.get(makeN);
      if (!cand?.length) continue;

      let matches = [];
      const explicitModelN = norm(model);
      if (explicitModelN) matches = vehiclesByMakeModel.get(`${makeN}|${explicitModelN}`) ?? [];

      // When the structured model is absent or did not resolve, scan the raw application
      // against every known model alias for this make. This is the important multi-fit fix:
      // one application can legitimately produce many vehicle rows.
      if (!matches.length) {
        const names = modelNamesByMake.get(makeN) ?? [];
        const hits = [];
        for (const modelN of names) {
          if (modelN.length < 2) continue;
          if (boundaryContains(text, modelN)) hits.push(modelN);
        }
        if (hits.length) {
          const longest = Math.max(...hits.map(x => x.length));
          const strong = hits.filter(x => x.length >= Math.max(2, longest - 2));
          for (const hit of strong) matches.push(...(vehiclesByMakeModel.get(`${makeN}|${hit}`) ?? []));
        }
      }

      if (!matches.length && explicitModelN) {
        for (const alias of modelAliases(model)) {
          const hit = modelAliasesByMake.get(`${makeN}|${alias}`) ?? [];
          if (hit.length) { matches = hit; break; }
        }
      }

      // Compact numeric-letter models such as "320 i" / "A 4" in raw text.
      if (!matches.length) {
        const numeric = text.match(/\b(\d{1,4})\s*([A-Za-z])\b/);
        if (numeric) {
          const alias = norm(`${numeric[1]}${numeric[2]}`);
          matches = modelAliasesByMake.get(`${makeN}|${alias}`) ?? [];
        }
      }

      if (!matches.length) continue;

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

      matchedCandidates += matches.length;
      for (const v of matches) {
        const k = `${p.id}|${v.id}`;
        if (seen.has(k)) continue;
        seen.add(k);
        buffer.push({ part_id: p.id, vehicle_id: v.id, match_method: 'catalog_direct', confidence: eng && v.engineN === eng ? 0.97 : 0.95, source_record_id: null });
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
  console.log(`DIRECT_PROGRESS parts=${parts} apps=${apps} written=${written} candidate_matches=${matchedCandidates} checkpoint=${lastPartId}`);
  if (rows.length < PAGE) break;
}

await post(buffer);
await saveProgress(null);
console.log(JSON.stringify({ FITMENT_SYNC_COMPLETE: true, mode: 'full_parts_rescan_multi_vehicle', parts_processed: parts, applications_processed: apps, candidate_matches: matchedCandidates, fitments_written: written }));
