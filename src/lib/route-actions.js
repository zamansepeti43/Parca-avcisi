const ROUTES = {
  '#accountBtn': '/profilim',
  '#notifBell': '/bildirimler',
  '#favoriteLink': '/favorilerim',
  '#accountLink': '/profilim',
  '#mobileSell': '/ilan-ver',
  '#sellBtn': '/ilan-ver',
};

const routeForPane = (pane) => ({
  profilim: '/profilim',
  ilanlarim: '/ilanlarim',
  araclarim: '/araclarim',
  taleplerim: '/taleplerim',
  mesajlarim: '/mesajlarim',
  favorilerim: '/favorilerim',
  'kayitli-aramalar': '/kayitli-aramalarim',
  bildirimler: '/bildirimler',
  musterilerim: '/musterilerim',
  'hesap-bilgileri': '/hesap-bilgileri',
  ayarlar: '/ayarlar',
  yardim: '/yardim-destek',
}[String(pane || '').trim()]);

document.addEventListener('click', (event) => {
  const target = event.target?.closest?.('button, a');
  if (!target) return;

  const directRoute = Object.entries(ROUTES).find(([selector]) => target.matches(selector))?.[1];
  if (directRoute) {
    event.preventDefault();
    event.stopImmediatePropagation();
    window.location.assign(directRoute);
    return;
  }

  const paneTarget = target.closest('[data-account-pane], .account-menu [data-pane]');
  if (paneTarget) {
    const pane = paneTarget.dataset.accountPane || paneTarget.dataset.pane;
    const route = routeForPane(pane);
    if (route) {
      event.preventDefault();
      event.stopImmediatePropagation();
      window.location.assign(route);
    }
  }
}, true);
