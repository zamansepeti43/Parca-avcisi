import { getCurrentUser, signIn, signUp, resetPassword, onAuthStateChange } from './lib/auth.js';
import { supabaseConfigured } from './lib/supabase.js';

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

function renderLogin() {
  content.innerHTML = `
    <span class="eyebrow">PARÇA AVCISI ÜYELİK</span>
    <h1 id="authTitle">Giriş yap</h1>
    <p class="auth-intro">Hesabınla devam et. İlanlarını, favorilerini ve mesajlarını yönet.</p>
    <div id="authMessage" class="auth-message" hidden></div>
    <form id="loginPageForm" class="auth-form">
      <label>E-posta<input name="email" type="email" required autocomplete="email" placeholder="ornek@mail.com"></label>
      <label>Şifre<input name="password" type="password" required autocomplete="current-password" placeholder="Şifren"></label>
      <button class="primary-btn" type="submit">Giriş Yap</button>
    </form>
    <button class="text-btn" id="forgotBtn" type="button">Şifremi unuttum</button>
    <div class="auth-switch">Hesabın yok mu? <a href="/kayit">Ücretsiz kayıt ol</a></div>`;

  document.querySelector('#loginPageForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setMessage('Giriş yapılıyor…');
    setBusy(form, true);
    try {
      await signIn({ email: String(data.get('email')).trim(), password: String(data.get('password')) });
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
      <button class="primary-btn" type="submit">Bağlantı Gönder</button>
    </form>
    <button class="text-btn" id="backLoginBtn" type="button">← Giriş ekranına dön</button>`;

  document.querySelector('#forgotPageForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setMessage('Bağlantı gönderiliyor…');
    setBusy(form, true);
    try {
      await resetPassword(String(data.get('email')).trim());
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
      <button class="primary-btn" type="submit">Kayıt Ol</button>
    </form>
    <div class="auth-switch">Zaten hesabın var mı? <a href="/giris">Giriş yap</a></div>`;

  document.querySelector('#signupPageForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    if (data.get('password') !== data.get('confirm')) return setMessage('Şifreler eşleşmiyor.', 'error');
    setMessage('Hesabın oluşturuluyor…');
    setBusy(form, true);
    try {
      const fullName = `${String(data.get('firstName')).trim()} ${String(data.get('lastName')).trim()}`.trim();
      const result = await signUp({ email: String(data.get('email')).trim(), password: String(data.get('password')), fullName, phone: String(data.get('phone')).trim(), address: String(data.get('address')).trim() });
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
} else {
  getCurrentUser().then((user) => { if (user) window.location.href = homeUrl; }).catch(() => {});
  onAuthStateChange((event) => { if (event === 'SIGNED_IN') window.location.href = homeUrl; });
  if (mode === 'signup') renderSignup(); else if (window.location.hash === '#sifremi-unuttum') renderForgot(); else renderLogin();
}
