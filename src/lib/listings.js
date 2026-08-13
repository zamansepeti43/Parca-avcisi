import { requireSupabase, supabaseConfigured } from './supabase.js';

const conditionLabels = { new: 'Sıfır', used: '2. El', salvage: 'Çıkma' };

function vehicleLabel(vehicles = []) {
  const vehicle = vehicles[0]?.vehicle;
  if (!vehicle) return 'Araç uyumluluğu belirtilmemiş';
  const years = [vehicle.year_from, vehicle.year_to].filter(Boolean).join('–');
  return [vehicle.make, vehicle.model, years, vehicle.engine].filter(Boolean).join(' · ');
}

export function toListingCard(listing) {
  return {
    id: listing.id,
    title: listing.title,
    condition: conditionLabels[listing.condition] || listing.condition,
    category: listing.part?.category || 'Oto Parça',
    price: Number(listing.price),
    city: listing.city || 'Türkiye',
    vehicle: vehicleLabel(listing.listing_vehicles),
    seller: listing.seller?.full_name || 'Satıcı',
    tone: 'engine',
  };
}

export async function getActiveListings() {
  if (!supabaseConfigured) return null;
  const { data, error } = await requireSupabase()
    .from('listings')
    .select('id, title, condition, price, city, created_at, part:parts(name, category), seller:profiles!listings_seller_id_fkey(full_name), listing_vehicles(vehicle:vehicles(make, model, year_from, year_to, engine))')
    .eq('status', 'active')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data.map(toListingCard);
}

export async function createListing({ title, description, condition, price, city, district, oemNumber, stockCount = 1, partId, vehicleIds = [] }) {
  const client = requireSupabase();
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) throw new Error('İlan vermek için giriş yapmalısın.');

  const { data: listing, error } = await client
    .from('listings')
    .insert({
      seller_id: authData.user.id,
      part_id: partId || null,
      title,
      description: description || null,
      condition,
      price,
      city: city || null,
      district: district || null,
      oem_number: oemNumber || null,
      stock_count: stockCount,
      status: 'draft',
    })
    .select()
    .single();
  if (error) throw error;

  if (vehicleIds.length) {
    const { error: vehicleError } = await client
      .from('listing_vehicles')
      .insert(vehicleIds.map((vehicleId) => ({ listing_id: listing.id, vehicle_id: vehicleId })));
    if (vehicleError) throw vehicleError;
  }
  return listing;
}
