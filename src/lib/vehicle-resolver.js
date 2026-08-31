import { optionsFor, vehicleCatalog } from './vehicle-catalog.js';

export class CatalogProvider {
  getOptions(selection, field) {
    return optionsFor(selection, field);
  }

  resolve(selection = {}) {
    const norm = (value) => String(value ?? '').trim().toLocaleLowerCase('tr-TR');
    const matches = (value, expected) => !expected || norm(value) === norm(expected);
    return (vehicleCatalog || []).find((item) =>
      matches(item.type || item.vehicle_type, selection.type) &&
      matches(item.make, selection.make) &&
      matches(item.model, selection.model) &&
      matches(item.year, selection.year) &&
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
