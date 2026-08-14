import { requireSupabase, supabaseConfigured } from './supabase.js';

export async function getMyMessages() {
  if (!supabaseConfigured) return [];
  const client = requireSupabase();
  const { data: authData } = await client.auth.getUser();
  if (!authData.user) return [];
  const me = authData.user.id;
  const { data, error } = await client
    .from('messages')
    .select('id, body, read_at, created_at, sender_id, receiver_id, listing:listings(id, title, price, city, status)')
    .or(`sender_id.eq.${me},receiver_id.eq.${me}`)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function sendMessage({ listingId, receiverId, body }) {
  const client = requireSupabase();
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) throw new Error('Mesaj göndermek için giriş yapmalısın.');

  const { data, error } = await client
    .from('messages')
    .insert({ listing_id: listingId, sender_id: authData.user.id, receiver_id: receiverId, body })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function markConversationRead({ listingId, senderId }) {
  if (!supabaseConfigured) return;
  const client = requireSupabase();
  const { data: authData } = await client.auth.getUser();
  if (!authData.user) return;
  const { error } = await client
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('listing_id', listingId)
    .eq('sender_id', senderId)
    .eq('receiver_id', authData.user.id)
    .is('read_at', null);
  if (error) throw error;
}
