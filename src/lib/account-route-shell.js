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
  const content = document.querySelector('#modalContent');
  if (!content) return;

  // Ask the existing account center to render its tested panel, then transplant only its markup.
  window.__openAccountCenter(pane);
  const html = content.innerHTML;
  if (!html) return;

  let shell = document.querySelector('#accountRouteShell');
  if (!shell) {
    shell = document.createElement('main');
    shell.id = 'accountRouteShell';
    shell.className = 'account-route-shell';
    const app = document.querySelector('#app') || document.querySelector('main') || document.body;
    app.prepend(shell);
  }
  shell.innerHTML = '<div class="account-route-inner">' + html + '</div>';

  if (modal) {
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');
  }

  document.body.classList.add('has-account-route');
}

function boot() {
  renderAccountRoute();
  window.setTimeout(renderAccountRoute, 250);
  window.setTimeout(renderAccountRoute, 750);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
