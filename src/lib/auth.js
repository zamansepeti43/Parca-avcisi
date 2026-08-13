import { requireSupabase, supabaseConfigured } from './supabase.js';

export async function getCurrentUser() {
  if (!supabaseConfigured) return null;
  const { data, error } = await requireSupabase().auth.getUser();
  if (error) throw error;
  return data.user;
}

export async function signUp({ email, password, fullName }) {
  const { data, error } = await requireSupabase().auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  if (error) throw error;
  return data;
}

export async function signIn({ email, password }) {
  const { data, error } = await requireSupabase().auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  if (!supabaseConfigured) return;
  const { error } = await requireSupabase().auth.signOut();
  if (error) throw error;
}
