import { requireSupabase, supabaseConfigured } from './supabase.js';

export async function getSavedSearches() {
  if (!supabaseConfigured) return [];
  const client = requireSupabase();
  const { data: authData } = await client.auth.getUser();
  if (!authData.user) return [];
  const { data, error } = await client
    .from('saved_searches')
    .select('*')
    .eq('user_id', authData.user.id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createSavedSearch(fields) {
  const client = requireSupabase();
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) throw new Error('Kayıtlı arama oluşturmak için giriş yapmalısın.');
  const { error } = await client.from('saved_searches').insert({ user_id: authData.user.id, ...fields });
  if (error) throw error;
}

export async function updateSavedSearch(id, fields) {
  const client = requireSupabase();
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) throw new Error('Giriş yapmalısın.');
  const { error } = await client.from('saved_searches').update(fields).eq('id', id).eq('user_id', authData.user.id);
  if (error) throw error;
}

export async function deleteSavedSearch(id) {
  const client = requireSupabase();
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) throw new Error('Giriş yapmalısın.');
  const { error } = await client.from('saved_searches').delete().eq('id', id).eq('user_id', authData.user.id);
  if (error) throw error;
}
