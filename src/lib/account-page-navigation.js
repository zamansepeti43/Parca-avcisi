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
  window.location.assign(route);
  return true;
}

// Account-center menu items become real pages instead of opening the large modal.
document.addEventListener('click', (event) => {
  const item = event.target.closest?.('.account-menu [data-pane]');
  if (!item) return;
  const pane = normalizePane(item.dataset.pane);
  if (!PANE_ROUTES[pane]) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  navigateToPane(pane);
}, true);

window.__accountPageNavigation = { navigateToPane, routes: PANE_ROUTES };
