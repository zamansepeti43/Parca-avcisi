/* Account-route transition guard.
   Keep account content visible while the next route is being prepared. We also
   cache the last rendered pane in sessionStorage so returning to a route is
   immediate instead of showing a loading state while Supabase refreshes. */
const PANE_ROUTES = {
  profilim:'/profilim', ilanlarim:'/ilanlarim', araclarim:'/araclarim', taleplerim:'/taleplerim',
  mesajlarim:'/mesajlarim', favorilerim:'/favorilerim', 'kayitli-aramalar':'/kayitli-aramalarim',
  bildirimler:'/bildirimler', musterilerim:'/musterilerim', 'hesap-bilgileri':'/hesap-bilgileri',
  ayarlar:'/ayarlar', yardim:'/yardim-destek'
};
const CACHE_PREFIX = 'pa-account-pane-cache-v2:';

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

function paintCachedPane(path, name) {
  const cached = readCache(path);
  if (!cached) return false;
  const mount = document.querySelector('#accountRouteMount');
  const pane = mount?.querySelector('.account-pane');
  if (pane) pane.innerHTML = cached;
  const modalContent = document.querySelector('#modalContent');
  if (modalContent && name === '__openAccountCenter') modalContent.innerHTML = cached;
  return true;
}

function installGuard(name, expected) {
  const timer = window.setInterval(() => {
    const original = window[name];
    if (typeof original !== 'function' || original.__paRouteGuard) return;
    const guarded = function (...args) {
      const target = typeof expected === 'function' ? expected(...args) : expected;
      if (target && normalizePath() !== target) return Promise.resolve(undefined);
      const path = normalizePath();
      /* Paint before invoking the async renderer. This is the important part:
         getCurrentUser()/Supabase can take seconds, so waiting for the original
         function even one microtask would still expose its loading shell. */
      paintCachedPane(path, name);
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
  body.account-page-runtime #appModal:has(.modal-card.account-wide .account-shell),
  body.account-page-runtime #appModal:has(.account-shell) { display:none!important; visibility:hidden!important; pointer-events:none!important; }
  body.account-page-runtime .account-pane > .pane-loading { display:none!important; }
`;
document.head.appendChild(style);

let transitionCover = null;
let transitionTimer = 0;
let transitionObserver = null;

function removeTransitionCover() {
  if (transitionTimer) window.clearInterval(transitionTimer);
  transitionTimer = 0;
  if (transitionObserver) transitionObserver.disconnect();
  transitionObserver = null;
  transitionCover?.remove();
  transitionCover = null;
}
function routeContentReady() {
  const mount = document.querySelector('#accountRouteMount');
  const pane = mount?.querySelector('.account-pane');
  if (!mount || !pane) return false;
  if (pane.querySelector('.pane-loading')) return false;
  return pane.children.length > 0;
}
function waitForRouteContent() {
  const started = Date.now();
  const check = () => { if (routeContentReady() || Date.now() - started > 8000) removeTransitionCover(); };
  transitionTimer = window.setInterval(check, 40);
  check();
}
function createTransitionCover() {
  if (transitionCover) return;
  const main = document.querySelector('.account-route-main');
  if (!main) return;
  cacheCurrentPane();
  const cover = document.createElement('div');
  cover.className = 'pa-account-transition-cover';
  const snapshot = main.cloneNode(true);
  snapshot.removeAttribute('id');
  snapshot.querySelectorAll('[id]').forEach((node) => node.removeAttribute('id'));
  snapshot.querySelectorAll('a,button,input,select,textarea').forEach((node) => node.setAttribute('tabindex', '-1'));
  cover.appendChild(snapshot);
  document.documentElement.appendChild(cover);
  transitionCover = cover;
  waitForRouteContent();
}

const coverStyle = document.createElement('style');
coverStyle.id = 'account-transition-cover-css';
coverStyle.textContent = `
  .pa-account-transition-cover{position:fixed!important;inset:60px 0 68px!important;z-index:9998!important;overflow:auto!important;background:#0b0d10!important;color:#eef1f4!important;pointer-events:none!important;-webkit-overflow-scrolling:touch!important;}
  .pa-account-transition-cover > .account-route-main{width:100%!important;max-width:1180px!important;margin:0 auto!important;padding:14px 10px 40px!important;}
  .pa-account-transition-cover .account-route-header{display:none!important;}
  .pa-account-transition-cover .account-menu{position:static!important;}
  .pa-account-transition-cover *{animation:none!important;transition:none!important;}
  @media(min-width:761px){.pa-account-transition-cover{inset:64px 0 0!important;}.pa-account-transition-cover > .account-route-main{padding:24px 20px 64px!important;}}
`;
document.head.appendChild(coverStyle);

document.addEventListener('click', (event) => {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const link = event.target?.closest?.('a[href]');
  if (!link) return;
  const url = new URL(link.href, window.location.href);
  if (url.origin !== window.location.origin) return;
  if (!Object.values(PANE_ROUTES).includes(normalizePath(url.pathname))) return;
  if (normalizePath(url.pathname) === normalizePath()) return;
  cacheCurrentPane();
  createTransitionCover();
}, true);
window.addEventListener('popstate', () => { cacheCurrentPane(); if (Object.values(PANE_ROUTES).includes(normalizePath())) createTransitionCover(); });

const cacheObserver = new MutationObserver(() => {
  const path = normalizePath();
  if (!paneForPath(path)) return;
  const pane = document.querySelector('#accountRouteMount .account-pane');
  if (!pane || pane.querySelector('.pane-loading')) return;
  const html = pane.innerHTML;
  if (html && html.length > 40) writeCache(path, html);
});
cacheObserver.observe(document.documentElement, { childList:true, subtree:true });
