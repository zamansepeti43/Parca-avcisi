import { requireSupabase, supabaseConfigured } from './supabase.js';

const defaults = { memberCount: 0, freeMemberTarget: 1000, monetizationEnabled: false };

export async function getPlatformStatus() {
  if (!supabaseConfigured) return defaults;
  const { data, error } = await requireSupabase().rpc('get_platform_status');
  if (error || !data?.[0]) return defaults;
  const row = data[0];
  return {
    memberCount: Number(row.member_count) || 0,
    freeMemberTarget: Number(row.free_member_target) || 1000,
    monetizationEnabled: Boolean(row.monetization_enabled),
  };
}

window.__parcaPlatform = { getPlatformStatus };
