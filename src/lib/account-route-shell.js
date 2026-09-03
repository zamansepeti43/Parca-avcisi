const ACCOUNT_ROUTES = {
  '/profilim': 'profilim', '/ilanlarim': 'ilanlarim', '/taleplerim': 'taleplerim',
  '/mesajlarim': 'mesajlarim', '/favorilerim': 'favorilerim', '/kayitli-aramalarim': 'kayitli-aramalarim',
  '/bildirimler': 'bildirimler', '/musterilerim': 'musterilerim', '/hesap-bilgileri': 'hesap-bilgileri',
  '/ayarlar': 'ayarlar', '/yardim-destek': 'yardim-destek', '/araclarim': 'araclarim'
};

async function renderAccountRoute() {
  const pane = ACCOUNT_ROUTES[window.location.pathname.replace(/\/+$/, '')];
  if (!pane) return;

  const modal = document.querySelector('#appModal');
  const content = document.querySelector('#modalContent');
  if (!content) return;

  if (pane === 'araclarim') {
    if (typeof window.__openSavedVehicles !== 'function') return;
    await window.__openSavedVehicles();
  } else {
    if (typeof window.__openAccountCenter !== 'function') return;
    await window.__openAccountCenter(pane);
  }

  const html = content.innerHTML;
  if (!html) return;

  let shell = document.querySelector('#accountRouteShell');
  if (!shell) {
    shell = document.createElement('main');
    shell.id = 'accountRouteShell';
    shell.className = 'account-route-shell';
    document.body.prepend(shell);
  }
  shell.innerHTML = '<div class="account-route-inner">' + html + '</div>';

  if (modal) {
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');
  }

  document.body.classList.add('has-account-route');
}

async function boot() {
  const path = window.location.pathname.replace(/\/+$/, '');
  if (!ACCOUNT_ROUTES[path]) return;

  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (document.querySelector('#appModal') && (typeof window.__openAccountCenter === 'function' || typeof window.__openSavedVehicles === 'function')) {
      await renderAccountRoute();
      return;
    }
    await new Promise((resolve) => window.setTimeout(resolve, 50));
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();
