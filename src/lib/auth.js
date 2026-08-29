import { requireSupabase, supabaseConfigured } from './supabase.js';

export async function getCurrentUser() {
  if (!supabaseConfigured) return null;
  const { data, error } = await requireSupabase().auth.getUser();
  if (error) throw error;
  return data.user;
}

export async function signUp({ email, password, fullName, phone, address, captchaToken }) {
  const options = { data: { full_name: fullName, phone: phone || '', address: address || '' } };
  if (captchaToken) options.captchaToken = captchaToken;
  const { data, error } = await requireSupabase().auth.signUp({ email, password, options });
  if (error) throw error;
  return data;
}

export async function signIn({ email, password }) {
  const { data, error } = await requireSupabase().auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

async function callPhoneOtp(action, phone, token = '') {
  const { data, error } = await requireSupabase().functions.invoke('textbee-phone-otp', {
    body: { action, phone, ...(token ? { token } : {}) },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function startPhoneVerification(phone) {
  return callPhoneOtp('send', phone);
}

export async function verifyPhoneOtp(phone, token) {
  const result = await callPhoneOtp('verify', phone, token);
  await requireSupabase().auth.refreshSession();
  return result;
}

export async function claimVerifiedPhoneIdentity() {
  await requireSupabase().auth.refreshSession();
  return getCurrentUser();
}

export async function signOut() {
  if (!supabaseConfigured) return;
  const { error } = await requireSupabase().auth.signOut();
  if (error) throw error;
}

export async function resetPassword(email) {
  const { error } = await requireSupabase().auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
  if (error) throw error;
}

export async function updatePassword(password) {
  const { error } = await requireSupabase().auth.updateUser({ password });
  if (error) throw error;
}

export function onAuthStateChange(callback) {
  if (!supabaseConfigured) return () => {};
  const { data } = requireSupabase().auth.onAuthStateChange(callback);
  return () => data.subscription.unsubscribe();
}
