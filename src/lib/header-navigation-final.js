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
    link.className = login.className || 'outline-btn auth-btn';
    link.href = '/giris';
    link.textContent = 'Giriş Yap';
    link.setAttribute('aria-label', 'Giriş Yap');
    login.replaceWith(link);
  }

  const signup = slot.querySelector('#signupBtn');
  if (signup && signup.tagName !== 'A') {
    const link = document.createElement('a');
    link.className = signup.className || 'outline-btn auth-btn gold';
    link.href = '/kayit';
    link.textContent = 'Kayıt Ol';
    link.setAttribute('aria-label', 'Kayıt Ol');
    signup.replaceWith(link);
  }
}

function boot() {
  replaceHeaderControls();
  const observer = new MutationObserver(() => replaceHeaderControls());
  observer.observe(document.body, { childList: true, subtree: true });
  window.setTimeout(replaceHeaderControls, 100);
  window.setTimeout(replaceHeaderControls, 500);
  window.setTimeout(replaceHeaderControls, 1500);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();
