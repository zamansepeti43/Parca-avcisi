import { getCurrentUser, startPhoneVerification, verifyPhoneOtp, claimVerifiedPhoneIdentity } from './auth.js';
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
  return isFullyVerifiedUser(user);
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
  await verifyPhoneOtp(normalized, String(token).trim());
  await claimVerifiedPhoneIdentity(normalized);
  return getCurrentUser();
}

function showVerificationModal(user) {
  const existing = document.querySelector('#phoneVerificationModal');
  if (existing) existing.remove();
  const phone = normalizePhone(user?.user_metadata?.phone || user?.phone || '');
  const html = '<div id="phoneVerificationModal" class="app-modal show" aria-hidden="false"><div class="modal-card" role="dialog" aria-modal="true">'
    + '<button class="modal-close" data-phone-close aria-label="Kapat">×</button>'
    + '<span class="eyebrow">HESAP DOĞRULAMA</span><h2>Telefonunu doğrula</h2>'
    + '<p>Parça Avcısı hesabını kullanabilmek için e-posta ve telefon doğrulaması gerekiyor.</p>'
    + '<form id="phoneVerificationForm" class="stack-form">'
    + '<input name="phone" type="tel" required value="' + phone + '" placeholder="05xx xxx xx xx" autocomplete="tel">'
    + '<button type="button" data-send-phone-code>SMS kodu gönder</button>'
    + '<div data-phone-otp-wrap hidden><input name="otp" inputmode="numeric" maxlength="6" pattern="[0-9]{6}" placeholder="6 haneli SMS kodu"><button>Telefonu doğrula</button></div>'
    + '<small data-phone-status></small></form></div></div>';
  document.body.insertAdjacentHTML('beforeend', html);
  const modal = document.querySelector('#phoneVerificationModal');
  const form = document.querySelector('#phoneVerificationForm');
  const status = form.querySelector('[data-phone-status]');
  const otpWrap = form.querySelector('[data-phone-otp-wrap]');
  form.querySelector('[data-send-phone-code]').addEventListener('click', async () => {
    try {
      const normalized = await beginPhoneVerification(form.elements.phone.value);
      form.elements.phone.value = normalized;
      otpWrap.hidden = false;
      status.textContent = 'SMS kodu gönderildi.';
    } catch (error) { status.textContent = error.message || 'SMS gönderilemedi.'; }
  });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      await confirmPhoneVerification(form.elements.phone.value, form.elements.otp.value);
      modal.remove();
      window.dispatchEvent(new CustomEvent('parca:verification-complete'));
      window.__showToast?.('Telefon doğrulandı. Hesabın artık tamamen doğrulanmış.');
    } catch (error) { status.textContent = error.message || 'Telefon doğrulanamadı.'; }
  });
  modal.addEventListener('click', (event) => { if (event.target === modal || event.target.closest('[data-phone-close]')) modal.remove(); });
}

async function guardProtectedAction(event) {
  const target = event.target.closest('#sellBtn, #mobileSell');
  if (!target || !supabaseConfigured) return;
  const user = await getCurrentUser().catch(() => null);
  if (!user || isFullyVerifiedUser(user)) return;
  if (!user.email_confirmed_at) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  showVerificationModal(user);
}

document.addEventListener('click', guardProtectedAction, true);
window.__parcaAuthVerification = { isFullyVerifiedUser, requireFullVerification, beginPhoneVerification, confirmPhoneVerification };
