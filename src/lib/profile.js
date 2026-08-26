import { requireSupabase, supabaseConfigured } from './supabase.js';

export async function getMyProfile() {
  if (!supabaseConfigured) return null;
  const client = requireSupabase();
  const { data: authData } = await client.auth.getUser();
  if (!authData.user) return null;

  // `address` was added by a later migration. Keep the profile screen usable
  // against an older database while the additive production sync is applied.
  const baseSelect = 'id, full_name, phone, city, avatar_url, role, settings';
  const { data, error } = await client
    .from('profiles')
    .select(baseSelect + ', address')
    .eq('id', authData.user.id)
    .maybeSingle();

  if (!error) return data;

  const message = String(error.message || '');
  if (!/address|column.*does not exist|schema cache/i.test(message)) throw error;

  const { data: fallback, error: fallbackError } = await client
    .from('profiles')
    .select(baseSelect)
    .eq('id', authData.user.id)
    .maybeSingle();
  if (fallbackError) throw fallbackError;
  return fallback;
}

export async function getProfilesByIds(ids) {
  if (!supabaseConfigured) return [];
  const unique = [...new Set((ids || []).filter(Boolean))];
  if (!unique.length) return [];
  const { data, error } = await requireSupabase()
    .from('profiles')
    .select('id, full_name, phone, city')
    .in('id', unique);
  if (error) throw error;
  return data || [];
}

// Public seller data is intentionally served through a SECURITY DEFINER RPC.
// This prevents listing pages from exposing private profile fields such as
// phone, address or settings through the profiles table.
export async function getProfileById(id) {
  if (!supabaseConfigured || !id) return null;
  const { data, error } = await requireSupabase()
    .rpc('get_public_seller_profile', { p_seller_id: id });
  if (error) throw error;
  return Array.isArray(data) ? (data[0] || null) : data || null;
}

export async function getActiveListingCount(sellerId) {
  if (!supabaseConfigured || !sellerId) return 0;
  const { count, error } = await requireSupabase()
    .from('listings')
    .select('id', { count: 'exact', head: true })
    .eq('seller_id', sellerId)
    .eq('status', 'active');
  if (error) throw error;
  return count || 0;
}

export async function updateProfile({ fullName, phone, city, address, avatarUrl, settings }) {
  const client = requireSupabase();
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) throw new Error('Giriş yapmalısın.');

  const payload = { id: authData.user.id, full_name: fullName };
  if (phone !== undefined) payload.phone = phone || null;
  if (city !== undefined) payload.city = city || null;
  if (address !== undefined) payload.address = address || null;
  if (avatarUrl !== undefined) payload.avatar_url = avatarUrl || null;
  if (settings !== undefined) payload.settings = settings;

  const { error } = await client.from('profiles').upsert(payload);
  if (!error) return;

  // Older live schemas may not have `address` yet. Retry without that optional
  // field so profile edits do not become completely unusable during migration.
  if (address !== undefined && /address|column.*does not exist|schema cache/i.test(String(error.message || ''))) {
    const fallbackPayload = { ...payload };
    delete fallbackPayload.address;
    const { error: fallbackError } = await client.from('profiles').upsert(fallbackPayload);
    if (fallbackError) throw fallbackError;
    return;
  }

  throw error;
}
