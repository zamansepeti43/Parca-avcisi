import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(url && anonKey);

export const supabase = supabaseConfigured
  ? createClient(url, anonKey)
  : null;

export function requireSupabase() {
  if (!supabase) {
    throw new Error('Supabase yapılandırılmamış. VITE_SUPABASE_URL ve VITE_SUPABASE_ANON_KEY tanımlayın.');
  }
  return supabase;
}
