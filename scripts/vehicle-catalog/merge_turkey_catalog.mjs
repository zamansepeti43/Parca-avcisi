import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const seedPath = path.join(root, 'data/vehicle-catalog-sources/legacy-seed.json');
const outJson = path.join(root, 'data/vehicle-catalog-merged.json');
const outJs = path.join(root, 'src/lib/vehicle-catalog.js');

const VEHICLEDB_URL = 'https://cdn.jsdelivr.net/gh/vehiclesdb/vehiclesdb@latest/dist/vehicles.json';
const INFOCAR_URL = 'https://raw.githubusercontent.com/alihaydarkir/InformationCar/master/data/arabalar.json';
const FLEET_MAKES = 'https://fleetbyte-api.onrender.com/v1/makes?page=1&pageSize=100';

const clean = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();
const key = (...v) => v.map(clean).join('|').toLocaleLowerCase('tr-TR');
const years = (from, to) => { const a=[]; for (let y=Number(from)||0; y <= (Number(to)||0); y++) a.push(y); return a; };

async function getJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Parca-Avcisi-Vehicle-Merger/1.0' } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${url}`);
  return res.json();
}

async function loadLegacy() {
  try {
    const raw = await fs.readFile(seedPath, 'utf8');
    return JSON.parse(raw);
  } catch {}
  const mod = await import(pathToFileUrl(path.join(root, 'src/lib/vehicle-catalog.js')));
  const seed = mod.vehicleCatalog ?? [];
  await fs.mkdir(path.dirname(seedPath), { recursive: true });
  await fs.writeFile(seedPath, JSON.stringify(seed, null, 2) + '\n');
  return seed;
}

function pathToFileUrl(p) { return new URL(`file://${p.replaceAll('\\', '/')}`); }

function add(records, seen, row, source) {
  const make = clean(row.make || row.marka);
  const model = clean(row.model);
  if (!make || !model) return;
  const engines = Array.isArray(row.engines) ? row.engines.map(clean).filter(Boolean) : (row.engine ? [clean(row.engine)] : []);
  const trims = Array.isArray(row.trims) ? row.trims.map(clean).filter(Boolean) : (row.trim ? [clean(row.trim)] : []);
  const item = {
    type: clean(row.type) || 'Otomobil',
    make,
    model,
    generation: clean(row.generation) || undefined,
    body: clean(row.body) || undefined,
    years: Array.isArray(row.years) ? row.years.map(Number).filter(Boolean) : [],
    year_from: row.year_from ?? undefined,
    year_to: row.year_to ?? undefined,
    engines,
    fuels: Array.isArray(row.fuels) ? row.fuels.map(clean).filter(Boolean) : [],
    transmissions: Array.isArray(row.transmissions) ? row.transmissions.map(clean).filter(Boolean) : [],
    trims,
    engineDetails: row.engineDetails ?? [],
    provenance: [source],
  };
  const k = key(make, model, item.generation, item.body, item.year_from, item.year_to, engines.join(','), trims.join(','));
  if (seen.has(k)) return;
  seen.add(k);
  records.push(item);
}

function importInfoCar(records, seen, data) {
  for (const r of Array.isArray(data) ? data : []) {
    const donanim = clean(r.donanim);
    const cc = clean(r.motor);
    const fuel = clean(r.yakit);
    const transmission = clean(r.vites);
    add(records, seen, {
      type: 'Otomobil', make: r.marka, model: r.model,
      engines: cc ? [cc + ' cc'] : [], fuels: fuel ? [fuel] : [],
      transmissions: transmission ? [transmission] : [],
      trims: donanim ? [donanim] : [],
    }, 'InformationCar');
  }
}

function flattenVehiclesDb(data) {
  const out = [];
  const walk = (make, value) => {
    if (Array.isArray(value)) {
      for (const m of value) {
        if (m && typeof m === 'object' && m.name) out.push({ make, ...m });
      }
      return;
    }
    if (value && typeof value === 'object') {
      if (Array.isArray(value.models)) {
        for (const m of value.models) out.push({ make, ...m });
      } else {
        for (const [k, v] of Object.entries(value)) walk(make || k, v);
      }
    }
  };
  if (Array.isArray(data)) {
    for (const m of data) {
      if (m?.make && m?.name) out.push(m);
      else if (m?.name && Array.isArray(m.models)) for (const x of m.models) out.push({ make: m.name, ...x });
    }
  } else if (data?.makes) {
    for (const m of data.makes) for (const x of (m.models || [])) out.push({ make: m.name, ...x });
  } else {
    for (const [make, value] of Object.entries(data || {})) walk(make, value);
  }
  return out;
}

function importVehiclesDb(records, seen, data, allowedMakes) {
  for (const r of flattenVehiclesDb(data)) {
    const make = clean(r.make || r.make_name);
    if (!allowedMakes.has(make.toLocaleLowerCase('tr-TR'))) continue;
    const availability = r.availability || [];
    const body = Array.isArray(r.body_types) ? r.body_types[0] : r.body_type;
    add(records, seen, {
      type: r.kind === 'van' ? 'Panelvan' : r.kind === 'truck' ? 'Kamyon' : r.kind === 'bus' ? 'Otobüs' : r.kind === 'motorcycle' ? 'Motosiklet' : 'Otomobil',
      make, model: r.name, generation: r.generation?.name, body,
      year_from: r.year_start ?? r.years?.[0], year_to: r.year_end ?? r.years?.at(-1),
      years: Array.isArray(r.years) ? r.years : [],
    }, `VehiclesDB${availability.length ? `:${availability.join(',')}` : ''}`);
  }
}

async function enrichFleetByte(records, seen) {
  if (process.env.FLEETBYTE !== '1') return { fetched: 0, skipped: true };
  let fetched = 0;
  try {
    const makes = await getJson(FLEET_MAKES);
    for (const make of (makes.items || [])) {
      if (clean(make.country).toUpperCase() !== 'TR') continue;
      const modelsUrl = `https://fleetbyte-api.onrender.com/v1/makes/${make.id}/models?page=1&pageSize=100`;
      const models = await getJson(modelsUrl);
      for (const model of (models.items || [])) {
        const variants = await getJson(`https://fleetbyte-api.onrender.com/v1/models/${model.id}/variants?page=1&pageSize=100`);
        for (const v of (variants.items || [])) {
          add(records, seen, {
            type: 'Otomobil', make: make.name, model: model.name,
            years: v.year ? [Number(v.year)] : [],
            year_from: v.year, year_to: v.year,
            body: v.bodyType, engines: [v.engine].filter(Boolean),
            fuels: [v.fuelType].filter(Boolean), transmissions: [v.gearboxType].filter(Boolean),
            trims: [v.name].filter(Boolean),
          }, 'FleetByte');
          fetched++;
        }
      }
    }
  } catch (e) {
    console.warn(`FleetByte enrichment skipped: ${e.message}`);
  }
  return { fetched, skipped: false };
}

const legacy = await loadLegacy();
const records = [];
const seen = new Set();
for (const row of legacy) add(records, seen, row, 'ParcaAvcisiLegacy');

let info = [];
try { info = await getJson(INFOCAR_URL); importInfoCar(records, seen, info); }
catch (e) { console.warn(`InformationCar skipped: ${e.message}`); }

try {
  const vdb = await getJson(VEHICLEDB_URL);
  const allowed = new Set(records.map(x => x.make.toLocaleLowerCase('tr-TR')));
  importVehiclesDb(records, seen, vdb, allowed);
} catch (e) { console.warn(`VehiclesDB skipped: ${e.message}`); }

const fleet = await enrichFleetByte(records, seen);

records.sort((a,b) => key(a.make,a.model,a.generation,a.body).localeCompare(key(b.make,b.model,b.generation,b.body),'tr'));
const payload = {
  version: new Date().toISOString().slice(0,10),
  scope: 'TR-first vehicle catalog',
  policy: 'No inferred fitment; explicit source provenance is preserved.',
  sources: [
    { id: 'ParcaAvcisiLegacy', status: 'seed' },
    { id: 'InformationCar', url: INFOCAR_URL, status: info.length ? 'loaded' : 'failed' },
    { id: 'VehiclesDB', url: VEHICLEDB_URL, license: 'CC-BY-4.0', attribution: 'Vehicle data by VehiclesDB', status: 'loaded' },
    { id: 'FleetByte', status: fleet.skipped ? 'optional' : 'loaded', fetched: fleet.fetched },
  ],
  counts: { records: records.length, makes: new Set(records.map(x => x.make)).size, models: new Set(records.map(x => key(x.make,x.model))).size },
  records,
};
await fs.mkdir(path.dirname(outJson), { recursive: true });
await fs.writeFile(outJson, JSON.stringify(payload, null, 2) + '\n');

const js = `// GENERATED FILE — do not edit manually. Run: npm run catalog:vehicles\n// Sources: Parça Avcısı legacy + InformationCar + VehiclesDB + optional FleetByte.\n// VehiclesDB attribution: Vehicle data by VehiclesDB (https://vehiclesdb.com)\n\nexport const vehicleTypes = ['Otomobil','SUV / 4x4','Pickup / Kamyonet','Panelvan','Minibüs','Kamyon','Otobüs','Motosiklet','Ticari Araç','Diğer'];\nexport const vehicleCatalog = ${JSON.stringify(records, null, 2)};\n\nexport function optionsFor(selection, field) {\n  const rows = vehicleCatalog;\n  if (field === 'type') return [...new Set(rows.map(x => x.type).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'tr'));\n  if (field === 'make') return [...new Set(rows.filter(x=>!selection.type || x.type===selection.type).map(x=>x.make).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'tr'));\n  if (field === 'model') return [...new Set(rows.filter(x=>(!selection.type||x.type===selection.type)&&(!selection.make||x.make===selection.make)).map(x=>x.model).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'tr'));\n  if (field === 'year') return [...new Set(rows.filter(x=>(!selection.make||x.make===selection.make)&&(!selection.model||x.model===selection.model)).flatMap(x=>x.years||yearsFor(x))).filter(Boolean)].sort((a,b)=>a-b).map(String);\n  if (field === 'engine') return [...new Set(rows.filter(x=>(!selection.make||x.make===selection.make)&&(!selection.model||x.model===selection.model)&&(!selection.year||!(x.years?.length)||x.years.includes(Number(selection.year))).flatMap(x=>[...(x.trims||[]),...(x.engines||[])])).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'tr'));\n  return [];\n}\nfunction yearsFor(x){const a=[]; if(Number.isFinite(Number(x.year_from))){for(let y=Number(x.year_from);y<=Number(x.year_to||x.year_from);y++)a.push(y)} return a;}\n`;
await fs.writeFile(outJs, js);
console.log(JSON.stringify(payload.counts));
