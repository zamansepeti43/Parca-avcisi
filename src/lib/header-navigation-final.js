import { getCurrentUser, onAuthStateChange, signOut } from './auth.js';

function escapeHtml(value) {
  return String(value || '').replace(/[&<>\'\"]/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  }[char]));
}

function replaceHeaderControls() {
  const vehicle = document.querySelector('#headerVehicleLink');
  if (vehicle) {
    vehicle.textContent = 'Araçlarım';
    vehicle.setAttribute('href', '/araclarim');
    vehicle.removeAttribute('id');
    vehicle.classList.remove('active');
  }

  const slot = document.querySelector('#authSlot');
  if (!slot) return;

  const login = slot.querySelector('#loginBtn');
  if (login && login.tagName !== 'A') {
    const link = document.createElement('a');
    link.id = 'loginBtn';
    link.className = login.className || 'outline-btn auth-btn';
    link.href = '/giris';
    link.textContent = 'Giriş Yap';
    link.setAttribute('aria-label', 'Giriş Yap');
    login.replaceWith(link);
  }

  const signup = slot.querySelector('#signupBtn');
  if (signup && signup.tagName !== 'A') {
    const link = document.createElement('a');
    link.id = 'signupBtn';
    link.className = signup.className || 'outline-btn auth-btn gold';
    link.href = '/kayit';
    link.textContent = 'Kayıt Ol';
    link.setAttribute('aria-label', 'Kayıt Ol');
    signup.replaceWith(link);
  }
}

function renderAuthenticatedHeader(user) {
  const slot = document.querySelector('#authSlot');
  if (!slot) return;

  if (!user) {
    slot.innerHTML = '<a class="outline-btn auth-btn" id="loginBtn" href="/giris">Giriş Yap</a><a class="outline-btn auth-btn gold" id="signupBtn" href="/kayit">Kayıt Ol</a>';
    return;
  }

  const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Hesabım';
  const initial = escapeHtml(name.trim().charAt(0).toLocaleUpperCase('tr-TR') || 'H');
  slot.innerHTML = '<button class="notif-bell" id="notifBell" type="button" aria-label="Bildirimler"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg><span class="notif-badge" id="notifBadge"></span></button><button class="auth-account" id="accountBtn" type="button" aria-label="Hesabım"><b>' + initial + '</b><span>' + escapeHtml(name.toLocaleUpperCase('tr-TR')) + '</span></button>';

  const accountLink = document.querySelector('#accountLink');
  const accountLabel = document.querySelector('#accountLabel');
  if (accountLabel) {
    accountLabel.textContent = name.split(' ')[0].toLocaleUpperCase('tr-TR');
  }

  const accountBtn = document.querySelector('#accountBtn');
  if (accountBtn && accountBtn.dataset.bound !== '1') {
    accountBtn.dataset.bound = '1';
    accountBtn.addEventListener('click', () => {
      if (window.__openAccountCenter) window.__openAccountCenter('profilim');
      else window.location.assign('/araclarim');
    });
  }

  if (accountLink && accountLink.dataset.authStateBound !== '1') {
    accountLink.dataset.authStateBound = '1';
    accountLink.addEventListener('click', (event) => {
      event.preventDefault();
      if (window.__openAccountCenter) window.__openAccountCenter('profilim');
      else window.location.assign('/araclarim');
    });
  }
}

async function syncAuthState() {
  try {
    const user = await getCurrentUser();
    renderAuthenticatedHeader(user);
    replaceHeaderControls();
  } catch {
    renderAuthenticatedHeader(null);
  }
}

function boot() {
  replaceHeaderControls();
  syncAuthState();
  onAuthStateChange((_event, session) => {
    renderAuthenticatedHeader(session?.user || null);
    replaceHeaderControls();
  });

  const observer = new MutationObserver(() => replaceHeaderControls());
  observer.observe(document.body, { childList: true, subtree: true });
  window.setTimeout(replaceHeaderControls, 100);
  window.setTimeout(replaceHeaderControls, 500);
  window.setTimeout(replaceHeaderControls, 1500);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();
