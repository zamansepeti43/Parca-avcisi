import { requireSupabase, supabaseConfigured } from './supabase.js';

const normalize = (value) => String(value ?? '')
  .trim()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('tr-TR');

function parseVehicleLabel(label) {
  const parts = String(label || '').split('·').map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2) return null;

  const make = parts[0];
  const model = parts[1];
  const yearPart = parts.find((part) => /^\d{4}$/.test(part));
  const year = yearPart ? Number(yearPart) : null;
  const engine = parts.find((part) => ![make, model, yearPart].includes(part) && /\d/.test(part)) || '';

  return { make, model, year, engine };
}

function yearMatches(vehicle, year) {
  if (!year) return true;
  const from = Number(vehicle?.year_from);
  const to = Number(vehicle?.year_to);
  if (!Number.isFinite(from) && !Number.isFinite(to)) return false;
  if (Number.isFinite(from) && Number.isFinite(to)) return year >= from && year <= to;
  return year === (Number.isFinite(from) ? from : to);
}

function engineMatches(vehicle, engine) {
  if (!engine) return true;
  const actual = normalize(vehicle?.engine);
  const wanted = normalize(engine);
  if (!actual || !wanted) return false;
  return actual === wanted || actual.includes(wanted) || wanted.includes(actual);
}

async function linkListingVehicle(listing) {
  if (!listing?.id || !listing.vehicle) return false;
  const parsed = parseVehicleLabel(listing.vehicle);
  if (!parsed) return false;

  const client = requireSupabase();
  const { data: existing, error: existingError } = await client
    .from('listing_vehicles')
    .select('vehicle_id')
    .eq('listing_id', listing.id)
    .limit(1);
  if (existingError || existing?.length) return false;

  let query = client
    .from('vehicles')
    .select('id, make, model, year_from, year_to, engine')
    .ilike('make', parsed.make)
    .ilike('model', parsed.model)
    .limit(50);

  const { data: vehicles, error } = await query;
  if (error || !vehicles?.length) return false;

  const matches = vehicles.filter((vehicle) => yearMatches(vehicle, parsed.year) && engineMatches(vehicle, parsed.engine));
  if (matches.length !== 1) return false;

  const { error: insertError } = await client
    .from('listing_vehicles')
    .insert({ listing_id: listing.id, vehicle_id: matches[0].id });

  return !insertError;
}

let running = false;
async function repairLatestListings() {
  if (running || !supabaseConfigured) return;
  running = true;
  try {
    const client = requireSupabase();
    const { data: authData } = await client.auth.getUser();
    if (!authData?.user) return;

    const { data: listings } = await client
      .from('listings')
      .select('id, vehicle, created_at')
      .eq('seller_id', authData.user.id)
      .not('vehicle', 'is', null)
      .order('created_at', { ascending: false })
      .limit(8);

    for (const listing of listings || []) {
      await linkListingVehicle(listing);
    }
  } catch {
    // Compatibility linking is additive and non-blocking. Never break listing creation.
  } finally {
    running = false;
  }
}

document.addEventListener('parca:listings-updated', () => {
  window.setTimeout(repairLatestListings, 0);
});
