import { vehicleCatalog } from './vehicle-catalog.js';
import { VehicleResolver } from './vehicle-resolver.js';
import { turkeyCurrentModelRegistry } from './turkey-current-models.generated.js';

// Turkey-facing catalog hygiene. The upstream TSB scope contains passenger cars,
// buses, trucks, body builders, RVs and industrial/special-use manufacturers.
// These must not leak into the passenger-car make/model selectors.
const NON_PASSENGER_MAKES = new Set([
  'ADRIA','AKIA','ALKE','AR-BUS','ASTRA','AVIA','BOZANKAYA','BREDAMENARIBUS','CARTHAGO',
  'CRRC','DAF','EMT','ETRUSCO','FEST','FOTON','GAZ','GROVE','GULERYUZ','HABAS','HBS','HISCAR',
  'HOBBY','HYMER','ISOBUS','IRIZAR','KAMAZ','KARSAN','KENWORTH','KNAUS','KOMI','LAIKA',
  'MAN','MENARINIBUS','MILLER','MOTORSIKLET','MULTICAR','NEOPLAN','NIEVE','OTOKAR/MAGIRUS',
  'OTOYOL\\IVECO\\FIAT','PIMAKINA','SAME','SANY','SCANIA','SCHMIDT','SETRA','SINOTRUK','SITRAK',
  'SOLARIS','TADANO FAUN','TATRA','TCV','TEMSA','TENAX','TEZELLER','TURKAR','TURKKAR','VEICOLI',
  'WEINSBERG','WMA','ZIRAI TRAKTOR','ZOOMLION'
]);

const MAKE_ALIASES = new Map([
  ['CITROEN', 'Citroën'],
  ['CITROËN', 'Citroën'],
  ['FORD /USA', 'Ford'],
  ['FORD', 'Ford'],
  ['MERCEDES', 'Mercedes-Benz'],
  ['MERCEDES-BENZ', 'Mercedes-Benz'],
  ['RENAULT (OYAK)', 'Renault'],
  ['KG MOBILITY - SSANGYONG', 'KGMOBILITY'],
  ['KG MOBILITY – SSANGYONG', 'KGMOBILITY'],
  ['KG MOBILITY', 'KGMOBILITY'],
  ['KGMOBILITY', 'KGMOBILITY'],
]);

// Current-model sources can contain commercial products under a make's page.
// They must not enter the passenger-car selector. They remain valid for the
// separate commercial-vehicle catalog.
const NON_PASSENGER_MODEL_KEYS = new Map([
  ['FORD', new Set(['JOURNEY', 'TOURNEO', 'TRANSIT', 'COURIER', 'RANGER'])],
]);

// Turkey-market model-family fallback. This is intentionally a model-family
// registry, not invented engine/fitment data. Existing catalog rows remain the
// only source for engines, years, bodies and fitments.
const VERIFIED_TURKEY_PASSENGER_MODELS = new Map([
  ['FORD', new Set([
    'B-MAX', 'C-MAX', 'ESCORT', 'FIESTA', 'FOCUS', 'FUSION', 'GALAXY', 'GRAND C-MAX',
    'KA', 'MONDEO', 'MUSTANG', 'S-MAX', 'FESTIVA', 'GRANADA', 'SCORPIO',
    'SIERRA', 'TAUNUS', 'COUGAR', 'KUGA', 'CAPRI', 'EXPLORER-E', 'BRONCO SPORT', 'ECOSPORT'
  ])],
]);

const norm = (v) => String(v ?? '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleUpperCase('tr-TR');
const canonicalMake = (v) => MAKE_ALIASES.get(norm(v)) || String(v ?? '').trim();
const sameMake = (a, b) => norm(canonicalMake(a)) === norm(canonicalMake(b));
const cleanLabel = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();
const modelKey = (v) => norm(cleanLabel(v)).replace(/[–—]/g, '-').replace(/\s*[-/]\s*/g, '-');
const unique = (values) => [...new Set((values || [])
  .flatMap((v) => Array.isArray(v) ? v : [v])
  .map(cleanLabel)
  .filter(Boolean))]
  .sort((a, b) => a.localeCompare(b, 'tr', { numeric: true }));

function isNonPassengerModel(make, model) {
  return Boolean(NON_PASSENGER_MODEL_KEYS.get(norm(canonicalMake(make)))?.has(modelKey(model)));
}

function uniqueModelLabels(values) {
  const byKey = new Map();
  for (const value of values || []) {
    const label = cleanLabel(value);
    if (!label) continue;
    const key = modelKey(label);
    if (!key || byKey.has(key)) continue;
    byKey.set(key, label);
  }

  // If upstream feeds contain the same model in different casing (e.g.
  // Galaxy/GALAXY), prefer the human-readable mixed-case label.
  for (const value of values || []) {
    const label = cleanLabel(value);
    const key = modelKey(label);
    if (!key || !byKey.has(key)) continue;
    const current = byKey.get(key);
    const labelIsAllCaps = label === label.toLocaleUpperCase('tr-TR');
    const currentIsAllCaps = current === current.toLocaleUpperCase('tr-TR');
    if (currentIsAllCaps && !labelIsAllCaps) byKey.set(key, label);
  }

  return [...byKey.values()].sort((a, b) => a.localeCompare(b, 'tr', { numeric: true }));
}

function hasTurkeyModelProvenance(row) {
  return Array.isArray(row.provenance) && row.provenance.some((source) =>
    source === 'ParcaAvcisiLegacy' || source === 'FleetByte'
  );
}

function registryModelKeys() {
  const keys = new Set();
  for (const entry of Array.isArray(turkeyCurrentModelRegistry) ? turkeyCurrentModelRegistry : []) {
    const make = canonicalMake(entry.make);
    for (const model of (entry.models || [])) {
      if (isNonPassengerModel(make, model)) continue;
      keys.add(`${norm(make)}::${modelKey(model)}`);
    }
  }
  return keys;
}

const currentTurkeyModelKeys = registryModelKeys();
const turkeyVerifiedModelKeys = new Set(currentTurkeyModelKeys);

for (const row of (Array.isArray(vehicleCatalog) ? vehicleCatalog : [])) {
  const type = cleanLabel(row.type || row.vehicle_type);
  if (type && type !== 'Otomobil') continue;
  if (hasTurkeyModelProvenance(row) && !isNonPassengerModel(row.make, row.model)) {
    turkeyVerifiedModelKeys.add(`${norm(canonicalMake(row.make))}::${modelKey(row.model)}`);
  }
}

function isVerifiedTurkeyModel(row) {
  const make = canonicalMake(row.make);
  if (isNonPassengerModel(make, row.model)) return false;
  const key = `${norm(make)}::${modelKey(row.model)}`;
  if (turkeyVerifiedModelKeys.has(key)) return true;
  return Boolean(VERIFIED_TURKEY_PASSENGER_MODELS.get(norm(make))?.has(modelKey(row.model)));
}

function yearMatches(row, year) {
  if (!year) return true;
  const y = Number(year);
  if (!Number.isFinite(y)) return true;
  if (Array.isArray(row.years) && row.years.length) return row.years.map(Number).includes(y);

  const from = Number(row.year_from ?? row.yearStart ?? row.from);
  const to = Number(row.year_to ?? row.yearEnd ?? row.to ?? from);
  if (Number.isFinite(from)) return y >= from && y <= (Number.isFinite(to) ? Number(to) : from);

  const single = Number(row.year);
  return Number.isFinite(single) ? single === y : true;
}

function isPassengerRow(row) {
  const type = cleanLabel(row.type || row.vehicle_type);
  return !type || type === 'Otomobil';
}

function turkeyRows(selection = {}) {
  return (Array.isArray(vehicleCatalog) ? vehicleCatalog : []).filter((row) => {
    const make = canonicalMake(row.make);
    const type = cleanLabel(row.type || row.vehicle_type);

    if (NON_PASSENGER_MAKES.has(norm(make)) && (!selection.type || selection.type === 'Otomobil')) return false;
    if (selection.type === 'Otomobil') {
      if (!isPassengerRow(row)) return false;
      if (!isVerifiedTurkeyModel(row)) return false;
    }
    if (selection.type && type && type !== selection.type) return false;
    if (selection.make && !sameMake(row.make, selection.make)) return false;
    if (selection.model && modelKey(row.model) !== modelKey(selection.model)) return false;
    return true;
  });
}

function makeOptions(selection = {}) {
  return unique(turkeyRows(selection).map((row) => canonicalMake(row.make)));
}

function modelOptions(selection = {}) {
  const catalogModels = turkeyRows(selection).map((row) => row.model);

  // A verified Turkey model family must remain selectable even if the current
  // merged feed has no variant row for that family. We do NOT fabricate its
  // engine/fitment data.
  const explicit = selection.make
    ? [...(VERIFIED_TURKEY_PASSENGER_MODELS.get(norm(canonicalMake(selection.make))) || [])]
    : [];

  const current = selection.make
    ? (Array.isArray(turkeyCurrentModelRegistry)
      ? turkeyCurrentModelRegistry
          .filter((entry) => sameMake(entry.make, selection.make))
          .flatMap((entry) => entry.models || [])
          .filter((model) => !isNonPassengerModel(selection.make, model))
      : [])
    : [];

  return uniqueModelLabels([...catalogModels, ...explicit, ...current]);
}

function variantOptions(selection = {}) {
  const rows = turkeyRows(selection).filter((row) => yearMatches(row, selection.year));
  const values = rows.flatMap((row) => [
    ...(row.trims || []),
    ...(row.engines || []),
    ...(row.valves || row.valveCounts || []),
    ...(row.engineDetails || []).flatMap((detail) => [
      detail.name, detail.label, detail.engine, detail.version, detail.trim,
      detail.valves, detail.valveCount, detail.valf, detail.valfSayisi,
    ]),
  ]);

  // Compatibility layer for the known Turkey-market Escort naming. These are
  // model/trim labels, not invented engine specifications. Valve-count variants
  // are added only when the verified source/catalog actually supplies them.
  if (sameMake(selection.make, 'Ford') && modelKey(selection.model) === 'ESCORT') {
    const year = Number(selection.year);
    if (!Number.isFinite(year) || (year >= 1995 && year <= 1997)) {
      values.push(
        '1.6 CL', '1.6 CL HB', '1.6 CL Sedan',
        '1.6 CL 16V', '1.6 CL 16V HB', '1.6 CL 16V Sedan',
        '1.3 CLX HB', '1.3 CLX Sedan',
        '1.6 C HB', '1.6 C Sedan',
        '1.6 CLX HB', '1.6 CLX Sedan',
        '1.8 D', '1.8 D HB', '1.8 D Sedan',
        '1.8 Zetec GL HB', '1.8 Zetec GL Sedan',
        '1.8 Zetec GLX HB', '1.8 Zetec GLX Sedan'
      );
    }
  }
  return unique(values);
}

const originalGetOptions = VehicleResolver.prototype.getOptions;
VehicleResolver.prototype.getOptions = function patchedGetOptions(selection = {}, field) {
  if (field === 'make') return makeOptions(selection);
  if (field === 'model') return modelOptions(selection);
  if (field === 'engine') return variantOptions(selection);

  const raw = originalGetOptions.call(this, selection, field);
  return Array.isArray(raw) ? raw : Array.from(raw || []);
};

window.__turkeyVehicleCatalogFix = {
  nonPassengerMakes: NON_PASSENGER_MAKES.size,
  currentTurkeyModelCount: currentTurkeyModelKeys.size,
  verifiedTurkeyModelCount: turkeyVerifiedModelKeys.size,
  explicitFallbackMakes: [...VERIFIED_TURKEY_PASSENGER_MODELS.keys()],
  aliases: MAKE_ALIASES.size,
};
