import { getCurrentUser, signIn, signUp, resetPassword } from './lib/auth.js';
import { supabaseConfigured } from './lib/supabase.js';
import { hasAuthCaptcha, mountAuthCaptcha, resetAuthCaptcha } from './lib/auth-captcha.js';

const mode = document.body.dataset.authPage;
const content = document.querySelector('#authContent');
const homeUrl = '/';

const escapeHtml = (value) => String(value ?? '').replace(/[&<>\"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '\"':'&quot;', "'":'&#039;' }[char]));

function setMessage(message, type = 'info') {
  const node = document.querySelector('#authMessage');
  if (!node) return;
  node.textContent = message;
  node.className = `auth-message ${type}`;
  node.hidden = !message;
}

function setBusy(form, busy) {
  form.querySelectorAll('button').forEach((button) => { button.disabled = busy; });
  form.classList.toggle('is-busy', busy);
}

async function prepareCaptcha(form) {
  if (!hasAuthCaptcha()) throw new Error('İnsan doğrulaması yapılandırılmamış.');
  const box = form.querySelector('[data-auth-captcha]');
  if (!box) throw new Error('Güvenlik doğrulama alanı bulunamadı.');
  box.hidden = false;
  try {
    const result = await mountAuthCaptcha(box);
    return result;
  } catch (error) {
    setMessage(error?.message || 'İnsan doğrulaması yüklenemedi. Lütfen tekrar dene.', 'error');
    throw error;
  }
}

function renderLogin() {
  content.innerHTML = `
    <span class="eyebrow">PARÇA AVCISI ÜYELİK</span>
    <h1 id="authTitle">Giriş yap</h1>
    <p class="auth-intro">Hesabınla devam et. İlanlarını, favorilerini ve mesajlarını yönet.</p>
    <div id="authMessage" class="auth-message" hidden></div>
    <form id="loginPageForm" class="auth-form">
      <label>E-posta<input name="email" type="email" required autocomplete="email" placeholder="ornek@mail.com"></label>
      <label>Şifre<input name="password" type="password" required autocomplete="current-password" placeholder="Şifren"></label>
      <div data-auth-captcha class="turnstile-box" hidden></div>
      <button class="primary-btn" type="submit">Giriş Yap</button>
    </form>
    <button class="text-btn" id="forgotBtn" type="button">Şifremi unuttum</button>
    <div class="auth-switch">Hesabın yok mu? <a href="/kayit">Ücretsiz kayıt ol</a></div>`;

  const form = document.querySelector('#loginPageForm');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    setBusy(form, true);
    try {
      setMessage('İnsan doğrulaması hazırlanıyor…');
      const captcha = await prepareCaptcha(form);
      setMessage('Giriş yapılıyor…');
      await signIn({ email: String(data.get('email')).trim(), password: String(data.get('password')), captchaToken: captcha.token });
      resetAuthCaptcha(captcha.widgetId);
      setMessage('Giriş başarılı. Ana sayfaya yönlendiriliyorsun…', 'success');
      window.setTimeout(() => { window.location.href = homeUrl; }, 500);
    } catch (error) {
      setMessage(error?.message || 'Giriş yapılamadı. E-posta ve şifreni kontrol et.', 'error');
    } finally { setBusy(form, false); }
  });

  document.querySelector('#forgotBtn').addEventListener('click', renderForgot);
}

function renderForgot() {
  window.history.replaceState(null, '', '/giris#sifremi-unuttum');
  content.innerHTML = `
    <span class="eyebrow">PARÇA AVCISI ÜYELİK</span>
    <h1 id="authTitle">Şifreni mi unuttun?</h1>
    <p class="auth-intro">E-posta adresini gir, şifre yenileme bağlantısını gönderelim.</p>
    <div id="authMessage" class="auth-message" hidden></div>
    <form id="forgotPageForm" class="auth-form">
      <label>E-posta<input name="email" type="email" required autocomplete="email" placeholder="ornek@mail.com"></label>
      <div data-auth-captcha class="turnstile-box" hidden></div>
      <button class="primary-btn" type="submit">Bağlantı Gönder</button>
    </form>
    <button class="text-btn" id="backLoginBtn" type="button">← Giriş ekranına dön</button>`;

  const form = document.querySelector('#forgotPageForm');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    setBusy(form, true);
    try {
      setMessage('İnsan doğrulaması hazırlanıyor…');
      const captcha = await prepareCaptcha(form);
      setMessage('Bağlantı gönderiliyor…');
      await resetPasswordWithCaptcha(String(data.get('email')).trim(), captcha.token);
      resetAuthCaptcha(captcha.widgetId);
      setMessage('Şifre yenileme bağlantısı e-posta adresine gönderildi.', 'success');
    } catch (error) {
      setMessage(error?.message || 'Bağlantı gönderilemedi.', 'error');
    } finally { setBusy(form, false); }
  });
  document.querySelector('#backLoginBtn').addEventListener('click', () => {
    window.history.replaceState(null, '', '/giris');
    renderLogin();
  });
}

async function resetPasswordWithCaptcha(email, captchaToken) {
  if (!captchaToken) throw new Error('İnsan doğrulamasını tamamla.');
  const { requireSupabase } = await import('./lib/supabase.js');
  const { error } = await requireSupabase().auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin,
    captchaToken,
  });
  if (error) throw error;
}

function renderSignup() {
  content.innerHTML = `
    <span class="eyebrow">PARÇA AVCISI ÜYELİK</span>
    <h1 id="authTitle">Ücretsiz kayıt ol</h1>
    <p class="auth-intro">İlan ver, parça talep et ve satıcılarla iletişim kur.</p>
    <div id="authMessage" class="auth-message" hidden></div>
    <form id="signupPageForm" class="auth-form">
      <div class="form-grid"><label>Ad<input name="firstName" required autocomplete="given-name" placeholder="Ad"></label><label>Soyad<input name="lastName" required autocomplete="family-name" placeholder="Soyad"></label></div>
      <div class="form-grid"><label>Telefon<input name="phone" type="tel" required inputmode="tel" autocomplete="tel" placeholder="05xx xxx xx xx"></label><label>E-posta<input name="email" type="email" required autocomplete="email" placeholder="ornek@mail.com"></label></div>
      <div class="form-grid"><label>Şifre<input name="password" type="password" required minlength="6" autocomplete="new-password" placeholder="En az 6 karakter"></label><label>Şifre tekrar<input name="confirm" type="password" required minlength="6" autocomplete="new-password" placeholder="Şifreyi tekrar yaz"></label></div>
      <label>Adres<textarea name="address" required autocomplete="street-address" placeholder="Adres"></textarea></label>
      <div data-auth-captcha class="turnstile-box" hidden></div>
      <button class="primary-btn" type="submit">Kayıt Ol</button>
    </form>
    <div class="auth-switch">Zaten hesabın var mı? <a href="/giris">Giriş yap</a></div>`;

  const form = document.querySelector('#signupPageForm');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    if (data.get('password') !== data.get('confirm')) return setMessage('Şifreler eşleşmiyor.', 'error');
    setBusy(form, true);
    try {
      setMessage('İnsan doğrulaması hazırlanıyor…');
      const captcha = await prepareCaptcha(form);
      setMessage('Hesabın oluşturuluyor…');
      const fullName = `${String(data.get('firstName')).trim()} ${String(data.get('lastName')).trim()}`.trim();
      const result = await signUp({
        email: String(data.get('email')).trim(),
        password: String(data.get('password')),
        fullName,
        phone: String(data.get('phone')).trim(),
        address: String(data.get('address')).trim(),
        captchaToken: captcha.token,
      });
      resetAuthCaptcha(captcha.widgetId);
      if (result?.session) {
        setMessage('Kayıt tamamlandı. Ana sayfaya yönlendiriliyorsun…', 'success');
        window.setTimeout(() => { window.location.href = homeUrl; }, 500);
      } else {
        setMessage('Kayıt tamamlandı. E-posta adresini doğrula, ardından giriş yap.', 'success');
        form.reset();
      }
    } catch (error) {
      setMessage(error?.message || 'Kayıt oluşturulamadı.', 'error');
    } finally { setBusy(form, false); }
  });
}

if (!supabaseConfigured) {
  content.innerHTML = '<span class="eyebrow">PARÇA AVCISI</span><h1>Üyelik şu an hazır değil</h1><p class="auth-intro">Supabase bağlantısı yapılandırılmadığı için giriş ve kayıt kullanılamıyor.</p><div id="authMessage" class="auth-message error">Yönetici: VITE_SUPABASE_URL ve VITE_SUPABASE_ANON_KEY değişkenlerini kontrol et.</div>';
} else if (!hasAuthCaptcha()) {
  content.innerHTML = '<span class="eyebrow">PARÇA AVCISI</span><h1>Güvenlik doğrulaması hazır değil</h1><p class="auth-intro">Üyelik güvenliği için Turnstile anahtarı eksik. Vercel ortam değişkenlerinde VITE_TURNSTILE_SITE_KEY değerini kontrol et.</p><div id="authMessage" class="auth-message error">Güvenlik doğrulaması yapılandırılmadan giriş veya kayıt açılamaz.</div>';
} else if (mode === 'signup') {
  renderSignup();
} else {
  getCurrentUser().then((user) => { if (user) window.location.href = homeUrl; }).catch(() => {});
  if (window.location.hash === '#sifremi-unuttum') renderForgot(); else renderLogin();
}
