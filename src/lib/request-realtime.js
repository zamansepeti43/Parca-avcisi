import { supabase, supabaseConfigured } from './supabase.js';

let channel = null;

// Live refresh for the request panes ("Müşterilerin Aradığı Parçalar" /
// "Taleplerim"). New requests and new "Bende Var" responses dispatch
// `parca:requests-updated`, the same event account-center.js already listens to.
// Degrades gracefully: no-op when Supabase is not configured, and the channel is
// created inside try/catch so a missing table/publication never breaks the app.
// Requires the supabase_realtime publication entries added by
// 20260817_notify_part_request_created.sql.
export function initRequestRealtime() {
  if (!supabaseConfigured || !supabase) return () => {};
  try {
    channel = supabase
      .channel('part-requests-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'part_requests' }, () => {
        window.dispatchEvent(new CustomEvent('parca:requests-updated'));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'part_request_responses' }, () => {
        window.dispatchEvent(new CustomEvent('parca:requests-updated'));
      })
      .subscribe();
  } catch (error) {
    console.warn('Parça talepleri canlı takibi başlatılamadı', error);
  }
  return () => {
    if (channel && supabase) {
      supabase.removeChannel(channel);
      channel = null;
    }
  };
}
