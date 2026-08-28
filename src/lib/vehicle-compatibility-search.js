import { requireSupabase, supabaseConfigured } from './supabase.js';
import { toListingCard } from './listings.js';

const VIN_LENGTH = 17;

function clean(value) { return String(value || '').trim(); }
function normalizeVin(value) { return clean(value).replace(/\s+/g, '').toUpperCase(); }
function isVin(value) { return /^[A-HJ-NPR-Z0-9]{17}$/.test(normalizeVin(value)); }

async function decodeVin(vin) {
  const normalized = normalizeVin(vin);
  if (!isVin(normalized)) return null;
  const response = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${encodeURIComponent(normalized)}?format=json`);
  if (!response.ok) throw new Error('Şase/VIN çözümleme servisine ulaşılamadı.');
  const payload = await response.json();
  const row = payload?.Results?.[0];
  if (!row) return null;
  return {
    make: clean(row.Make),
    model: clean(row.Model),
    year: Number(row.ModelYear) || null,
    engine: clean(row.EngineModel || row.DisplacementL),
    vin: normalized,
  };
}

export async function resolveVehicleIdentifier({ identifier = '', make = '', model = '', year = null, engine = '' } = {}) {
  const value = clean(identifier);
  if (isVin(value)) {
    const decoded = await decodeVin(value);
    if (decoded?.make && decoded?.model) return decoded;
  }
  return {
    make: clean(make),
    model: clean(model),
    year: Number(year) || null,
    engine: clean(engine),
    identifier: value,
  };
}

export async function searchCompatibleListings({ identifier = '', make = '', model = '', year = null, engine = '', limit = 48 } = {}) {
  if (!supabaseConfigured) return [];
  const vehicle = await resolveVehicleIdentifier({ identifier, make, model, year, engine });
  const { data, error } = await requireSupabase().rpc('search_compatible_listings', {
    p_make: vehicle.make || null,
    p_model: vehicle.model || null,
    p_year: vehicle.year || null,
    p_engine: vehicle.engine || null,
    p_limit: Math.min(Math.max(Number(limit) || 48, 1), 100),
  });
  if (error) throw error;
  return (data || []).map(toListingCard);
}

export { isVin };
