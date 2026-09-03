import { vehicleCatalog } from './vehicle-catalog.js';
import { VehicleResolver } from './vehicle-resolver.js';

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

// Upstream feeds use small spelling/alias differences. Treat them as one make
// so the selector never shows duplicates such as Citroen + Citroën.
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

const norm = (v) => String(v ?? '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleUpperCase('tr-TR');
const canonicalMake = (v) => MAKE_ALIASES.get(norm(v)) || String(v ?? '').trim();
const sameMake = (a, b) => norm(canonicalMake(a)) === norm(canonicalMake(b));
const cleanLabel = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();
const unique = (values) => [...new Set((values || [])
  .flatMap((v) => Array.isArray(v) ? v : [v])
  .map(cleanLabel)
  .filter(Boolean))]
  .sort((a, b) => a.localeCompare(b, 'tr', { numeric: true }));

function yearMatches(row, year) {
  if (!year) return true;
  const y = Number(year);
  if (!Number.isFinite(y)) return true;
  if (Array.isArray(row.years) && row.years.length) return row.years.map(Number).includes(y);

  const from = Number(row.year_from ?? row.yearStart ?? row.from);
  const to = Number(row.year_to ?? row.yearEnd ?? row.to ?? from);
  if (Number.isFinite(from)) return y >= from && y <= (Number.isFinite(to) ? to : from);

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
    if (NON_PASSENGER_MAKES.has(norm(make)) && (!selection.type || selection.type === 'Otomobil')) return false;
    if (selection.type === 'Otomobil' && !isPassengerRow(row)) return false;
    if (selection.type && cleanLabel(row.type || row.vehicle_type) && cleanLabel(row.type || row.vehicle_type) !== selection.type) return false;
    if (selection.make && !sameMake(row.make, selection.make)) return false;
    if (selection.model && cleanLabel(row.model) !== cleanLabel(selection.model)) return false;
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
  if (sameMake(selection.make, 'Ford') && norm(selection.model) === 'ESCORT' && String(selection.year) === '1997') {
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
  // Own the Turkey-facing make/model chain instead of delegating these fields to
  // the raw merged feed, which is where non-passenger/special-use entries leak in.
  if (field === 'make') return makeOptions(selection);
  if (field === 'model') return modelOptions(selection);
  if (field === 'engine') return variantOptions(selection);

  const raw = originalGetOptions.call(this, selection, field);
  return Array.isArray(raw) ? raw : Array.from(raw || []);
};

window.__turkeyVehicleCatalogFix = {
  nonPassengerMakes: NON_PASSENGER_MAKES.size,
  aliases: MAKE_ALIASES.size,
};
