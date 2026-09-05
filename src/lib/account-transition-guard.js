/* Prevent overlapping account-route async boots from painting stale pages.
   Account routes are rendered asynchronously; if the user taps another tab before
   the previous route finishes, the older boot must not overwrite the new route. */
const PANE_ROUTES = {
  profilim:'/profilim', ilanlarim:'/ilanlarim', araclarim:'/araclarim', taleplerim:'/taleplerim',
  mesajlarim:'/mesajlarim', favorilerim:'/favorilerim', 'kayitli-aramalar':'/kayitli-aramalarim',
  bildirimler:'/bildirimler', musterilerim:'/musterilerim', 'hesap-bilgileri':'/hesap-bilgileri',
  ayarlar:'/ayarlar', yardim:'/yardim-destek'
};

function routeForPane(pane) { return PANE_ROUTES[pane] || ''; }

function installGuard(name, expected) {
  let wrapped = false;
  const timer = window.setInterval(() => {
    const original = window[name];
    if (typeof original !== 'function' || original.__paRouteGuard) return;
    const guarded = async function (...args) {
      const target = typeof expected === 'function' ? expected(...args) : expected;
      if (target && window.location.pathname.replace(/\/+$/, '') !== target) return undefined;
      return original.apply(this, args);
    };
    guarded.__paRouteGuard = true;
    guarded.__paOriginal = original;
    window[name] = guarded;
    wrapped = true;
    if (wrapped) window.clearInterval(timer);
  }, 10);
  window.setTimeout(() => window.clearInterval(timer), 15000);
}

installGuard('__openSavedVehicles', '/araclarim');
installGuard('__openAccountCenter', (pane) => routeForPane(pane));

/* The account center is used as an internal renderer during route bootstrap.
   Hide only that renderer when it contains the account shell; real action modals
   remain visible. */
const style = document.createElement('style');
style.id = 'account-transition-guard-css';
style.textContent = `
  body.account-page-runtime #appModal:has(.modal-card.account-wide .account-shell),
  body.account-page-runtime #appModal:has(.account-shell) { display:none!important; visibility:hidden!important; pointer-events:none!important; }
`;
document.head.appendChild(style);
