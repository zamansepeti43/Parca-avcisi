import { getCurrentUser, onAuthStateChange, signUp, startPhoneVerification, verifyPhoneOtp, verifyEmailOtp, resendEmailOtp } from './auth.js';
import { supabaseConfigured } from './supabase.js';

const PENDING_KEY = 'parca-avcisi-pending-phone-verification';
const PENDING_EMAIL_KEY = 'parca-avcisi-pending-email-verification';
const TURNSTILE_SITE_KEY = String(import.meta.env.VITE_TURNSTILE_SITE_KEY || '').trim();
const PHONE_OTP_UI_TTL_MS = 5 * 60 * 1000;
let turnstileReady = null;

function normalizePhone(value) {
  const raw = String(value || '').trim().replace(/[^0-9+]/g, '');
  if (raw.startsWith('+90')) return raw;
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('90')) return '+' + digits;
  if (digits.startsWith('0')) return '+90' + digits.slice(1);
  return '+90' + digits;
}

function getPending() { try { return JSON.parse(sessionStorage.getItem(PENDING_KEY) || 'null'); } catch { return null; } }
function setPending(email, phone) { sessionStorage.setItem(PENDING_KEY, JSON.stringify({ email: String(email || '').toLowerCase(), phone, startedAt: Date.now() })); }
function clearPending() { sessionStorage.removeItem(PENDING_KEY); }
function setPendingEmail(email, phone) { sessionStorage.setItem(PENDING_EMAIL_KEY, JSON.stringify({ email: String(email || '').trim().toLowerCase(), phone })); }
function getPendingEmail() { try { return JSON.parse(sessionStorage.getItem(PENDING_EMAIL_KEY) || 'null'); } catch { return null; } }
function clearPendingEmail() { sessionStorage.removeItem(PENDING_EMAIL_KEY); }

function errorText(error) {
  const message = String(error?.message || '').trim();
  const lower = message.toLowerCase();
  if (/captcha|turnstile/i.test(message)) return 'İnsan doğrulaması başarısız. Lütfen güvenlik kontrolünü tekrar tamamla.';
  if (/rate.?limit|too many|frequency/i.test(message)) return 'Çok sık kod istendi. Lütfen biraz bekleyip tekrar dene.';
  if (/expired|invalid.*token|invalid.*otp|token.*expired|otp.*expired/i.test(lower)) return 'Kod geçersiz veya süresi dolmuş. Yeni kod iste.';
  if (/user already registered|email.*already|email.*exists|already.*registered.*email/i.test(lower)) return 'Bu e-posta adresi zaten bir hesapta kayıtlı. Farklı bir e-posta kullan veya mevcut hesabınla giriş yap.';
  if (/phone.*already|already.*phone|phone.*exists|phone.*used|phone.*linked/i.test(lower)) return 'Bu telefon numarası başka bir hesapta doğrulanmış. Başka bir numara kullan.';
  return message || 'Doğrulama başlatılamadı.';
}

async function loadTurnstile() {
  if (!TURNSTILE_SITE_KEY) throw new Error('VITE_TURNSTILE_SITE_KEY eksik.');
  if (window.turnstile) return window.turnstile;
  if (!turnstileReady) {
    turnstileReady = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-turnstile-script]');
      if (existing) {
        existing.addEventListener('load', () => resolve(window.turnstile));
        existing.addEventListener('error', () => reject(new Error('Turnstile yüklenemedi.')));
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.dataset.turnstileScript = 'true';
      script.onload = () => window.turnstile ? resolve(window.turnstile) : reject(new Error('Turnstile hazır değil.'));
      script.onerror = () => reject(new Error('Turnstile yüklenemedi.'));
      document.head.appendChild(script);
    });
  }
  return turnstileReady;
}

async function getCaptchaToken(container) {
  const turnstile = await loadTurnstile();
  container.innerHTML = '';
  return await new Promise((resolve, reject) => {
    let token = '';
    const widgetId = turnstile.render(container, {
      sitekey: TURNSTILE_SITE_KEY,
      theme: 'auto',
      callback: (value) => { token = value; resolve(token); },
      'expired-callback': () => reject(new Error('İnsan doğrulamasının süresi doldu.')),
      'error-callback': () => reject(new Error('İnsan doğrulaması başarısız.')),
    });
    container.dataset.widgetId = String(widgetId);
    setTimeout(() => { if (!token) reject(new Error('İnsan doğrulaması tamamlanmadı.')); }, 120000);
  });
}

function emailModalHtml(email) {
  return '<div id="signupEmailVerifyModal" class="app-modal show" aria-hidden="false"><div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="signupEmailVerifyTitle"><span class="eyebrow">KAYIT DOĞRULAMA</span><h2 id="signupEmailVerifyTitle">E-postanı doğrula</h2><p><strong>' + email + '</strong> adresine gönderdiğimiz 6 haneli doğrulama kodunu gir.</p><form id="signupEmailVerifyForm" class="stack-form"><input name="emailOtp" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" required placeholder="6 haneli e-posta kodu"><button>E-postayı Doğrula</button><button type="button" data-resend-email-code class="secondary">Kodu tekrar gönder</button><small data-signup-email-status role="status"></small></form></div></div>';
}

function closeSignupParentModal() {
  const parent = document.querySelector('#appModal');
  if (!parent) return;
  parent.classList.remove('show');
  parent.setAttribute('aria-hidden', 'true');
}

async function openEmailVerification(email, phone) {
  const existing = document.querySelector('#signupEmailVerifyModal');
  if (existing) existing.remove();
  document.body.insertAdjacentHTML('beforeend', emailModalHtml(email));
  const modal = document.querySelector('#signupEmailVerifyModal');
  const form = document.querySelector('#signupEmailVerifyForm');
  const status = form.querySelector('[data-signup-email-status]');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = form.querySelector('button:not([data-resend-email-code])');
    button.disabled = true;
    status.textContent = 'E-posta kodu doğrulanıyor…';
    try {
      await verifyEmailOtp(email, form.elements.emailOtp.value.trim());
      clearPendingEmail();
      modal.remove();
      const user = await getCurrentUser().catch(() => null);
      if (user) await openVerification(phone);
      else window.__showToast?.('E-posta doğrulandı. Şimdi giriş yap.');
    } catch (error) { status.textContent = errorText(error); button.disabled = false; }
  });
  form.querySelector('[data-resend-email-code]').addEventListener('click', async () => {
    const button = form.querySelector('[data-resend-email-code]');
    button.disabled = true;
    status.textContent = 'Yeni e-posta kodu gönderiliyor…';
    try { await resendEmailOtp(email); status.textContent = 'Yeni e-posta kodu gönderildi.'; }
    catch (error) { status.textContent = errorText(error); }
    finally { button.disabled = false; }
  });
}

function modalHtml(phone) {
  return '<div id="signupPhoneVerifyModal" class="app-modal show" aria-hidden="false"><div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="signupPhoneVerifyTitle"><span class="eyebrow">KAYIT DOĞRULAMA</span><h2 id="signupPhoneVerifyTitle">Telefonunu doğrula</h2><p>Telefonuna gönderilen 6 haneli SMS kodunu gir.</p><form id="signupPhoneVerifyForm" class="stack-form"><input name="otp" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" required placeholder="6 haneli SMS kodu"><button>Telefonu Doğrula</button><button type="button" data-resend-signup-sms class="secondary">SMS kodunu tekrar gönder</button><small data-signup-phone-status role="status"></small></form></div></div>';
}

async function openVerification(phone, send = true) {
  const existing = document.querySelector('#signupPhoneVerifyModal');
  if (existing) existing.remove();
  const pending = getPending();
  if (pending?.startedAt && Date.now() - Number(pending.startedAt) >= PHONE_OTP_UI_TTL_MS) {
    clearPending();
    return false;
  }
  document.body.insertAdjacentHTML('beforeend', modalHtml(phone));
  const modal = document.querySelector('#signupPhoneVerifyModal');
  const form = document.querySelector('#signupPhoneVerifyForm');
  const status = form.querySelector('[data-signup-phone-status]');
  try {
    if (send) {
      status.textContent = 'SMS gönderiliyor…';
      await startPhoneVerification(phone);
      status.textContent = 'SMS kodu gönderildi. Kod 5 dakika geçerlidir.';
    } else {
      status.textContent = 'Aktif SMS doğrulama kodunu gir.';
    }
  } catch (error) { status.textContent = errorText(error); }
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = form.querySelector('button:not([data-resend-signup-sms])');
    button.disabled = true;
    status.textContent = 'Kod doğrulanıyor…';
    try {
      await verifyPhoneOtp(phone, form.elements.otp.value.trim());
      clearPending();
      modal.remove();
      closeSignupParentModal();
      window.__showToast?.('Kayıt tamamlandı. E-posta ve telefon doğrulandı.');
      window.dispatchEvent(new CustomEvent('parca:verification-complete'));
    } catch (error) { status.textContent = errorText(error); button.disabled = false; }
  });
  form.querySelector('[data-resend-signup-sms]').addEventListener('click', async () => {
    const button = form.querySelector('[data-resend-signup-sms]');
    button.disabled = true;
    status.textContent = 'SMS tekrar gönderiliyor…';
    try {
      await startPhoneVerification(phone);
      const current = getPending();
      if (current) { current.startedAt = Date.now(); sessionStorage.setItem(PENDING_KEY, JSON.stringify(current)); }
      status.textContent = 'Yeni SMS kodu gönderildi. Kod 5 dakika geçerlidir.';
    } catch (error) { status.textContent = errorText(error); }
    finally { button.disabled = false; }
  });
  return true;
}

async function handleSignup(event) {
  const form = event.target;
  if (!(form instanceof HTMLFormElement) || form.id !== 'signupForm' || !supabaseConfigured) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const data = new FormData(form);
  const firstName = String(data.get('firstName') || '').trim();
  const lastName = String(data.get('lastName') || '').trim();
  const email = String(data.get('email') || '').trim().toLowerCase();
  const phone = normalizePhone(data.get('phone'));
  const password = String(data.get('password') || '');
  const confirm = String(data.get('confirm') || '');
  const address = String(data.get('address') || '').trim();
  if (!/^\+90\d{10}$/.test(phone)) return window.__showToast?.('Geçerli bir Türkiye telefon numarası gir.');
  if (password !== confirm) return window.__showToast?.('Şifreler eşleşmiyor.');
  if (!TURNSTILE_SITE_KEY) return window.__showToast?.('Kayıt güvenliği henüz yapılandırılmamış. Turnstile anahtarı eklenmeden kayıt açılamaz.');
  const submit = form.querySelector('button[type="submit"], button:not([type])');
  const captcha = form.querySelector('[data-turnstile-signup]');
  if (submit) submit.disabled = true;
  try {
    const captchaToken = await getCaptchaToken(captcha);
    const result = await signUp({ email, password, fullName: `${firstName} ${lastName}`.trim(), phone, address, captchaToken });
    setPending(email, phone);
    if (result?.session) await openVerification(phone);
    else { setPendingEmail(email, phone); closeSignupParentModal(); await openEmailVerification(email, phone); }
  } catch (error) { window.__showToast?.(errorText(error)); }
  finally { if (submit) submit.disabled = false; }
}

document.addEventListener('submit', handleSignup, true);

document.addEventListener('click', (event) => {
  const signupTrigger = event.target.closest('#signupBtn, [data-open-signup]');
  if (!signupTrigger) return;
  setTimeout(async () => {
    const pending = getPending();
    const user = await getCurrentUser().catch(() => null);
    if (pending && user && !user.phone_confirmed_at && pending.email === String(user.email || '').toLowerCase()) {
      const age = pending.startedAt ? Date.now() - Number(pending.startedAt) : 0;
      if (age < PHONE_OTP_UI_TTL_MS) {
        await openVerification(normalizePhone(pending.phone), false);
        return;
      }
      clearPending();
    }
    const pendingEmail = getPendingEmail();
    if (pendingEmail && !user && pendingEmail.email) {
      await openEmailVerification(pendingEmail.email, pendingEmail.phone);
      return;
    }
    const form = document.querySelector('#signupForm');
    if (!form || form.querySelector('[data-turnstile-signup]')) return;
    const holder = document.createElement('div');
    holder.dataset.turnstileSignup = 'true';
    holder.style.minHeight = '65px';
    const submit = form.querySelector('button[type="submit"], button:not([type])');
    if (submit) form.insertBefore(holder, submit); else form.appendChild(holder);
    loadTurnstile().catch((error) => { holder.textContent = errorText(error); });
  }, 0);
}, true);

async function resumePendingVerification(user) {
  const pending = getPending();
  if (!user || !pending || pending.email !== String(user.email || '').toLowerCase()) return;
  if (user.phone_confirmed_at) { clearPending(); return; }
  const age = pending.startedAt ? Date.now() - Number(pending.startedAt) : 0;
  if (age >= PHONE_OTP_UI_TTL_MS) { clearPending(); return; }
  try { await openVerification(normalizePhone(pending.phone), false); } catch { /* UI reports provider errors */ }
}

if (supabaseConfigured) {
  onAuthStateChange((_event, session) => { resumePendingVerification(session?.user || null); });
  getCurrentUser().then(resumePendingVerification).catch(() => {});
}

window.__parcaSignupPhoneVerification = { resumePendingVerification };
