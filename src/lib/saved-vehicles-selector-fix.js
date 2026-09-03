// Keep the parent "Marka" dropdown complete after a selection.
// The selected make must filter child fields (model/year/version), but it
// must never filter the make list itself. This wrapper preserves the Turkey
// catalog rules from turkey-vehicle-catalog-fix.js and only clears the
// self-referential make/model/year/engine filters for the make lookup.
import './turkey-vehicle-catalog-fix.js';
import { VehicleResolver } from './vehicle-resolver.js';

if (!window.__savedVehiclesMakeSelectorFixed) {
  const originalGetOptions = VehicleResolver.prototype.getOptions;
  VehicleResolver.prototype.getOptions = function fixedMakeOptions(selection = {}, field) {
    if (field === 'make') {
      return originalGetOptions.call(this, {
        ...selection,
        make: '',
        model: '',
        year: '',
        engine: '',
      }, field);
    }
    return originalGetOptions.call(this, selection, field);
  };
  window.__savedVehiclesMakeSelectorFixed = true;
}
