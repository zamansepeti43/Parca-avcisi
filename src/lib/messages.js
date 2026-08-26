import { requireSupabase, supabaseConfigured } from './supabase.js';

const MAX_MESSAGE_HISTORY = 100;
const MAX_MESSAGE_LENGTH = 4000;

export async function getMyMessages() {
  if (!supabaseConfigured) return [];
  const client = requireSupabase();
  const { data: authData } = await client.auth.getUser();
  if (!authData.user) return [];
  const me = authData.user.id;
  const { data, error } = await client
    .from('messages')
    .select('id, body, read_at, created_at, sender_id, receiver_id, listing:listings(id, title, price, city, status), request:part_requests(id, part_name, part_category, city, status)')
    .or(`sender_id.eq.${me},receiver_id.eq.${me}`)
    .order('created_at', { ascending: false })
    .limit(MAX_MESSAGE_HISTORY);
  if (error) throw error;
  return data || [];
}

export async function sendMessage({ listingId, requestId, receiverId, body }) {
  const client = requireSupabase();
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) throw new Error('Mesaj göndermek için giriş yapmalısın.');

  const cleanBody = String(body || '').trim();
  if (!cleanBody) throw new Error('Mesaj boş olamaz.');
  if (cleanBody.length > MAX_MESSAGE_LENGTH) throw new Error('Mesaj en fazla ' + MAX_MESSAGE_LENGTH + ' karakter olabilir.');
  if (!receiverId || receiverId === authData.user.id) throw new Error('Geçerli bir alıcı seçmelisin.');

  const payload = { sender_id: authData.user.id, receiver_id: receiverId, body: cleanBody };
  if (requestId) payload.request_id = requestId;
  if (listingId) payload.listing_id = listingId;

  const { data, error } = await client
    .from('messages')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function markConversationRead({ listingId, requestId, senderId }) {
  if (!supabaseConfigured) return;
  const client = requireSupabase();
  const { data: authData } = await client.auth.getUser();
  if (!authData.user) return;
  let query = client
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('sender_id', senderId)
    .eq('receiver_id', authData.user.id)
    .is('read_at', null);
  if (requestId) query = query.eq('request_id', requestId);
  else query = query.eq('listing_id', listingId);
  const { error } = await query;
  if (error) throw error;
}
