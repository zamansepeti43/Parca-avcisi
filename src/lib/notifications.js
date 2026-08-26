import { requireSupabase, supabaseConfigured } from './supabase.js';

const MAX_VISIBLE_NOTIFICATIONS = 10;

export async function getNotifications() {
  if (!supabaseConfigured) return [];
  const client = requireSupabase();
  const { data: authData } = await client.auth.getUser();
  if (!authData.user) return [];
  const { data, error } = await client
    .from('notifications')
    .select('*')
    .eq('user_id', authData.user.id)
    .order('created_at', { ascending: false })
    .limit(MAX_VISIBLE_NOTIFICATIONS);
  if (error) throw error;
  return data || [];
}

export async function getUnreadNotificationsCount() {
  if (!supabaseConfigured) return 0;
  const client = requireSupabase();
  const { data: authData } = await client.auth.getUser();
  if (!authData.user) return 0;
  const { count, error } = await client
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', authData.user.id)
    .is('read_at', null);
  if (error) throw error;
  return count || 0;
}

export async function markNotificationsRead(ids) {
  if (!supabaseConfigured || !ids.length) return;
  const { error } = await requireSupabase()
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .in('id', ids)
    .is('read_at', null);
  if (error) throw error;
}

export async function markAllNotificationsRead() {
  if (!supabaseConfigured) return;
  const client = requireSupabase();
  const { data: authData } = await client.auth.getUser();
  if (!authData.user) return;
  const { error } = await client
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', authData.user.id)
    .is('read_at', null);
  if (error) throw error;
}

export async function deleteNotification(id) {
  if (!supabaseConfigured || !id) return;
  const client = requireSupabase();
  const { data: authData } = await client.auth.getUser();
  if (!authData.user) return;
  const { error } = await client
    .from('notifications')
    .delete()
    .eq('id', id)
    .eq('user_id', authData.user.id);
  if (error) throw error;
}

export async function deleteAllNotifications() {
  if (!supabaseConfigured) return;
  const client = requireSupabase();
  const { data: authData } = await client.auth.getUser();
  if (!authData.user) return;
  const { error } = await client
    .from('notifications')
    .delete()
    .eq('user_id', authData.user.id);
  if (error) throw error;
}
