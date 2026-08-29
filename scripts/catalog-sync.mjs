import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const dataDir = path.join(root, 'data');
const outFile = path.join(dataDir, 'vehicle-catalog-sync.json');

const normalize = (value) => String(value ?? '').trim().toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ');
const key = (v) => [v.make,v.model,v.year,v.body,v.engine,v.fuel,v.transmission,v.trim].map(normalize).join('|');

async function readJson(file) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); }
  catch { return []; }
}

function flatten(source) {
  const rows = [];
  const walk = (make, model, year, item) => {
    if (!item) return;
    const engines = item.engines ?? item.engine ?? [];
    const trims = item.trims ?? item.versions ?? item.variants ?? [];
    const engineList = Array.isArray(engines) ? engines : [engines];
    const trimList = Array.isArray(trims) ? trims : [trims];
    if (engineList.length === 0 && trimList.length === 0) {
      rows.push({make,model,year: year || item.year || null,body:item.body || null,engine:item.engine || null,fuel:item.fuel || null,transmission:item.transmission || null,trim:item.trim || null});
      return;
    }
    for (const e of engineList.length ? engineList : [{}]) {
      const base = typeof e === 'string' ? { engine:e } : e || {};
      for (const t of trimList.length ? trimList : [{}]) {
        const trim = typeof t === 'string' ? t : (t?.name ?? t?.trim ?? null);
        rows.push({make,model,year: year || item.year || t?.year || e?.year || null,body:item.body ?? t?.body ?? e?.body ?? null,engine:base.name ?? base.engine ?? base.label ?? null,fuel:base.fuel ?? e?.fuel ?? t?.fuel ?? item.fuel ?? null,transmission:base.transmission ?? e?.transmission ?? t?.transmission ?? item.transmission ?? null,trim});
      }
    }
  };
  if (Array.isArray(source)) {
    for (const item of source) {
      if (item.make || item.brand) walk(item.make ?? item.brand, item.model ?? item.name, item.year, item);
      else if (item.models) {
        for (const model of item.models) walk(item.make ?? item.brand ?? item.name, model.name ?? model.model, model.year, model);
      }
    }
  } else if (source && typeof source === 'object') {
    for (const [make, models] of Object.entries(source)) {
      if (Array.isArray(models)) for (const item of models) walk(make, item.model ?? item.name, item.year, item);
    }
  }
  return rows;
}

const candidates = [
  'data/vehicle-catalog-merged.json',
  'data/vehicle-catalog.json',
  'data/turkey-vehicle-taxonomy.json'
];
const rows = [];
for (const file of candidates) rows.push(...flatten(await readJson(path.join(root, file))));

const unique = new Map();
for (const row of rows) {
  if (!row.make || !row.model) continue;
  unique.set(key(row), row);
}
const vehicles = [...unique.values()].sort((a,b) => key(a).localeCompare(key(b), 'tr-TR'));
const audit = {
  generatedAt: new Date().toISOString(),
  sourceFiles: candidates,
  counts: {
    brands: new Set(vehicles.map(v => normalize(v.make))).size,
    models: new Set(vehicles.map(v => `${normalize(v.make)}|${normalize(v.model)}`)).size,
    engineVariants: new Set(vehicles.map(v => [v.make,v.model,v.year,v.body,v.engine,v.fuel,v.transmission].map(normalize).join('|'))).size,
    trims: new Set(vehicles.map(v => [v.make,v.model,v.year,v.body,v.engine,v.fuel,v.transmission,v.trim].map(normalize).join('|'))).size,
    vehicles: vehicles.length
  },
  vehicles
};
await fs.mkdir(dataDir, { recursive:true });
await fs.writeFile(outFile, JSON.stringify(audit, null, 2) + '\n');
console.log(JSON.stringify(audit.counts));
