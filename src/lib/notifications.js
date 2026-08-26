import { requireSupabase, supabaseConfigured } from './supabase.js';

const MAX_VISIBLE_NOTIFICATIONS = 10;

export async function getNotifications() {
  if (!supabaseConfigured) return [];
  const client = requireSupabase();
  const { data: authData } = await client.auth.getUser();
  if (!authData.user) return [];
  const { data, error } = await client.from('notifications').select('*').eq('user_id', authData.user.id).order('created_at', { ascending: false }).limit(MAX_VISIBLE_NOTIFICATIONS);
  if (error) throw error;
  return data || [];
}

export async function getUnreadNotificationsCount() {
  if (!supabaseConfigured) return 0;
  const client = requireSupabase();
  const { data: authData } = await client.auth.getUser();
  if (!authData.user) return 0;
  const { count, error } = await client.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', authData.user.id).is('read_at', null);
  if (error) throw error;
  return count || 0;
}

export async function markNotificationsRead(ids) {
  if (!supabaseConfigured || !ids.length) return;
  const { error } = await requireSupabase().from('notifications').update({ read_at: new Date().toISOString() }).in('id', ids).is('read_at', null);
  if (error) throw error;
}

export async function markAllNotificationsRead() {
  if (!supabaseConfigured) return;
  const client = requireSupabase();
  const { data: authData } = await client.auth.getUser();
  if (!authData.user) return;
  const { error } = await client.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', authData.user.id).is('read_at', null);
  if (error) throw error;
}

export async function deleteNotification(id) {
  if (!supabaseConfigured || !id) return;
  const client = requireSupabase();
  const { data: authData } = await client.auth.getUser();
  if (!authData.user) return;
  const { error } = await client.from('notifications').delete().eq('id', id).eq('user_id', authData.user.id);
  if (error) throw error;
}

export async function deleteAllNotifications() {
  if (!supabaseConfigured) return;
  const client = requireSupabase();
  const { data: authData } = await client.auth.getUser();
  if (!authData.user) return;
  const { error } = await client.from('notifications').delete().eq('user_id', authData.user.id);
  if (error) throw error;
}

// Account center renders notifications dynamically. Add delete controls without
// changing its existing rendering/event flow.
if (typeof document !== 'undefined') {
  const install = () => {
    const root = document.querySelector('#modalContent');
    if (!root || root.__notificationDeleteControls) return;
    root.__notificationDeleteControls = true;
    const decorate = () => {
      root.querySelectorAll('.notif-row[data-notif]').forEach((row) => {
        const actions = row.querySelector('.pane-actions');
        if (!actions || actions.querySelector('[data-delete-notif]')) return;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'danger';
        button.dataset.deleteNotif = row.dataset.notif;
        button.textContent = 'Sil';
        actions.appendChild(button);
      });
      const head = root.querySelector('.account-pane-head');
      if (head && root.querySelector('.notif-row') && !head.querySelector('[data-delete-all-notifs]')) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'pane-btn danger';
        button.dataset.deleteAllNotifs = 'true';
        button.textContent = 'Bildirimleri Sil';
        head.appendChild(button);
      }
    };
    new MutationObserver(decorate).observe(root, { childList: true, subtree: true });
    decorate();
    root.addEventListener('click', async (event) => {
      const one = event.target.closest('[data-delete-notif]');
      if (one) {
        event.preventDefault();
        event.stopPropagation();
        try { await deleteNotification(one.dataset.deleteNotif); one.closest('.notif-row')?.remove(); if (window.__refreshNotifBadge) window.__refreshNotifBadge(); }
        catch (error) { window.alert(error.message || 'Bildirim silinemedi.'); }
        return;
      }
      const all = event.target.closest('[data-delete-all-notifs]');
      if (all) {
        event.preventDefault();
        event.stopPropagation();
        if (!window.confirm('Tüm bildirimlerini silmek istediğine emin misin?')) return;
        try { await deleteAllNotifications(); root.querySelectorAll('.notif-row').forEach((row) => row.remove()); all.remove(); if (window.__refreshNotifBadge) window.__refreshNotifBadge(); }
        catch (error) { window.alert(error.message || 'Bildirimler silinemedi.'); }
      }
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true }); else install();
}
