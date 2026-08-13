import { optionsFor } from './vehicle-catalog.js';

export class CatalogProvider {
  getOptions(selection, field) {
    return optionsFor(selection, field);
  }
}

export class VehicleResolver {
  constructor(provider = new CatalogProvider()) {
    this.provider = provider;
  }
  getOptions(selection, field) {
    return this.provider.getOptions(selection, field);
  }
}

// Deliberately not implemented: VIN decoding is a future provider, never a browser-side key.
export class VinResolver {
  async resolve() {
    throw new Error('VIN çözümleme henüz etkin değil.');
  }
}
