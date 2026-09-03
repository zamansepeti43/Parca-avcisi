import { optionsFor, vehicleCatalog } from './vehicle-catalog.js';

const normalize = (value) => String(value ?? '')
  .trim()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleUpperCase('tr-TR');

// TSB vehicle data is broader than passenger cars. These manufacturers are
// buses, trucks, body builders, RVs, tractors or industrial/special-use
// entries and must not appear under the passenger-car selector.
const NON_PASSENGER_MAKES = new Set([
  'ADRIA','AKIA','ALKE','AR-BUS','ASTRA','AVIA','BOZANKAYA','BREDAMENARIBUS','CARTHAGO',
  'CRRC','DAF','EMT','ETRUSCO','FEST','FOTON','GAZ','GROVE','GULERYUZ','HABAS','HBS','HISCAR',
  'HOBBY','HYMER','ISOBUS','IRIZAR','KAMAZ','KARSAN','KENWORTH','KNAUS','KOMI','LAIKA',
  'MAN','MENARINIBUS','MILLER','MOTORSIKLET','MULTICAR','NEOPLAN','NIEVE','OTOKAR/MAGIRUS',
  'OTOYOL\\IVECO\\FIAT','PIMAKINA','SAME','SANY','SCANIA','SCHMIDT','SETRA','SINOTRUK','SITRAK',
  'SOLARIS','TADANO FAUN','TATRA','TCV','TEMSA','TENAX','TEZELLER','TURKAR','TURKKAR','VEICOLI',
  'WEINSBERG','WMA','ZIRAI TRAKTOR','ZOOMLION'
]);

const LEGACY_OR_TURKEY_PROVENANCE = new Set(['ParcaAvcisiLegacy', 'FleetByte']);

const isPassenger = (selection = {}) => !selection.type || selection.type === 'Otomobil';
const isTrustedTurkeyRow = (row) => {
  const provenance = Array.isArray(row?.provenance) ? row.provenance : [];
  return provenance.some((source) => LEGACY_OR_TURKEY_PROVENANCE.has(source));
};

function yearMatches(row, year) {
  if (!year) return true;
  const y = Number(year);
  if (!Number.isFinite(y)) return true;

  if (Array.isArray(row?.years) && row.years.length) {
    return row.years.map(Number).includes(y);
  }

  const from = Number(row?.year_from ?? row?.yearStart ?? row?.from ?? row?.year);
  const to = Number(row?.year_to ?? row?.yearEnd ?? row?.to ?? row?.year);
  if (!Number.isFinite(from)) return true;
  return y >= from && y <= (Number.isFinite(to) ? to : from);
}

function rowsFor(selection = {}) {
  let rows = Array.isArray(vehicleCatalog) ? vehicleCatalog : [];

  if (selection.type) {
    rows = rows.filter((row) => (row.type || row.vehicle_type) === selection.type);
  }
  if (selection.make) {
    const makeKey = normalize(selection.make);
    rows = rows.filter((row) => normalize(row.make) === makeKey);
  }
  if (selection.model) {
    const modelKey = normalize(selection.model);
    rows = rows.filter((row) => normalize(row.model) === modelKey);
  }
  if (selection.year) {
    rows = rows.filter((row) => yearMatches(row, selection.year));
  }

  if (isPassenger(selection)) {
    rows = rows.filter((row) => !NON_PASSENGER_MAKES.has(normalize(row.make)));

    // For a make that has Turkey-specific data, do not leak model names that
    // exist only in generic/global feeds (InformationCar / VehiclesDB).
    // Legacy seed is kept so historical Turkish cars such as Tofaş remain.
    const trustedForMake = rows.some(isTrustedTurkeyRow);
    if (trustedForMake) rows = rows.filter(isTrustedTurkeyRow);
  }

  return rows;
}

function canonicalLabel(value) {
  const key = normalize(value);
  const preferred = {
    CITROEN: 'Citroën',
    MERCEDES: 'Mercedes-Benz',
    'KGMOBILITY': 'KGMobility'
  };
  return preferred[key] || String(value ?? '').trim();
}

function uniqueOptions(values) {
  const map = new Map();
  for (const value of values || []) {
    const text = String(value ?? '').trim();
    if (!text) continue;
    const key = normalize(text);
    if (!map.has(key)) map.set(key, canonicalLabel(text));
  }
  return [...map.values()].sort((a, b) => a.localeCompare(b, 'tr', { numeric: true }));
}

export class CatalogProvider {
  getOptions(selection = {}, field) {
    if (field === 'type') return uniqueOptions(optionsFor(selection, field));

    if (field === 'make') {
      return uniqueOptions(rowsFor(selection).map((row) => row.make));
    }

    if (field === 'model') {
      return uniqueOptions(rowsFor(selection).map((row) => row.model));
    }

    if (field === 'year') {
      const rows = rowsFor(selection);
      const years = rows.flatMap((row) => {
        if (Array.isArray(row?.years) && row.years.length) return row.years;
        const from = Number(row?.year_from ?? row?.yearStart ?? row?.from ?? row?.year);
        const to = Number(row?.year_to ?? row?.yearEnd ?? row?.to ?? row?.year ?? from);
        if (!Number.isFinite(from)) return [];
        const out = [];
        for (let year = from; year <= (Number.isFinite(to) ? to : from); year += 1) out.push(year);
        return out;
      });
      return uniqueOptions(years).sort((a, b) => Number(a) - Number(b));
    }

    if (field === 'engine') {
      const rows = rowsFor(selection);
      const values = rows.flatMap((row) => [
        ...(Array.isArray(row?.engines) ? row.engines : []),
        ...(Array.isArray(row?.trims) ? row.trims : []),
        ...(Array.isArray(row?.engineDetails) ? row.engineDetails.flatMap((detail) => [
          detail?.name, detail?.label, detail?.engine, detail?.version, detail?.trim
        ]) : [])
      ]);
      return uniqueOptions(values);
    }

    return optionsFor(selection, field);
  }

  resolve(selection = {}) {
    const matches = (value, expected) => !expected || normalize(value) === normalize(expected);
    return (vehicleCatalog || []).find((item) =>
      matches(item.type || item.vehicle_type, selection.type) &&
      matches(item.make, selection.make) &&
      matches(item.model, selection.model) &&
      yearMatches(item, selection.year) &&
      matches(item.engine || item.version || item.trim, selection.engine)
    ) || null;
  }
}

export class VehicleResolver {
  constructor(provider = new CatalogProvider()) {
    this.provider = provider;
  }
  getOptions(selection, field) {
    return this.provider.getOptions(selection, field);
  }
  resolve(selection) {
    return this.provider.resolve(selection);
  }
}

// Deliberately not implemented: VIN decoding is a future provider, never a browser-side key.
export class VinResolver {
  async resolve() {
    throw new Error('VIN çözümleme henüz etkin değil.');
  }
}
