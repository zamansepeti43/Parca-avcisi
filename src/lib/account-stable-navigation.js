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
  if (!pane || busy || (!replace && normalize() === normalize(route))) return;
  const mount = document.querySelector('#accountRouteMount');
  const visiblePane = mount?.querySelector('.account-pane');
  if (!visiblePane) return;

  busy = true;
  const oldUrl = normalize();
  const modal = document.querySelector('#appModal');
  const modalContent = document.querySelector('#modalContent');
  const previousModalStyle = modal ? { visibility: modal.style.visibility, pointerEvents: modal.style.pointerEvents } : null;
  try {
    if (!replace) history.pushState({}, '', route);

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
      if (typeof open !== 'function' || !modalContent) throw new Error('Hesap içeriği hazır değil.');

      if (modal) {
        modal.style.visibility = 'hidden';
        modal.style.pointerEvents = 'none';
      }
      await open(pane);
      const html = modalContent.innerHTML;
      if (!html || modalContent.querySelector('.pane-loading')) throw new Error('Hesap içeriği hazırlanamadı.');
      visiblePane.innerHTML = html;
      if (modal) {
        modal.classList.remove('show');
        modal.setAttribute('aria-hidden', 'true');
      }
    }

    setActivePane(pane);
    window.dispatchEvent(new CustomEvent('parca:account-pane-changed', { detail: { pane, route } }));
  } catch (error) {
    history.replaceState({}, '', oldUrl);
    console.warn('[Parça Avcısı] hesap sekmesi geçişi başarısız', error);
  } finally {
    if (modal && previousModalStyle) {
      modal.style.visibility = previousModalStyle.visibility;
      modal.style.pointerEvents = previousModalStyle.pointerEvents;
      modal.classList.remove('show');
      modal.setAttribute('aria-hidden', 'true');
    }
    busy = false;
  }
}

function install() {
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
