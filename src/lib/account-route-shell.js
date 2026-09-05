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

  // Account pages use the modal's renderer as a data/rendering engine, but the
  // account route itself is a normal page. Keep the staging modal invisible
  // while async account data is loading so users never see "Yükleniyor…" or
  // the modal close button during route-to-route navigation.
  const modalDisplay = modal?.style.display || '';
  if (modal) {
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');
    modal.style.display = 'none';
  }

  try {
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

    document.body.classList.add('has-account-route');
  } finally {
    if (modal) {
      modal.classList.remove('show');
      modal.setAttribute('aria-hidden', 'true');
      modal.style.display = modalDisplay;
    }
  }
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
