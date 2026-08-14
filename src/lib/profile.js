import { requireSupabase, supabaseConfigured } from './supabase.js';

export async function getMyProfile() {
  if (!supabaseConfigured) return null;
  const client = requireSupabase();
  const { data: authData } = await client.auth.getUser();
  if (!authData.user) return null;
  const { data, error } = await client
    .from('profiles')
    .select('id, full_name, phone, city, avatar_url, role, settings')
    .eq('id', authData.user.id)
    .maybeSingle();
  if (error) throw error;
  return data;
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

export async function getProfileById(id) {
  if (!supabaseConfigured || !id) return null;
  const { data, error } = await requireSupabase()
    .from('profiles')
    .select('id, full_name, phone, city, avatar_url, role, created_at, settings')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
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

export async function updateProfile({ fullName, phone, city, avatarUrl, settings }) {
  const client = requireSupabase();
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) throw new Error('Giriş yapmalısın.');

  const payload = { id: authData.user.id, full_name: fullName };
  if (phone !== undefined) payload.phone = phone || null;
  if (city !== undefined) payload.city = city || null;
  if (avatarUrl !== undefined) payload.avatar_url = avatarUrl || null;
  if (settings !== undefined) payload.settings = settings;

  const { error } = await client.from('profiles').upsert(payload);
  if (error) throw error;
}
