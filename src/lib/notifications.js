import { requireSupabase, supabaseConfigured } from './supabase.js';

export async function getNotifications() {
  if (!supabaseConfigured) return [];
  const { data, error } = await requireSupabase()
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
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
