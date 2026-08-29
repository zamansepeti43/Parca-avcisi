import { getCurrentUser, onAuthStateChange, signUp, startPhoneVerification, verifyPhoneOtp, verifyEmailOtp, resendEmailOtp } from './auth.js';
import { supabaseConfigured } from './supabase.js';

const PENDING_KEY = 'parca-avcisi-pending-phone-verification';
const PENDING_EMAIL_KEY = 'parca-avcisi-pending-email-verification';
const TURNSTILE_SITE_KEY = String(import.meta.env.VITE_TURNSTILE_SITE_KEY || '').trim();
const PHONE_OTP_UI_TTL_MS = 5 * 60 * 1000;
const EMAIL_RESEND_COOLDOWN_MS = 60 * 1000;
let turnstileReady = null;
let emailResendTimer = null;

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
  if (/already.*registered|email.*already|email.*exists/i.test(lower)) return 'Bu e-posta adresi zaten kayıtlı. Mevcut hesabınla giriş yap.';
  return message || 'Doğrulama başlatılamadı.';
}

async function loadTurnstile() {
  if (!TURNSTILE_SITE_KEY) throw new Error('VITE_TURNSTILE_SITE_KEY eksik.');
  if (window.turnstile) return window.turnstile;
  if (!turnstileReady) turnstileReady = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true; script.defer = true;
    script.onload = () => window.turnstile ? resolve(window.turnstile) : reject(new Error('Turnstile hazır değil.'));
    script.onerror = () => reject(new Error('Turnstile yüklenemedi.'));
    document.head.appendChild(script);
  });
  return turnstileReady;
}
async function getCaptchaToken(container) {
  const turnstile = await loadTurnstile(); container.innerHTML = '';
  return new Promise((resolve, reject) => {
    let token = '';
    turnstile.render(container, { sitekey: TURNSTILE_SITE_KEY, theme: 'auto', callback: v => { token = v; resolve(v); }, 'expired-callback': () => reject(new Error('İnsan doğrulamasının süresi doldu.')), 'error-callback': () => reject(new Error('İnsan doğrulaması başarısız.')) });
    setTimeout(() => { if (!token) reject(new Error('İnsan doğrulaması tamamlanmadı.')); }, 120000);
  });
}

function closeSignupParentModal() {
  const parent = document.querySelector('#appModal');
  if (parent) { parent.classList.remove('show'); parent.setAttribute('aria-hidden', 'true'); }
}
function reopenSignupParentModal() {
  const parent = document.querySelector('#appModal');
  if (!parent) return false;
  parent.classList.add('show'); parent.setAttribute('aria-hidden', 'false'); return true;
}
function clearEmailResendTimer() { if (emailResendTimer) clearInterval(emailResendTimer); emailResendTimer = null; }
function startEmailResendCooldown(button, duration = EMAIL_RESEND_COOLDOWN_MS) {
  clearEmailResendTimer(); const end = Date.now() + duration; button.disabled = true;
  const tick = () => { const left = Math.max(0, end - Date.now()); if (!left) { clearEmailResendTimer(); button.disabled = false; button.textContent = 'Kodu tekrar gönder'; return; } button.textContent = `Kodu tekrar gönder (${Math.ceil(left / 1000)} sn)`; };
  tick(); emailResendTimer = setInterval(tick, 1000);
}

function emailModalHtml(email) {
  return '<div id="signupEmailVerifyModal" class="app-modal show" aria-hidden="false">'
    + '<div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="signupEmailVerifyTitle" style="position:relative">'
    + '<button type="button" data-close-email-verification aria-label="Geri dön" style="position:absolute;right:14px;top:12px;width:38px;height:38px;border:0;border-radius:50%;background:#f1f1f1;color:#171717;font-size:25px;cursor:pointer">×</button>'
    + '<span class="eyebrow">KAYIT DOĞRULAMA</span><h2 id="signupEmailVerifyTitle">E-postanı doğrula</h2>'
    + '<p><strong>' + email + '</strong> adresine gönderdiğimiz 6 haneli doğrulama kodunu gir.</p>'
    + '<form id="signupEmailVerifyForm" class="stack-form">'
    + '<input name="emailOtp" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" required placeholder="6 haneli e-posta kodu">'
    + '<button>E-postayı Doğrula</button><button type="button" data-resend-email-code class="secondary">Kodu tekrar gönder</button>'
    + '<small data-signup-email-status role="status"></small></form></div></div>';
}

async function openEmailVerification(email, phone) {
  document.querySelector('#signupEmailVerifyModal')?.remove(); closeSignupParentModal();
  document.body.insertAdjacentHTML('beforeend', emailModalHtml(email));
  const modal = document.querySelector('#signupEmailVerifyModal');
  const form = document.querySelector('#signupEmailVerifyForm');
  const status = form.querySelector('[data-signup-email-status]');
  const resend = form.querySelector('[data-resend-email-code]');
  const close = () => { clearEmailResendTimer(); modal.remove(); reopenSignupParentModal(); };
  modal.querySelector('[data-close-email-verification]').addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });

  form.addEventListener('submit', async e => {
    e.preventDefault(); const button = form.querySelector('button:not([data-resend-email-code])'); button.disabled = true;
    try {
      const token = form.elements.emailOtp.value.trim();
      if (!/^\d{6}$/.test(token)) throw new Error('6 haneli e-posta kodunu gir.');
      status.textContent = 'E-posta kodu doğrulanıyor…';
      await verifyEmailOtp(email, token); clearPendingEmail(); clearEmailResendTimer(); modal.remove();
      const user = await getCurrentUser().catch(() => null);
      if (user) await openVerification(phone); else { reopenSignupParentModal(); window.__showToast?.('E-posta doğrulandı. Şimdi giriş yap.'); }
    } catch (error) { status.textContent = errorText(error); button.disabled = false; }
  });

  resend.addEventListener('click', async () => {
    if (resend.disabled) return; resend.disabled = true; status.textContent = 'Yeni e-posta kodu gönderiliyor…';
    try { await resendEmailOtp(email); status.textContent = 'Yeni 6 haneli e-posta kodu gönderildi.'; startEmailResendCooldown(resend); }
    catch (error) { status.textContent = errorText(error); const m = String(error?.message || '').match(/(\d+)\s*(?:seconds?|saniye)/i); if (m) startEmailResendCooldown(resend, Math.max(1000, Number(m[1]) * 1000)); else resend.disabled = false; }
  });
  return true;
}

function phoneModalHtml(phone) {
  return '<div id="signupPhoneVerifyModal" class="app-modal show" aria-hidden="false"><div class="modal-card" role="dialog" aria-modal="true"><span class="eyebrow">KAYIT DOĞRULAMA</span><h2>Telefonunu doğrula</h2><p>Telefonuna gönderilen 6 haneli SMS kodunu gir.</p><form id="signupPhoneVerifyForm" class="stack-form"><input name="otp" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" required placeholder="6 haneli SMS kodu"><button>Telefonu Doğrula</button><button type="button" data-resend-signup-sms class="secondary">SMS kodunu tekrar gönder</button><small data-signup-phone-status role="status"></small></form></div></div>';
}
async function openVerification(phone, send = true) {
  document.querySelector('#signupPhoneVerifyModal')?.remove();
  const pending = getPending(); if (pending?.startedAt && Date.now() - Number(pending.startedAt) >= PHONE_OTP_UI_TTL_MS) { clearPending(); return false; }
  document.body.insertAdjacentHTML('beforeend', phoneModalHtml(phone));
  const modal = document.querySelector('#signupPhoneVerifyModal'), form = document.querySelector('#signupPhoneVerifyForm'), status = form.querySelector('[data-signup-phone-status]');
  try { if (send) { status.textContent = 'SMS gönderiliyor…'; await startPhoneVerification(phone); status.textContent = 'SMS kodu gönderildi. Kod 5 dakika geçerlidir.'; } else status.textContent = 'Aktif SMS doğrulama kodunu gir.'; } catch (error) { status.textContent = errorText(error); }
  form.addEventListener('submit', async e => { e.preventDefault(); const b = form.querySelector('button:not([data-resend-signup-sms])'); b.disabled = true; status.textContent = 'Kod doğrulanıyor…'; try { await verifyPhoneOtp(phone, form.elements.otp.value.trim()); clearPending(); modal.remove(); closeSignupParentModal(); window.__showToast?.('Kayıt tamamlandı. E-posta ve telefon doğrulandı.'); window.dispatchEvent(new CustomEvent('parca:verification-complete')); } catch (error) { status.textContent = errorText(error); b.disabled = false; } });
  form.querySelector('[data-resend-signup-sms]').addEventListener('click', async () => { const b = form.querySelector('[data-resend-signup-sms]'); b.disabled = true; status.textContent = 'SMS tekrar gönderiliyor…'; try { await startPhoneVerification(phone); const p = getPending(); if (p) { p.startedAt = Date.now(); sessionStorage.setItem(PENDING_KEY, JSON.stringify(p)); } status.textContent = 'Yeni SMS kodu gönderildi. Kod 5 dakika geçerlidir.'; } catch (error) { status.textContent = errorText(error); } finally { b.disabled = false; } });
  return true;
}

async function handleSignup(event) {
  const form = event.target; if (!(form instanceof HTMLFormElement) || form.id !== 'signupForm' || !supabaseConfigured) return;
  event.preventDefault(); event.stopImmediatePropagation(); const data = new FormData(form);
  const firstName = String(data.get('firstName') || '').trim(), lastName = String(data.get('lastName') || '').trim(), email = String(data.get('email') || '').trim().toLowerCase(), phone = normalizePhone(data.get('phone')), password = String(data.get('password') || ''), confirm = String(data.get('confirm') || ''), address = String(data.get('address') || '').trim();
  if (!/^\+90\d{10}$/.test(phone)) return window.__showToast?.('Geçerli bir Türkiye telefon numarası gir.'); if (password !== confirm) return window.__showToast?.('Şifreler eşleşmiyor.');
  const currentUser = await getCurrentUser().catch(() => null), pending = getPending();
  if (currentUser && pending && !currentUser.phone_confirmed_at && pending.email === email && normalizePhone(pending.phone) === phone) { if ((Date.now() - Number(pending.startedAt || 0)) < PHONE_OTP_UI_TTL_MS) { await openVerification(phone, false); return; } clearPending(); }
  if (!TURNSTILE_SITE_KEY) return window.__showToast?.('Kayıt güvenliği henüz yapılandırılmamış. Turnstile anahtarı eklenmeden kayıt açılamaz.');
  const submit = form.querySelector('button[type="submit"], button:not([type])'), captcha = form.querySelector('[data-turnstile-signup]'); if (submit) submit.disabled = true;
  try { const captchaToken = await getCaptchaToken(captcha); const result = await signUp({ email, password, fullName: `${firstName} ${lastName}`.trim(), phone, address, captchaToken }); setPending(email, phone); if (result?.session) await openVerification(phone); else { setPendingEmail(email, phone); await openEmailVerification(email, phone); } } catch (error) { window.__showToast?.(errorText(error)); } finally { if (submit) submit.disabled = false; }
}
document.addEventListener('submit', handleSignup, true);

document.addEventListener('click', event => { const trigger = event.target.closest('#signupBtn, [data-open-signup]'); if (!trigger) return; setTimeout(async () => { const pending = getPending(), user = await getCurrentUser().catch(() => null); if (pending && user && !user.phone_confirmed_at && pending.email === String(user.email || '').toLowerCase()) { if ((Date.now() - Number(pending.startedAt || 0)) < PHONE_OTP_UI_TTL_MS) { await openVerification(normalizePhone(pending.phone), false); return; } clearPending(); } const pendingEmail = getPendingEmail(); if (pendingEmail && !user && pendingEmail.email) { await openEmailVerification(pendingEmail.email, pendingEmail.phone); return; } const form = document.querySelector('#signupForm'); if (!form || form.querySelector('[data-turnstile-signup]')) return; const holder = document.createElement('div'); holder.dataset.turnstileSignup = 'true'; holder.style.minHeight = '65px'; const submit = form.querySelector('button[type="submit"], button:not([type])'); if (submit) form.insertBefore(holder, submit); else form.appendChild(holder); loadTurnstile().catch(error => { holder.textContent = errorText(error); }); }, 0); }, true);

async function resumePendingVerification(user) { const pending = getPending(); if (!user || !pending || pending.email !== String(user.email || '').toLowerCase()) return; if (user.phone_confirmed_at) { clearPending(); return; } if ((Date.now() - Number(pending.startedAt || 0)) >= PHONE_OTP_UI_TTL_MS) { clearPending(); return; } try { await openVerification(normalizePhone(pending.phone), false); } catch {} }
if (supabaseConfigured) { onAuthStateChange((_event, session) => resumePendingVerification(session?.user || null)); getCurrentUser().then(resumePendingVerification).catch(() => {}); }
window.__parcaSignupPhoneVerification = { resumePendingVerification };
