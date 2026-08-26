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

function verificationError(error, fallback) {
  const message = String(error?.message || '').trim();
  if (!message) return fallback;
  if (/phone.*provider|sms.*provider|sms.*not.*configured|provider.*phone/i.test(message)) {
    return 'SMS doğrulaması şu anda yapılandırılmamış. Lütfen daha sonra tekrar dene.';
  }
  if (/already.*registered|already.*used|phone.*exists/i.test(message)) {
    return 'Bu telefon numarası başka bir hesapta kullanılıyor.';
  }
  return message;
}

function showVerificationModal(user) {
  const existing = document.querySelector('#phoneVerificationModal');
  if (existing) return;
  const phone = normalizePhone(user?.user_metadata?.phone || user?.phone || '');
  const html = '<div id="phoneVerificationModal" class="app-modal show" aria-hidden="false">'
    + '<div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="phoneVerificationTitle">'
    + '<button type="button" class="modal-close" data-close-phone-verification aria-label="Kapat">×</button>'
    + '<span class="eyebrow">HESAP DOĞRULAMA</span><h2 id="phoneVerificationTitle">Telefonunu doğrula</h2>'
    + '<p>E-posta adresin doğrulandı. İlan vermek için telefonunu da doğrulaman gerekiyor.</p>'
    + '<form id="phoneVerificationForm" class="stack-form">'
    + '<input name="phone" type="tel" required value="' + phone + '" placeholder="05xx xxx xx xx" autocomplete="tel">'
    + '<button type="button" data-send-phone-code>SMS kodu gönder</button>'
    + '<div data-phone-otp-wrap hidden><input name="otp" inputmode="numeric" maxlength="6" pattern="[0-9]{6}" placeholder="6 haneli SMS kodu"><button>Telefonu doğrula</button></div>'
    + '<small data-phone-status role="status"></small></form></div></div>';
  document.body.insertAdjacentHTML('beforeend', html);
  const modal = document.querySelector('#phoneVerificationModal');
  const form = document.querySelector('#phoneVerificationForm');
  const status = form.querySelector('[data-phone-status]');
  const otpWrap = form.querySelector('[data-phone-otp-wrap]');
  const close = () => modal.remove();
  modal.querySelector('[data-close-phone-verification]').addEventListener('click', close);
  form.querySelector('[data-send-phone-code]').addEventListener('click', async () => {
    const button = form.querySelector('[data-send-phone-code]');
    try {
      button.disabled = true;
      status.textContent = 'SMS gönderiliyor…';
      const normalized = await beginPhoneVerification(form.elements.phone.value);
      form.elements.phone.value = normalized;
      otpWrap.hidden = false;
      status.textContent = 'SMS kodu gönderildi.';
    } catch (error) {
      status.textContent = verificationError(error, 'SMS gönderilemedi.');
    } finally {
      button.disabled = false;
    }
  });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      await confirmPhoneVerification(form.elements.phone.value, form.elements.otp.value);
      modal.remove();
      window.dispatchEvent(new CustomEvent('parca:verification-complete'));
      window.__showToast?.('Telefon doğrulandı. Hesabın artık tamamen doğrulanmış.');
    } catch (error) {
      status.textContent = verificationError(error, 'Telefon doğrulanamadı.');
    }
  });
}

export function openPhoneVerification(user) { showVerificationModal(user); }

async function guardProtectedAction(event) {
  const target = event.target.closest('#sellBtn, #mobileSell');
  if (!target || !supabaseConfigured) return;
  const user = await getCurrentUser().catch(() => null);
  if (!user) return;
  if (isFullyVerifiedUser(user)) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  if (!user.email_confirmed_at) {
    window.__showToast?.('Önce e-posta adresini doğrulamalısın.');
    return;
  }
  showVerificationModal(user);
}

document.addEventListener('click', guardProtectedAction, true);
window.__parcaAuthVerification = { isFullyVerifiedUser, requireFullVerification, beginPhoneVerification, confirmPhoneVerification, openPhoneVerification };
