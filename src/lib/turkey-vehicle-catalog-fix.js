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

// Turkey-market evidence is promoted to the MODEL FAMILY level. Individual
// variant rows may come from enrichment feeds, but a model family is allowed when
// it is present in either our Turkey seed/FleetByte data or the current Turkey
// market registry generated weekly from the public 2026 Turkey model reference.
const TURKEY_MODEL_PROVENANCE = new Set(['ParcaAvcisiLegacy', 'FleetByte']);

// Verified Turkey Ford passenger model families. This is deliberately a model
// family list, not a trim/engine list. It is a safety net for historically common
// Ford families that may be absent from a particular upstream feed.
const VERIFIED_TURKEY_PASSENGER_MODELS = new Map([
  ['FORD', new Set([
    'B-MAX', 'C-MAX', 'ESCORT', 'FIESTA', 'FOCUS', 'FUSION', 'GALAXY', 'GRAND C-MAX',
    'KA', 'MONDEO', 'MUSTANG', 'S-MAX', 'FESTIVA', 'GRANADA', 'PUMA', 'SCORPIO',
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

function hasTurkeyModelProvenance(row) {
  return Array.isArray(row.provenance) && row.provenance.some((source) => TURKEY_MODEL_PROVENANCE.has(source));
}

function registryModelKeys() {
  const keys = new Set();
  for (const entry of Array.isArray(turkeyCurrentModelRegistry) ? turkeyCurrentModelRegistry : []) {
    const make = canonicalMake(entry.make);
    for (const model of (entry.models || [])) {
      keys.add(`${norm(make)}::${modelKey(model)}`);
    }
  }
  return keys;
}

const currentTurkeyModelKeys = registryModelKeys();

// Build the verified Turkey model-family set once. A model is trusted when at least
// one row for that make/model carries Turkey provenance. Current-market registry
// entries are an additional independent Turkey signal.
const turkeyVerifiedModelKeys = new Set(currentTurkeyModelKeys);
for (const row of (Array.isArray(vehicleCatalog) ? vehicleCatalog : [])) {
  const type = cleanLabel(row.type || row.vehicle_type);
  if (type && type !== 'Otomobil') continue;
  if (hasTurkeyModelProvenance(row)) {
    turkeyVerifiedModelKeys.add(`${norm(canonicalMake(row.make))}::${modelKey(row.model)}`);
  }
}

function isVerifiedTurkeyModel(row) {
  const make = canonicalMake(row.make);
  const key = `${norm(make)}::${modelKey(row.model)}`;
  if (turkeyVerifiedModelKeys.has(key)) return true;

  const explicit = VERIFIED_TURKEY_PASSENGER_MODELS.get(norm(make));
  return Boolean(explicit?.has(modelKey(row.model)));
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
  return unique(turkeyRows(selection).map((row) => row.model));
}

function variantOptions(selection = {}) {
  const rows = turkeyRows(selection).filter((row) => yearMatches(row, selection.year));
  const values = rows.flatMap((row) => [
    ...(row.trims || []),
    ...(row.engines || []),
    ...(row.engineDetails || []).flatMap((detail) => [
      detail.name, detail.label, detail.engine, detail.version, detail.trim,
    ]),
  ]);

  // Compatibility layer for the known Turkey-market 1997 Escort naming.
  if (sameMake(selection.make, 'Ford') && modelKey(selection.model) === 'ESCORT' && String(selection.year) === '1997') {
    values.push(
      '1.3 CLX HB', '1.3 CLX Sedan',
      '1.6 C HB', '1.6 C Sedan',
      '1.6 CLX HB', '1.6 CLX Sedan',
      '1.8 D HB', '1.8 D Sedan',
      '1.8 Zetec GL HB', '1.8 Zetec GL Sedan',
      '1.8 Zetec GLX HB', '1.8 Zetec GLX Sedan'
    );
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
  turkeyModelProvenance: [...TURKEY_MODEL_PROVENANCE],
  explicitFallbackMakes: [...VERIFIED_TURKEY_PASSENGER_MODELS.keys()],
  aliases: MAKE_ALIASES.size,
};
