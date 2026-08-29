import catalog from '../../data/vehicle-catalog-merged.json';

const rows = Array.isArray(catalog) ? catalog : (catalog?.vehicles ?? catalog?.records ?? []);
const clean = (value) => String(value ?? '').trim();
const unique = (values) => [...new Set(values.map(clean).filter(Boolean))];

export const vehicleTypes = rows;

export function getMakes() {
  return unique(rows.map((row) => row.make ?? row.brand ?? row.marka));
}

export function getModels(make) {
  const wanted = clean(make);
  return unique(rows.filter((row) => clean(row.make ?? row.brand ?? row.marka) === wanted).map((row) => row.model ?? row.name ?? row.seri));
}

export function getYears(make, model) {
  const wantedMake = clean(make);
  const wantedModel = clean(model);
  return unique(rows.filter((row) => clean(row.make ?? row.brand ?? row.marka) === wantedMake && clean(row.model ?? row.name ?? row.seri) === wantedModel).map((row) => row.year ?? row.yil)).sort((a, b) => Number(a) - Number(b));
}

export function getVehicleVariants(make, model, year) {
  const wantedMake = clean(make);
  const wantedModel = clean(model);
  return rows.filter((row) => clean(row.make ?? row.brand ?? row.marka) === wantedMake && clean(row.model ?? row.name ?? row.seri) === wantedModel && (!year || String(row.year ?? row.yil ?? '') === String(year))).map((row) => ({
    year: row.year ?? row.yil ?? null,
    body: row.body ?? row.body_style ?? row.kasa ?? null,
    engine: row.engine ?? row.motor ?? null,
    fuel: row.fuel ?? row.yakit ?? null,
    transmission: row.transmission ?? row.sanziman ?? null,
    trim: row.trim ?? row.package ?? row.paket ?? row.donanim ?? null,
  }));
}
