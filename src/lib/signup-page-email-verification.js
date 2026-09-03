import { getCurrentUser, resendEmailOtp, signUp, verifyEmailOtp } from './auth.js';
import { hasAuthCaptcha, mountAuthCaptcha, resetAuthCaptcha } from './auth-captcha.js';

const PENDING_KEY = 'parca-avcisi-pending-signup-email';
const MIN_OTP = 6;
const MAX_OTP = 8;
let resendTimer = null;

const esc = (value) => String(value ?? '').replace(/[&<>\"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '\"':'&quot;', "'":'&#039;' }[c]));
const normalizeEmail = (value) => String(value ?? '').trim().toLowerCase();

function savePending(email) {
  try { sessionStorage.setItem(PENDING_KEY, JSON.stringify({ email: normalizeEmail(email), createdAt: Date.now() })); } catch {}
}
function getPending() {
  try {
    const value = JSON.parse(sessionStorage.getItem(PENDING_KEY) || 'null');
    if (!value?.email || Date.now() - Number(value.createdAt || 0) > 15 * 60 * 1000) { sessionStorage.removeItem(PENDING_KEY); return null; }
    return value;
  } catch { return null; }
}
function clearPending() { try { sessionStorage.removeItem(PENDING_KEY); } catch {} }

function message(text, type = 'info') {
  const node = document.querySelector('#authMessage');
  if (!node) return;
  node.textContent = text;
  node.className = `auth-message ${type}`;
  node.hidden = false;
}

function errorText(error) {
  const raw = String(error?.message || '').trim();
  const lower = raw.toLowerCase();
  if (/rate.?limit|too many|frequency/.test(lower)) return 'Çok sık kod istendi. Lütfen biraz bekleyip tekrar dene.';
  if (/expired|invalid.*otp|otp.*expired|token.*expired/.test(lower)) return 'Kod geçersiz veya süresi dolmuş. Yeni kod iste.';
  if (/already.*registered|email.*already|email.*exists/.test(lower)) return 'Bu e-posta adresi zaten kayıtlı. Mevcut hesabınla giriş yap.';
  return raw || 'İşlem tamamlanamadı. Lütfen tekrar dene.';
}

function injectStyles() {
  if (document.querySelector('#signup-email-verification-styles')) return;
  const style = document.createElement('style');
  style.id = 'signup-email-verification-styles';
  style.textContent = `.signup-email-modal{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;padding:18px;background:rgba(0,0,0,.72);backdrop-filter:blur(6px)}.signup-email-card{width:min(100%,460px);background:#11151a;border:1px solid #3a4048;border-radius:20px;padding:28px;box-shadow:0 30px 90px rgba(0,0,0,.55)}.signup-email-card h2{margin:0 0 10px;font-size:27px}.signup-email-card p{color:#a9adb5;line-height:1.55}.signup-email-card strong{color:#fff}.signup-email-input{width:100%;height:58px;margin:12px 0;border:1px solid #3a4048;border-radius:12px;background:#0b0e12;color:#fff;text-align:center;font-size:25px;letter-spacing:.22em;outline:none}.signup-email-input:focus{border-color:#d9ad55;box-shadow:0 0 0 3px rgba(217,173,85,.12)}.signup-email-actions{display:grid;gap:10px}.signup-email-actions button{min-height:48px;border-radius:11px;border:1px solid #d9ad55;background:#d9ad55;color:#111;font-weight:900}.signup-email-actions button.secondary{background:transparent;color:#d9ad55}.signup-email-status{display:block;min-height:20px;margin-top:10px;color:#a9adb5;font-size:13px;text-align:center}.signup-email-close{position:absolute;right:12px;top:12px;width:38px;height:38px;border:0;border-radius:50%;background:#252a31;color:#fff;font-size:23px;cursor:pointer}`;
  document.head.appendChild(style);
}

function closeModal() {
  clearInterval(resendTimer);
  resendTimer = null;
  document.querySelector('#signupEmailVerifyModal')?.remove();
}

function startCooldown(button, seconds = 60) {
  clearInterval(resendTimer);
  const end = Date.now() + seconds * 1000;
  button.disabled = true;
  const tick = () => {
    const left = Math.max(0, end - Date.now());
    if (!left) { clearInterval(resendTimer); resendTimer = null; button.disabled = false; button.textContent = 'Kodu tekrar gönder'; return; }
    button.textContent = `Kodu tekrar gönder (${Math.ceil(left / 1000)} sn)`;
  };
  tick();
  resendTimer = setInterval(tick, 1000);
}

function openEmailModal(email) {
  injectStyles();
  closeModal();
  const safeEmail = esc(email);
  document.body.insertAdjacentHTML('beforeend', `<div id="signupEmailVerifyModal" class="signup-email-modal"><div class="signup-email-card" role="dialog" aria-modal="true" aria-labelledby="signupEmailVerifyTitle" style="position:relative"><button type="button" class="signup-email-close" data-close>×</button><span class="eyebrow">KAYIT DOĞRULAMA</span><h2 id="signupEmailVerifyTitle">E-postanı doğrula</h2><p><strong>${safeEmail}</strong> adresine gönderdiğimiz doğrulama kodunu gir.</p><form id="signupEmailOtpForm"><input class="signup-email-input" name="otp" inputmode="numeric" autocomplete="one-time-code" maxlength="8" minlength="6" pattern="[0-9]{6,8}" required placeholder="6–8 haneli kod" aria-label="E-posta doğrulama kodu"><div class="signup-email-actions"><button type="submit">E-postayı Doğrula</button><button type="button" class="secondary" data-resend>Kodu tekrar gönder</button></div><small class="signup-email-status" data-status role="status"></small></form></div></div>`);
  const modal = document.querySelector('#signupEmailVerifyModal');
  const form = document.querySelector('#signupEmailOtpForm');
  const status = form.querySelector('[data-status]');
  const resend = form.querySelector('[data-resend]');
  modal.querySelector('[data-close]').addEventListener('click', closeModal);
  modal.addEventListener('click', (event) => { if (event.target === modal) closeModal(); });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    const token = String(form.elements.otp.value || '').trim();
    if (!new RegExp(`^\\d{${MIN_OTP},${MAX_OTP}}$`).test(token)) { status.textContent = 'Kodu 6-8 hane olarak gir.'; return; }
    button.disabled = true;
    resend.disabled = true;
    status.textContent = 'Kod doğrulanıyor…';
    try {
      await verifyEmailOtp(email, token);
      clearPending();
      status.textContent = 'E-posta doğrulandı. Hesabın hazırlanıyor…';
      const user = await getCurrentUser().catch(() => null);
      window.setTimeout(() => { closeModal(); window.location.href = user ? '/' : '/giris'; }, 350);
    } catch (error) {
      status.textContent = errorText(error);
      button.disabled = false;
      resend.disabled = false;
    }
  });
  resend.addEventListener('click', async () => {
    if (resend.disabled) return;
    resend.disabled = true;
    status.textContent = 'Yeni kod gönderiliyor…';
    try {
      await resendEmailOtp(email);
      status.textContent = 'Yeni doğrulama kodu gönderildi.';
      startCooldown(resend);
    } catch (error) {
      status.textContent = errorText(error);
      resend.disabled = false;
    }
  });
  form.elements.otp.focus();
}

async function handleSignup(event) {
  const form = event.target;
  if (!(form instanceof HTMLFormElement) || form.id !== 'signupPageForm' || document.body.dataset.authPage !== 'signup') return;
  event.preventDefault();
  event.stopImmediatePropagation();
  if (!hasAuthCaptcha()) { message('Güvenlik doğrulaması yapılandırılmamış.', 'error'); return; }
  const data = new FormData(form);
  const email = normalizeEmail(data.get('email'));
  const password = String(data.get('password') || '');
  const confirm = String(data.get('confirm') || '');
  if (password !== confirm) { message('Şifreler eşleşmiyor.', 'error'); return; }
  if (!email) { message('E-posta adresini gir.', 'error'); return; }
  const submit = form.querySelector('button[type="submit"]');
  if (submit) submit.disabled = true;
  try {
    message('İnsan doğrulaması hazırlanıyor…');
    const box = form.querySelector('[data-auth-captcha]');
    const captcha = await mountAuthCaptcha(box);
    message('Hesabın oluşturuluyor…');
    const result = await signUp({ email, password, fullName: `${String(data.get('firstName') || '').trim()} ${String(data.get('lastName') || '').trim()}`.trim(), phone: String(data.get('phone') || '').trim(), address: String(data.get('address') || '').trim(), captchaToken: captcha.token });
    resetAuthCaptcha(captcha.widgetId);
    if (result?.session) {
      message('Kayıt tamamlandı. Ana sayfaya yönlendiriliyorsun…', 'success');
      window.setTimeout(() => { window.location.href = '/'; }, 500);
      return;
    }
    savePending(email);
    message('Doğrulama kodu gönderildi. E-posta doğrulama ekranı açılıyor…', 'success');
    openEmailModal(email);
  } catch (error) {
    message(errorText(error), 'error');
    if (submit) submit.disabled = false;
  }
}

document.addEventListener('submit', handleSignup, true);

window.setTimeout(() => {
  if (document.body.dataset.authPage !== 'signup') return;
  const pending = getPending();
  if (pending?.email) openEmailModal(pending.email);
}, 0);
