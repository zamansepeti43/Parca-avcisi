import { vehicleCatalog } from './vehicle-catalog.js';
import { VehicleResolver } from './vehicle-resolver.js';

// Catalog hygiene for the Turkey-facing selector. The TSB list also contains
// buses, trucks, body builders, RVs and industrial/special-use manufacturers.
// These must not leak into the passenger-car selector as ordinary car makes.
const NON_PASSENGER_MAKES = new Set([
  'ADRIA','AKIA','ALKE','AR-BUS','ASTRA','AVIA','BOZANKAYA','BREDAMENARIBUS','CARTHAGO',
  'CRRC','DAF','EMT','ETRUSCO','FEST','FOTON','GAZ','GROVE','GULERYUZ','HABAS','HBS','HISCAR',
  'HOBBY','HYMER','ISOBUS','IRIZAR','KAMAZ','KARSAN','KENWORTH','KNAUS','KOMI','LAIKA',
  'MAN','MENARINIBUS','MILLER','MOTORSIKLET','MULTICAR','NEOPLAN','NIEVE','OTOKAR/MAGIRUS',
  'OTOYOL\\IVECO\\FIAT','PIMAKINA','SAME','SANY','SCANIA','SCHMIDT','SETRA','SINOTRUK','SITRAK',
  'SOLARIS','TADANO FAUN','TATRA','TCV','TEMSA','TENAX','TEZELLER','TURKAR','TURKKAR','VEICOLI',
  'WEINSBERG','WMA','ZIRAI TRAKTOR','ZOOMLION'
]);

const norm = (v) => String(v ?? '').trim().toLocaleUpperCase('tr-TR');
const unique = (values) => [...new Set((values || []).flatMap((v) => Array.isArray(v) ? v : [v]).filter(Boolean).map(String))]
  .sort((a, b) => a.localeCompare(b, 'tr', { numeric: true }));

function yearMatches(row, year) {
  if (!year) return true;
  const y = Number(year);
  if (!Number.isFinite(y)) return true;
  if (Array.isArray(row.years) && row.years.length) return row.years.map(Number).includes(y);
  const from = Number(row.year_from);
  const to = Number(row.year_to ?? row.year_from);
  return Number.isFinite(from) ? y >= from && y <= (Number.isFinite(to) ? to : from) : true;
}

function turkeyRows(selection = {}) {
  return (Array.isArray(vehicleCatalog) ? vehicleCatalog : []).filter((row) => {
    if (NON_PASSENGER_MAKES.has(norm(row.make)) && (!selection.type || selection.type === 'Otomobil')) return false;
    if (selection.type && (row.type || row.vehicle_type) !== selection.type) return false;
    if (selection.make && row.make !== selection.make) return false;
    if (selection.model && row.model !== selection.model) return false;
    return true;
  });
}

function variantOptions(selection) {
  const rows = turkeyRows(selection).filter((row) => yearMatches(row, selection.year));
  const values = rows.flatMap((row) => [
    ...(row.trims || []),
    ...(row.engines || []),
    ...(row.engineDetails || []).flatMap((detail) => [detail.name, detail.label, detail.engine, detail.version, detail.trim]),
  ]);

  // Verified legacy Turkey-market naming used for the 1997 Escort selector.
  // Keep these as a compatibility layer until the variant feed is populated.
  if (norm(selection.make) === 'FORD' && norm(selection.model) === 'ESCORT' && String(selection.year) === '1997') {
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
  if (field === 'engine') return variantOptions(selection);
  const raw = originalGetOptions.call(this, selection, field);
  const options = Array.isArray(raw) ? raw : Array.from(raw || []);
  if (field === 'make' && (!selection.type || selection.type === 'Otomobil')) {
    return options.filter((make) => !NON_PASSENGER_MAKES.has(norm(make)));
  }
  return options;
};

window.__turkeyVehicleCatalogFix = { nonPassengerMakes: NON_PASSENGER_MAKES.size };
