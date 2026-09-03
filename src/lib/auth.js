import { requireSupabase, supabaseConfigured } from './supabase.js';

export async function getCurrentUser() {
  if (!supabaseConfigured) return null;
  const client = requireSupabase();
  // Route guards and UI rendering do not need a round-trip to /auth/v1/user.
  // The local session is immediately available and is still enforced by Supabase RLS.
  const { data: sessionData } = await client.auth.getSession();
  if (sessionData?.session?.user) return sessionData.session.user;
  const { data, error } = await client.auth.getUser();
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

export async function resendEmailOtp(email) {
  const { data, error } = await requireSupabase().auth.resend({
    type: 'signup',
    email: String(email || '').trim().toLowerCase(),
  });
  if (error) throw error;
  return data;
}

export async function signIn({ email, password, captchaToken }) {
  const options = {};
  if (captchaToken) options.captchaToken = captchaToken;
  const { data, error } = await requireSupabase().auth.signInWithPassword({ email, password, options });
  if (error) throw error;
  return data;
}

export async function verifyEmailOtp(email, token) {
  const { data, error } = await requireSupabase().auth.verifyOtp({
    email: String(email || '').trim().toLowerCase(),
    token: String(token || '').trim(),
    type: 'email',
  });
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
