const PANE_ROUTES = {
  profilim: '/profilim',
  ilanlarim: '/ilanlarim',
  taleplerim: '/taleplerim',
  mesajlarim: '/mesajlarim',
  favorilerim: '/favorilerim',
  kayitliAramalarim: '/kayitli-aramalarim',
  bildirimler: '/bildirimler',
  musterilerim: '/musterilerim',
  hesap: '/hesap-bilgileri',
  ayarlar: '/ayarlar',
  yardim: '/yardim-destek',
};

const normalizePane = (value) => String(value || '').trim();

function navigateToPane(pane) {
  const route = PANE_ROUTES[normalizePane(pane)];
  if (!route) return false;
  if (typeof window.__navigateAccountRoute === 'function') return window.__navigateAccountRoute(route);
  window.location.assign(route);
  return true;
}

// Do not intercept clicks here. The account transition guard must see the same
// click first so it can keep the current screen painted until the next pane is ready.
window.__accountPageNavigation = { navigateToPane, routes: PANE_ROUTES };
