import { requireSupabase, supabaseConfigured } from './supabase.js';
import { getListingImageUrl } from './listing-images.js';

const conditionLabels = { new: 'Sıfır', used: '2. El', salvage: 'Çıkma' };

function vehicleLabel(vehicles = []) {
  const vehicle = vehicles[0]?.vehicle;
  if (!vehicle) return 'Araç uyumluluğu belirtilmemiş';
  const years = [vehicle.year_from, vehicle.year_to].filter(Boolean).join('–');
  return [vehicle.make, vehicle.model, years, vehicle.engine].filter(Boolean).join(' · ');
}

function sortedImages(listing) {
  return (listing.listing_images || [])
    .slice()
    .sort((a, b) => Number(b.is_cover ?? 0) - Number(a.is_cover ?? 0) || (a.sort_order ?? 0) - (b.sort_order ?? 0));
}

export function toListingCard(listing) {
  const images = sortedImages(listing);
  return {
    id: listing.id,
    title: listing.title,
    partName: listing.part?.name || '',
    condition: conditionLabels[listing.condition] || listing.condition,
    category: listing.category || listing.part?.category || 'Oto Parça',
    subcategory: listing.subcategory || listing.part?.subcategory || '',
    price: Number(listing.price),
    city: listing.city || 'Türkiye',
    vehicle: listing.vehicle || vehicleLabel(listing.listing_vehicles),
    seller: listing.seller?.full_name || 'Satıcı',
    sellerId: listing.seller?.id || null,
    status: listing.status || 'active',
    tone: 'engine',
    oem: listing.oem_number || listing.part?.oem_number || '',
    description: listing.description || '',
    coverImage: images[0] ? getListingImageUrl(images[0].storage_path) : null,
  };
}

const listingSelect = 'id, title, description, condition, price, city, district, oem_number, category, subcategory, vehicle, stock_count, status, created_at, part:parts(name, category, subcategory, oem_number), seller:profiles!listings_seller_id_fkey(id, full_name), listing_vehicles(vehicle:vehicles(make, model, year_from, year_to, engine)), listing_images(id, storage_path, sort_order, is_cover)';

export async function getActiveListings() {
  if (!supabaseConfigured) return null;
  const { data, error } = await requireSupabase()
    .from('listings')
    .select(listingSelect)
    .eq('status', 'active')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data.map(toListingCard);
}

export async function getMyListings() {
  if (!supabaseConfigured) return null;
  const client = requireSupabase();
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) return [];
  const { data, error } = await client
    .from('listings')
    .select(listingSelect)
    .eq('seller_id', authData.user.id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data.map(toListingCard);
}

export async function getListingById(id) {
  if (!supabaseConfigured) return null;
  const { data, error } = await requireSupabase()
    .from('listings')
    .select(listingSelect)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const images = sortedImages(data).map((image) => ({
    id: image.id,
    sortOrder: image.sort_order,
    isCover: image.is_cover,
    url: getListingImageUrl(image.storage_path),
  }));
  return {
    ...toListingCard(data),
    description: data.description || '',
    oemNumber: data.oem_number || data.part?.oem_number || '',
    category: data.category || data.part?.category || '',
    subcategory: data.subcategory || data.part?.subcategory || '',
    vehicle: data.vehicle || '',
    createdAt: data.created_at,
    images,
    vehicles: data.listing_vehicles || [],
  };
}

export async function getSellerActiveListings(sellerId, { excludeId } = {}) {
  if (!supabaseConfigured) return [];
  let query = requireSupabase()
    .from('listings')
    .select(listingSelect)
    .eq('seller_id', sellerId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(8);
  if (excludeId) query = query.neq('id', excludeId);
  const { data, error } = await query;
  if (error) throw error;
  return data.map(toListingCard);
}

export async function createListing({ title, description, condition, price, city, district, oemNumber, stockCount = 1, partId, vehicleIds = [], category, subcategory, vehicle, status = 'draft' }) {
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
      category: category || null,
      subcategory: subcategory || null,
      vehicle: vehicle || null,
      stock_count: stockCount,
      status,
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

export async function updateListing(id, fields) {
  const client = requireSupabase();
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) throw new Error('Giriş yapmalısın.');

  const payload = { updated_at: new Date().toISOString() };
  if (fields.title !== undefined) payload.title = fields.title;
  if (fields.description !== undefined) payload.description = fields.description || null;
  if (fields.condition !== undefined) payload.condition = fields.condition;
  if (fields.price !== undefined) payload.price = fields.price;
  if (fields.city !== undefined) payload.city = fields.city || null;
  if (fields.oemNumber !== undefined) payload.oem_number = fields.oemNumber || null;
  if (fields.category !== undefined) payload.category = fields.category || null;
  if (fields.subcategory !== undefined) payload.subcategory = fields.subcategory || null;
  if (fields.vehicle !== undefined) payload.vehicle = fields.vehicle || null;

  const { error } = await client.from('listings').update(payload).eq('id', id).eq('seller_id', authData.user.id);
  if (error) throw error;
}

export async function updateListingStatus(id, status) {
  const client = requireSupabase();
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) throw new Error('Giriş yapmalısın.');
  const { error } = await client
    .from('listings')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('seller_id', authData.user.id);
  if (error) throw error;
}

export async function deleteListing(id) {
  const client = requireSupabase();
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) throw new Error('Giriş yapmalısın.');
  const { error } = await client.from('listings').delete().eq('id', id).eq('seller_id', authData.user.id);
  if (error) throw error;
}
