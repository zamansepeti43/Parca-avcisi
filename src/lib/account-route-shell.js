const ACCOUNT_ROUTES = {
  '/profilim': 'profilim', '/ilanlarim': 'ilanlarim', '/taleplerim': 'taleplerim',
  '/mesajlarim': 'mesajlarim', '/favorilerim': 'favorilerim', '/kayitli-aramalarim': 'kayitli-aramalarim',
  '/bildirimler': 'bildirimler', '/musterilerim': 'musterilerim', '/hesap-bilgileri': 'hesap-bilgileri',
  '/ayarlar': 'ayarlar', '/yardim-destek': 'yardim-destek'
};

function renderAccountRoute() {
  const pane = ACCOUNT_ROUTES[window.location.pathname.replace(/\/+$/, '')];
  if (!pane || typeof window.__openAccountCenter !== 'function') return;

  const modal = document.querySelector('#appModal');
  const modalCard = modal?.querySelector('.modal-card');
  const content = document.querySelector('#modalContent');
  if (!content) return;

  // Reuse the existing, tested account renderer but move its output into the page shell.
  window.__openAccountCenter(pane);
  const html = content.innerHTML;
  if (!html) return;

  const shell = document.querySelector('#accountRouteShell') || document.createElement('main');
  shell.id = 'accountRouteShell';
  shell.className = 'account-route-shell';
  shell.innerHTML = '<div class="account-route-inner">' + html + '</div>';

  const existing = document.querySelector('#accountRouteShell');
  if (!existing) {
    const anchor = document.querySelector('main') || document.querySelector('#app') || document.body;
    anchor.prepend(shell);
  }

  if (modal) { modal.classList.remove('show'); modal.setAttribute('aria-hidden', 'true'); }
  if (modalCard) modalCard.classList.remove('account-wide');
}

function boot() {
  window.setTimeout(renderAccountRoute, 0);
  window.setTimeout(renderAccountRoute, 150);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
