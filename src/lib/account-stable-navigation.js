const ACCOUNT_ROUTES = {
  profilim: '/profilim', araclarim: '/araclarim', ilanlarim: '/ilanlarim', taleplerim: '/taleplerim',
  mesajlarim: '/mesajlarim', favorilerim: '/favorilerim', 'kayitli-aramalar': '/kayitli-aramalarim',
  bildirimler: '/bildirimler', musterilerim: '/musterilerim', 'hesap-bilgileri': '/hesap-bilgileri',
  ayarlar: '/ayarlar', yardim: '/yardim-destek',
};
const ROUTE_TO_PANE = Object.fromEntries(Object.entries(ACCOUNT_ROUTES).map(([pane, route]) => [route, pane]));
const PANE_TITLES = {
  profilim: 'Profilim', araclarim: 'Araçlarım', ilanlarim: 'İlanlarım', taleplerim: 'Taleplerim',
  mesajlarim: 'Mesajlarım', favorilerim: 'Favorilerim', 'kayitli-aramalar': 'Kayıtlı Aramalarım',
  bildirimler: 'Bildirimler', musterilerim: 'Müşterilerim', 'hesap-bilgileri': 'Hesap Bilgileri',
  ayarlar: 'Ayarlar', yardim: 'Yardım & Destek',
};
let busy = false;
const paneCache = new Map();

function normalize(path = window.location.pathname) { return path.replace(/\/+$/, '') || '/'; }
function setActivePane(pane) {
  const menu = document.querySelector('#accountRouteMount .account-menu');
  if (!menu) return;
  menu.querySelectorAll('[data-pane]').forEach((item) => item.classList.toggle('active', item.dataset.pane === pane));
}
function instantPaneHtml(pane) {
  const title = PANE_TITLES[pane] || 'Hesabım';
  return '<div class="account-pane-head"><h2>' + title + '</h2></div><div class="pa-account-instant-content" aria-hidden="true"><div class="pa-account-skeleton pa-account-skeleton-title"></div><div class="pa-account-skeleton"></div><div class="pa-account-skeleton pa-account-skeleton-short"></div></div>';
}
function showInstantPane(visiblePane, pane) {
  const cached = paneCache.get(pane);
  if (cached) {
    visiblePane.innerHTML = cached;
    return true;
  }
  visiblePane.innerHTML = instantPaneHtml(pane);
  return false;
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
function extractPaneContent(html) {
  const template = document.createElement('template');
  template.innerHTML = html;
  const pane = template.content.querySelector('.account-shell .account-pane, .account-pane');
  if (!pane) return html;
  return pane.innerHTML;
}
async function renderSavedVehicles(visiblePane, hasCached) {
  await import('./saved-vehicles-ui.js');
  if (typeof window.__openSavedVehicles !== 'function') throw new Error('Araçlarım modülü hazır değil.');
  if (hasCached) return;
  await window.__openSavedVehicles();
  if (!visiblePane.children.length) throw new Error('Araçlarım içeriği hazırlanamadı.');
  paneCache.set('araclarim', visiblePane.innerHTML);
}
async function renderAccountCenter(pane, visiblePane) {
  const modal = ensureModal();
  const content = modal.querySelector('#modalContent');
  if (!content) throw new Error('Hesap içerik alanı hazır değil.');
  modal.style.visibility = 'hidden';
  modal.style.pointerEvents = 'none';
  modal.classList.remove('show');
  modal.setAttribute('aria-hidden', 'true');
  if (typeof window.__openAccountCenter !== 'function') await import('./account-center.js');
  if (typeof window.__openAccountCenter !== 'function') throw new Error('Hesap modülü hazır değil.');

  const previousPaneOnly = window.__parcaAccountPaneOnly;
  window.__parcaAccountPaneOnly = true;
  try {
    await window.__openAccountCenter(pane);
  } finally {
    window.__parcaAccountPaneOnly = previousPaneOnly;
  }

  const rawHtml = content.innerHTML;
  if (!rawHtml || content.querySelector('.pane-loading')) throw new Error('Hesap içeriği hazırlanamadı.');
  const html = extractPaneContent(rawHtml);
  if (!html) throw new Error('Hesap içerik alanı boş.');
  paneCache.set(pane, html);
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
    setActivePane(pane);
    const hasCached = showInstantPane(visiblePane, pane);
    if (pane === 'araclarim') await renderSavedVehicles(visiblePane, hasCached);
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
