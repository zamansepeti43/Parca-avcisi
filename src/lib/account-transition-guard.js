/* Account-route transition guard.
   Account pages already have a stable shell. Do not clone the shell into a
   fixed overlay: bootAccountRoute() replaces document.body, so an overlay
   mounted on documentElement can survive that replacement and become a
   permanently stale second account screen. */
const PANE_ROUTES = {
  profilim:'/profilim', ilanlarim:'/ilanlarim', araclarim:'/araclarim', taleplerim:'/taleplerim',
  mesajlarim:'/mesajlarim', favorilerim:'/favorilerim', 'kayitli-aramalar':'/kayitli-aramalarim',
  bildirimler:'/bildirimler', musterilerim:'/musterilerim', 'hesap-bilgileri':'/hesap-bilgileri',
  ayarlar:'/ayarlar', yardim:'/yardim-destek'
};
const CACHE_PREFIX = 'pa-account-pane-cache-v3:';

function normalizePath(path = window.location.pathname) { return path.replace(/\/+$/, '') || '/'; }
function paneForPath(path = window.location.pathname) {
  const normalized = normalizePath(path);
  return Object.entries(PANE_ROUTES).find(([, route]) => route === normalized)?.[0] || '';
}
function cacheKey(path) { return CACHE_PREFIX + normalizePath(path); }
function readCache(path) { try { return sessionStorage.getItem(cacheKey(path)) || ''; } catch (_) { return ''; } }
function writeCache(path, html) {
  if (!html || html.length < 40) return;
  try { sessionStorage.setItem(cacheKey(path), html); } catch (_) {}
}
function cacheCurrentPane(path = window.location.pathname) {
  const pane = document.querySelector('#accountRouteMount .account-pane');
  if (!pane || pane.querySelector('.pane-loading')) return;
  const html = pane.innerHTML;
  if (html) writeCache(path, html);
}
function routeForPane(pane) { return PANE_ROUTES[pane] || ''; }

function paintCachedPane(path) {
  const cached = readCache(path);
  if (!cached) return false;
  const pane = document.querySelector('#accountRouteMount .account-pane');
  if (pane) pane.innerHTML = cached;
  return true;
}

function installGuard(name, expected) {
  const timer = window.setInterval(() => {
    const original = window[name];
    if (typeof original !== 'function' || original.__paRouteGuard) return;
    const guarded = function (...args) {
      const target = typeof expected === 'function' ? expected(...args) : expected;
      if (target && normalizePath() !== target) return Promise.resolve(undefined);
      paintCachedPane(normalizePath());
      return original.apply(this, args);
    };
    guarded.__paRouteGuard = true;
    guarded.__paOriginal = original;
    window[name] = guarded;
    window.clearInterval(timer);
  }, 10);
  window.setTimeout(() => window.clearInterval(timer), 15000);
}

installGuard('__openSavedVehicles', '/araclarim');
installGuard('__openAccountCenter', (pane) => routeForPane(pane));

const style = document.createElement('style');
style.id = 'account-transition-guard-css';
style.textContent = `
  body.account-page-runtime #appModal { display:none!important; visibility:hidden!important; pointer-events:none!important; }
  body.account-page-runtime .account-pane > .pane-loading { display:none!important; }
`;
document.head.appendChild(style);

/* Keep the currently rendered pane cache fresh. There is intentionally no
   transition overlay or cloned DOM here. */
const cacheObserver = new MutationObserver(() => {
  const path = normalizePath();
  if (!paneForPath(path)) return;
  const pane = document.querySelector('#accountRouteMount .account-pane');
  if (!pane || pane.querySelector('.pane-loading')) return;
  const html = pane.innerHTML;
  if (html && html.length > 40) writeCache(path, html);
});
cacheObserver.observe(document.documentElement, { childList:true, subtree:true });
