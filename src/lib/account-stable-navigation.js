const ACCOUNT_ROUTES = {
  profilim: '/profilim',
  araclarim: '/araclarim',
  ilanlarim: '/ilanlarim',
  taleplerim: '/taleplerim',
  mesajlarim: '/mesajlarim',
  favorilerim: '/favorilerim',
  'kayitli-aramalar': '/kayitli-aramalarim',
  bildirimler: '/bildirimler',
  musterilerim: '/musterilerim',
  'hesap-bilgileri': '/hesap-bilgileri',
  ayarlar: '/ayarlar',
  yardim: '/yardim-destek',
};

const ROUTE_TO_PANE = Object.fromEntries(Object.entries(ACCOUNT_ROUTES).map(([pane, route]) => [route, pane]));
let busy = false;

function normalize(path = window.location.pathname) {
  return path.replace(/\/+$/, '') || '/';
}

function setActivePane(pane) {
  const menu = document.querySelector('#accountRouteMount .account-menu');
  if (!menu) return;
  menu.querySelectorAll('[data-pane]').forEach((item) => item.classList.toggle('active', item.dataset.pane === pane));
}

async function renderAccountPane(route, { replace = false } = {}) {
  const pane = ROUTE_TO_PANE[normalize(route)];
  if (!pane || busy || normalize() === normalize(route)) return;
  const mount = document.querySelector('#accountRouteMount');
  const visiblePane = mount?.querySelector('.account-pane');
  if (!visiblePane) return;

  busy = true;
  const oldUrl = normalize();
  try {
    // Change the URL without reloading or rebuilding the body. The existing account
    // shell stays on screen for the entire async render.
    history[replace ? 'replaceState' : 'pushState']({}, '', route);

    if (pane === 'araclarim') {
      const stage = document.createElement('div');
      stage.id = 'pa-account-stage';
      stage.style.cssText = 'position:fixed;left:-10000px;top:0;width:1px;height:1px;overflow:hidden;visibility:hidden;pointer-events:none;';
      stage.innerHTML = '<div class="account-pane"></div>';
      document.body.prepend(stage);
      try {
        await import('./saved-vehicles-ui.js');
        if (typeof window.__openSavedVehicles === 'function') await window.__openSavedVehicles();
        const stagedPane = stage.querySelector('.account-pane');
        if (!stagedPane?.children.length) throw new Error('Araçlarım içeriği hazırlanamadı.');
        visiblePane.innerHTML = stagedPane.innerHTML;
      } finally {
        stage.remove();
      }
    } else {
      const open = window.__openAccountCenter;
      const modalContent = document.querySelector('#modalContent');
      if (typeof open !== 'function' || !modalContent) throw new Error('Hesap içeriği hazır değil.');

      // account-center renders into the hidden modal. We copy only the finished
      // pane after the async data load, so the user never sees its loading state.
      await open(pane);
      const html = modalContent.innerHTML;
      if (!html || modalContent.querySelector('.pane-loading')) throw new Error('Hesap içeriği hazırlanamadı.');
      visiblePane.innerHTML = html;
    }

    setActivePane(pane);
    window.dispatchEvent(new CustomEvent('parca:account-pane-changed', { detail: { pane, route } }));
  } catch (error) {
    history.replaceState({}, '', oldUrl);
    console.warn('[Parça Avcısı] hesap sekmesi geçişi başarısız', error);
  } finally {
    busy = false;
  }
}

function install() {
  // Window-capture runs before main.js document-capture listeners, so the legacy
  // full-page boot path never gets a chance to blank the screen.
  window.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const target = event.target?.closest?.('#accountRouteMount .account-menu [data-pane]');
    if (!target) return;
    const route = ACCOUNT_ROUTES[target.dataset.pane];
    if (!route || normalize(route) === normalize()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    void renderAccountPane(route);
  }, true);

  window.addEventListener('popstate', (event) => {
    const route = normalize();
    const pane = ROUTE_TO_PANE[route];
    if (!pane) return;
    event.stopImmediatePropagation?.();
    const mount = document.querySelector('#accountRouteMount');
    if (!mount?.querySelector('.account-pane')) return;
    void renderAccountPane(route, { replace: true });
  });
}

install();
window.__accountStableNavigation = { renderAccountPane, routes: ACCOUNT_ROUTES };
