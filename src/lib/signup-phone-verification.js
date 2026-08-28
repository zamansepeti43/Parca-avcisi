import { getCurrentUser, onAuthStateChange, signUp, startPhoneVerification, verifyPhoneOtp, claimVerifiedPhoneIdentity } from './auth.js';
import { supabaseConfigured } from './supabase.js';

const PENDING_KEY = 'parca-avcisi-pending-phone-verification';

function normalizePhone(value) {
  const raw = String(value || '').trim().replace(/[^0-9+]/g, '');
  if (raw.startsWith('+90')) return raw;
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('90')) return '+' + digits;
  if (digits.startsWith('0')) return '+90' + digits.slice(1);
  return '+90' + digits;
}

function getPending() {
  try { return JSON.parse(sessionStorage.getItem(PENDING_KEY) || 'null'); } catch { return null; }
}
function setPending(email, phone) {
  sessionStorage.setItem(PENDING_KEY, JSON.stringify({ email: String(email || '').toLowerCase(), phone }));
}
function clearPending() { sessionStorage.removeItem(PENDING_KEY); }

function errorText(error) {
  const message = String(error?.message || '').trim();
  if (/twilio|sms.*provider|phone.*provider|provider.*phone|sms.*not.*configured|missing.*account.*sid/i.test(message)) {
    return 'SMS sağlayıcısı Supabase Auth tarafında yapılandırılmamış. Supabase > Authentication > Providers > Phone bölümünde bir SMS sağlayıcısı (ör. Twilio) yapılandırılmalı.';
  }
  if (/rate.?limit|too many|frequency/i.test(message)) return 'Çok sık SMS istendi. Lütfen biraz bekleyip tekrar dene.';
  if (/already.*registered|already.*used|phone.*exists/i.test(message)) return 'Bu telefon numarası başka bir hesapta kullanılıyor.';
  return message || 'SMS doğrulaması başlatılamadı.';
}

function modalHtml(phone) {
  return '<div id="signupPhoneVerifyModal" class="app-modal show" aria-hidden="false">'
    + '<div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="signupPhoneVerifyTitle">'
    + '<span class="eyebrow">KAYIT DOĞRULAMA</span>'
    + '<h2 id="signupPhoneVerifyTitle">Telefonunu doğrula</h2>'
    + '<p>Hesabını tamamlamak için <strong>' + phone + '</strong> numarasına gönderilen 6 haneli SMS kodunu gir.</p>'
    + '<form id="signupPhoneVerifyForm" class="stack-form">'
    + '<input name="otp" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" required placeholder="6 haneli SMS kodu">'
    + '<button>Telefonu Doğrula</button>'
    + '<button type="button" data-resend-signup-sms class="secondary">SMS kodunu tekrar gönder</button>'
    + '<small data-signup-phone-status role="status"></small>'
    + '</form></div></div>';
}

async function openVerification(phone, resend = false) {
  const existing = document.querySelector('#signupPhoneVerifyModal');
  if (existing) existing.remove();
  document.body.insertAdjacentHTML('beforeend', modalHtml(phone));
  const modal = document.querySelector('#signupPhoneVerifyModal');
  const form = document.querySelector('#signupPhoneVerifyForm');
  const status = form.querySelector('[data-signup-phone-status]');
  try {
    if (resend) status.textContent = 'SMS gönderiliyor…';
    await startPhoneVerification(phone);
    status.textContent = 'SMS kodu gönderildi.';
  } catch (error) {
    status.textContent = errorText(error);
  }
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = form.querySelector('button:not([data-resend-signup-sms])');
    button.disabled = true;
    status.textContent = 'Kod doğrulanıyor…';
    try {
      await verifyPhoneOtp(phone, form.elements.otp.value.trim());
      await claimVerifiedPhoneIdentity(phone);
      clearPending();
      modal.remove();
      window.__showToast?.('Kayıt tamamlandı. Telefon numaran doğrulandı.');
      window.dispatchEvent(new CustomEvent('parca:verification-complete'));
    } catch (error) {
      status.textContent = errorText(error);
      button.disabled = false;
    }
  });
  form.querySelector('[data-resend-signup-sms]').addEventListener('click', async () => {
    const button = form.querySelector('[data-resend-signup-sms]');
    button.disabled = true;
    status.textContent = 'SMS tekrar gönderiliyor…';
    try {
      await startPhoneVerification(phone);
      status.textContent = 'Yeni SMS kodu gönderildi.';
    } catch (error) {
      status.textContent = errorText(error);
    } finally { button.disabled = false; }
  });
}

async function handleSignup(event) {
  const form = event.target;
  if (!(form instanceof HTMLFormElement) || form.id !== 'signupForm' || !supabaseConfigured) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const data = new FormData(form);
  const firstName = String(data.get('firstName') || '').trim();
  const lastName = String(data.get('lastName') || '').trim();
  const email = String(data.get('email') || '').trim();
  const phone = normalizePhone(data.get('phone'));
  const password = String(data.get('password') || '');
  const confirm = String(data.get('confirm') || '');
  const address = String(data.get('address') || '').trim();
  if (!/^\+90\d{10}$/.test(phone)) return window.__showToast?.('Geçerli bir Türkiye telefon numarası gir.');
  if (password !== confirm) return window.__showToast?.('Şifreler eşleşmiyor.');
  const submit = form.querySelector('button[type="submit"], button:not([type])');
  if (submit) submit.disabled = true;
  try {
    const result = await signUp({ email, password, fullName: `${firstName} ${lastName}`.trim(), phone, address });
    setPending(email, phone);
    if (result?.session) {
      await openVerification(phone);
    } else {
      window.__showToast?.('Kayıt oluşturuldu. Önce e-posta adresini doğrula; ardından giriş yaptığında telefon SMS doğrulaması otomatik açılacak.');
    }
  } catch (error) {
    window.__showToast?.(errorText(error));
  } finally { if (submit) submit.disabled = false; }
}

document.addEventListener('submit', handleSignup, true);

async function resumePendingVerification(user) {
  const pending = getPending();
  if (!user || !pending || pending.email !== String(user.email || '').toLowerCase()) return;
  if (user.phone_confirmed_at) { clearPending(); return; }
  try { await openVerification(normalizePhone(pending.phone), true); } catch { /* UI reports provider errors */ }
}

if (supabaseConfigured) {
  onAuthStateChange((_event, session) => { resumePendingVerification(session?.user || null); });
  getCurrentUser().then(resumePendingVerification).catch(() => {});
}

window.__parcaSignupPhoneVerification = { resumePendingVerification };
