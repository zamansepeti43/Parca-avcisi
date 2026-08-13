import { requireSupabase, supabaseConfigured } from './supabase.js';

export async function getFavoriteListingIds() {
  if (!supabaseConfigured) return [];
  const client = requireSupabase();
  const { data: authData } = await client.auth.getUser();
  if (!authData.user) return [];
  const { data, error } = await client.from('favorites').select('listing_id').eq('user_id', authData.user.id);
  if (error) throw error;
  return data.map(({ listing_id: listingId }) => listingId);
}

export async function toggleFavorite(listingId) {
  const client = requireSupabase();
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) throw new Error('Favorilere eklemek için giriş yapmalısın.');

  const { data: existing, error: findError } = await client
    .from('favorites')
    .select('listing_id')
    .eq('user_id', authData.user.id)
    .eq('listing_id', listingId)
    .maybeSingle();
  if (findError) throw findError;

  if (existing) {
    const { error } = await client.from('favorites').delete().eq('user_id', authData.user.id).eq('listing_id', listingId);
    if (error) throw error;
    return false;
  }
  const { error } = await client.from('favorites').insert({ user_id: authData.user.id, listing_id: listingId });
  if (error) throw error;
  return true;
}
