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
const PANE_TITLES = {
  profilim: 'Profilim',
  araclarim: 'Araçlarım',
  ilanlarim: 'İlanlarım',
  taleplerim: 'Taleplerim',
  mesajlarim: 'Mesajlarım',
  favorilerim: 'Favorilerim',
  'kayitli-aramalar': 'Kayıtlı Aramalarım',
  bildirimler: 'Bildirimler',
  musterilerim: 'Müşterilerim',
  'hesap-bilgileri': 'Hesap Bilgileri',
  ayarlar: 'Ayarlar',
  yardim: 'Yardım & Destek',
};
let busy = false;

function normalize(path = window.location.pathname) { return path.replace(/\/+$/, '') || '/'; }

function setActivePane(pane) {
  const menu = document.querySelector('#accountRouteMount .account-menu');
  if (!menu) return;
  menu.querySelectorAll('[data-pane]').forEach((item) => item.classList.toggle('active', item.dataset.pane === pane));
}

function instantPaneHtml(pane) {
  const title = PANE_TITLES[pane] || 'Hesabım';
  return '<div class="account-pane-head"><h2>' + title + '</h2></div>'
    + '<div class="pa-account-instant-content" aria-hidden="true">'
    + '<div class="pa-account-skeleton pa-account-skeleton-title"></div>'
    + '<div class="pa-account-skeleton"></div>'
    + '<div class="pa-account-skeleton pa-account-skeleton-short"></div>'
    + '</div>';
}

function showInstantPane(visiblePane, pane) {
  visiblePane.innerHTML = instantPaneHtml(pane);
}

function ensureModal() {
  let modal = document.querySelector('#appModal');
  if (modal) return modal;
  modal = document.createElement('div');
  modal.id = 'appModal';
  modal.className = 'app-modal';
  modal.setAttribute('aria-hidden', 'true');
  modal.innerHTML = '<div class="modal-card account-wide" role="dialog" aria-modal="true"><button class="modal-close" data-close-modal aria-label="Kapat">×</button><div id="modalContent"></div></div>';
  modal.style.visibility = 'hidden';
  modal.style.pointerEvents = 'none';
  document.body.appendChild(modal);
  return modal;
}

function createCover() {
  const main = document.querySelector('.account-route-main');
  if (!main) return null;
  const cover = document.createElement('div');
  cover.className = 'pa-account-stable-cover';
  cover.style.cssText = 'position:fixed;inset:60px 0 92px;z-index:9998;overflow:auto;background:#0b0d10;color:#eef1f4;pointer-events:none;-webkit-overflow-scrolling:touch;';
  const snapshot = main.cloneNode(true);
  snapshot.removeAttribute('id');
  snapshot.querySelectorAll('[id]').forEach((node) => node.removeAttribute('id'));
  snapshot.querySelectorAll('a,button,input,select,textarea').forEach((node) => node.setAttribute('tabindex', '-1'));
  cover.appendChild(snapshot);
  document.body.appendChild(cover);
  return cover;
}

async function renderSavedVehicles(visiblePane) {
  const cover = createCover();
  visiblePane.style.visibility = 'hidden';
  try {
    await import('./saved-vehicles-ui.js');
    if (typeof window.__openSavedVehicles !== 'function') throw new Error('Araçlarım modülü hazır değil.');
    await window.__openSavedVehicles();
    if (!visiblePane.children.length) throw new Error('Araçlarım içeriği hazırlanamadı.');
  } finally {
    visiblePane.style.visibility = '';
    cover?.remove();
  }
}

async function renderAccountCenter(pane, visiblePane) {
  const modal = ensureModal();
  const content = modal.querySelector('#modalContent');
  if (!content) throw new Error('Hesap içerik alanı hazır değil.');
  modal.style.visibility = 'hidden';
  modal.style.pointerEvents = 'none';
  modal.classList.remove('show');
  modal.setAttribute('aria-hidden', 'true');
  const open = window.__openAccountCenter;
  if (typeof open !== 'function') await import('./account-center.js');
  if (typeof window.__openAccountCenter !== 'function') throw new Error('Hesap modülü hazır değil.');
  await window.__openAccountCenter(pane);
  const html = content.innerHTML;
  if (!html || content.querySelector('.pane-loading')) throw new Error('Hesap içeriği hazırlanamadı.');
  visiblePane.innerHTML = html;
  modal.classList.remove('show');
  modal.setAttribute('aria-hidden', 'true');
  modal.style.visibility = 'hidden';
  modal.style.pointerEvents = 'none';
}

async function renderAccountPane(route, { replace = false } = {}) {
  const pane = ROUTE_TO_PANE[normalize(route)];
  if (!pane || busy || (!replace && normalize() === normalize(route))) return;
  const mount = document.querySelector('#accountRouteMount');
  const visiblePane = mount?.querySelector('.account-pane');
  if (!visiblePane) return;

  busy = true;
  const oldUrl = normalize();
  try {
    if (!replace) history.pushState({}, '', route);

    // Make the interaction feel native: URL, active tab and visible target change
    // in the same frame. Data hydration continues asynchronously underneath.
    setActivePane(pane);
    showInstantPane(visiblePane, pane);

    if (pane === 'araclarim') await renderSavedVehicles(visiblePane);
    else await renderAccountCenter(pane, visiblePane);
    setActivePane(pane);
    window.dispatchEvent(new CustomEvent('parca:account-pane-changed', { detail: { pane, route } }));
    window.scrollTo({ top: 0, behavior: 'instant' });
  } catch (error) {
    history.replaceState({}, '', oldUrl);
    console.warn('[Parça Avcısı] hesap sekmesi geçişi başarısız', error);
  } finally {
    document.querySelectorAll('.pa-account-stable-cover').forEach((node) => node.remove());
    visiblePane.style.visibility = '';
    busy = false;
  }
}

function install() {
  window.addEventListener('click', (event) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const target = event.target?.closest?.('#accountRouteMount .account-menu [data-pane]');
    if (!target) return;
    const route = ACCOUNT_ROUTES[target.dataset.pane];
    if (!route) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    void renderAccountPane(route);
  }, true);

  window.addEventListener('popstate', () => {
    const route = normalize();
    if (!ROUTE_TO_PANE[route]) return;
    void renderAccountPane(route, { replace: true });
  });
}

install();
window.__accountStableNavigation = { renderAccountPane, routes: ACCOUNT_ROUTES };
