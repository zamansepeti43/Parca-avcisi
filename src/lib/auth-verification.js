import { getCurrentUser, startPhoneVerification, verifyPhoneOtp } from './auth.js';
import { supabaseConfigured } from './supabase.js';

const normalizePhone = (value) => {
  const raw = String(value || '').trim().replace(/[^0-9+]/g, '');
  if (raw.startsWith('+90')) return raw;
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('90')) return '+' + digits;
  if (digits.startsWith('0')) return '+90' + digits.slice(1);
  return '+90' + digits;
};

export function isFullyVerifiedUser(user) {
  return Boolean(user?.email_confirmed_at && user?.phone_confirmed_at);
}

export async function requireFullVerification() {
  if (!supabaseConfigured) return true;
  const user = await getCurrentUser().catch(() => null);
  if (!user) return false;
  if (isFullyVerifiedUser(user)) return true;
  return false;
}

export async function beginPhoneVerification(phone) {
  const normalized = normalizePhone(phone);
  if (!/^\+90\d{10}$/.test(normalized)) throw new Error('Geçerli bir Türkiye telefon numarası gir.');
  await startPhoneVerification(normalized);
  return normalized;
}

export async function confirmPhoneVerification(phone, token) {
  const normalized = normalizePhone(phone);
  if (!/^\d{6}$/.test(String(token || '').trim())) throw new Error('6 haneli SMS kodunu gir.');
  return verifyPhoneOtp(normalized, String(token).trim());
}

window.__parcaAuthVerification = {
  isFullyVerifiedUser,
  requireFullVerification,
  beginPhoneVerification,
  confirmPhoneVerification,
};
