import { signIn, signUp, onAuthStateChange } from './auth.js';

function ensureModal() {
  let modal = document.querySelector('#appModal');
  if (modal) return modal;
  document.body.insertAdjacentHTML('beforeend', '<div class="app-modal" id="appModal" aria-hidden="true"><div class="modal-card" role="dialog" aria-modal="true"><button class="modal-close" data-auth-fallback-close aria-label="Kapat">×</button><div id="modalContent"></div></div></div>');
  return document.querySelector('#appModal');
}

function showFallback(html) {
  const modal = ensureModal();
  const content = modal.querySelector('#modalContent');
  if (!content) return;
  content.innerHTML = html;
  modal.classList.add('show');
  modal.setAttribute('aria-hidden', 'false');
}

function closeFallback() {
  const modal = document.querySelector('#appModal');
  if (!modal) return;
  modal.classList.remove('show');
  modal.setAttribute('aria-hidden', 'true');
}

function message(text) {
  const toast = document.querySelector('#toast');
  if (toast) {
    toast.textContent = text;
    toast.classList.add('show');
    clearTimeout(message.timer);
    message.timer = setTimeout(() => toast.classList.remove('show'), 2800);
  } else {
    const node = document.querySelector('[data-auth-fallback-message]');
    if (node) node.textContent = text;
  }
}

function openLoginFallback() {
  showFallback('<span class="eyebrow">PARÇA AVCISI ÜYELİK</span><h2>Giriş yap</h2><p>Hesabınla devam et.</p><form id="authFallbackLoginForm" class="stack-form" data-auth-fallback-form><input name="email" type="email" required autocomplete="email" placeholder="E-posta"><input name="password" type="password" required autocomplete="current-password" placeholder="Şifre"><button type="submit">Giriş Yap</button><small data-auth-fallback-message></small></form><div class="form-links"><button type="button" data-auth-fallback-signup>Hesabın yok mu? Kayıt ol</button></div>');
}

function openSignupFallback() {
  showFallback('<span class="eyebrow">PARÇA AVCISI ÜYELİK</span><h2>Ücretsiz kayıt ol</h2><p>Parça Avcısı hesabını oluştur.</p><form id="authFallbackSignupForm" class="stack-form" data-auth-fallback-form><input name="firstName" required autocomplete="given-name" placeholder="Ad"><input name="lastName" required autocomplete="family-name" placeholder="Soyad"><input name="email" type="email" required autocomplete="email" placeholder="E-posta"><input name="password" type="password" required minlength="6" autocomplete="new-password" placeholder="Şifre (en az 6 karakter)"><button type="submit">Kayıt Ol</button><small data-auth-fallback-message></small></form><div class="form-links"><button type="button" data-auth-fallback-login>Hesabın var mı? Giriş yap</button></div>');
}

function wireButtons() {
  const login = document.querySelector('#loginBtn');
  const signup = document.querySelector('#signupBtn');
  if (login && !login.dataset.authFallbackBound) login.dataset.authFallbackBound = '1';
  if (signup && !signup.dataset.authFallbackBound) signup.dataset.authFallbackBound = '1';
}

document.addEventListener('click', (event) => {
  const login = event.target.closest('#loginBtn');
  const signup = event.target.closest('#signupBtn');
  if (login) {
    const modal = document.querySelector('#appModal');
    if (!modal || !modal.classList.contains('show')) openLoginFallback();
    return;
  }
  if (signup) {
    const modal = document.querySelector('#appModal');
    if (!modal || !modal.classList.contains('show')) openSignupFallback();
    return;
  }
  if (event.target.closest('[data-auth-fallback-login]')) { openLoginFallback(); return; }
  if (event.target.closest('[data-auth-fallback-signup]')) { openSignupFallback(); return; }
  if (event.target.closest('[data-auth-fallback-close]')) closeFallback();
}, false);

document.addEventListener('submit', async (event) => {
  if (event.target.id === 'authFallbackLoginForm') {
    event.preventDefault();
    const data = new FormData(event.target);
    const submit = event.target.querySelector('button[type="submit"]');
    submit.disabled = true;
    try {
      await signIn({ email: String(data.get('email') || '').trim(), password: data.get('password') });
      closeFallback();
      message('Giriş yapıldı.');
    } catch (error) {
      event.target.querySelector('[data-auth-fallback-message]').textContent = error?.message || 'Giriş yapılamadı.';
      submit.disabled = false;
    }
  }
  if (event.target.id === 'authFallbackSignupForm') {
    event.preventDefault();
    const data = new FormData(event.target);
    if (data.get('password') !== data.get('confirm')) {
      // Kept for compatibility if a future form adds confirm.
    }
    const fullName = (String(data.get('firstName') || '').trim() + ' ' + String(data.get('lastName') || '').trim()).trim();
    const submit = event.target.querySelector('button[type="submit"]');
    submit.disabled = true;
    try {
      const result = await signUp({ email: String(data.get('email') || '').trim(), password: data.get('password'), fullName });
      closeFallback();
      message(result?.session ? 'Kayıt tamamlandı.' : 'Kayıt tamamlandı. E-postanı doğrula.');
    } catch (error) {
      event.target.querySelector('[data-auth-fallback-message]').textContent = error?.message || 'Kayıt tamamlanamadı.';
      submit.disabled = false;
    }
  }
}, false);

const observer = new MutationObserver(wireButtons);
observer.observe(document.body, { childList: true, subtree: true });
wireButtons();

onAuthStateChange(() => wireButtons());
