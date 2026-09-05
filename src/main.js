const initialPath = window.location.pathname.replace(/\/+$/, '') || '/';
let activePath = initialPath;
const ACCOUNT_ROUTES = new Set(['/profilim','/ilanlarim','/araclarim','/taleplerim','/mesajlarim','/favorilerim','/kayitli-aramalarim','/bildirimler','/musterilerim','/hesap-bilgileri','/ayarlar','/yardim-destek']);
const ACCOUNT_MENU = [
  ['profilim', 'Profilim', '/profilim'], ['ilanlarim', 'İlanlarım', '/ilanlarim'], ['araclarim', 'Araçlarım', '/araclarim'],
  ['taleplerim', 'Taleplerim', '/taleplerim'], ['mesajlarim', 'Mesajlarım', '/mesajlarim'], ['favorilerim', 'Favorilerim', '/favorilerim'],
  ['kayitli-aramalar', 'Kayıtlı Aramalarım', '/kayitli-aramalarim'], ['bildirimler', 'Bildirimler', '/bildirimler'],
  ['musterilerim', 'Müşterilerim', '/musterilerim'], ['hesap-bilgileri', 'Hesap Bilgileri', '/hesap-bilgileri'],
  ['ayarlar', 'Ayarlar', '/ayarlar'], ['yardim', 'Yardım & Destek', '/yardim-destek'],
];
function accountMenuHtml(active) { return ACCOUNT_MENU.map(([key, label, route]) => '<a class="account-menu-link ' + (active === key ? 'active' : '') + '" data-pane="' + key + '" href="' + route + '">' + (key === 'araclarim' ? '<span aria-hidden="true">🚗</span>' : '') + '<strong>' + label + '</strong></a>').join('') + '<a class="account-menu-link danger" href="/">Çıkış Yap</a>'; }
function baseAccountShell(active, bodyHtml) { return '<div class="account-shell"><aside class="account-menu">' + accountMenuHtml(active) + '</aside><section class="account-pane">' + bodyHtml + '</section></div>'; }
const ACCOUNT_ROUTE_CSS = `<style id="account-route-css">.account-page-runtime{min-height:100vh!important;background:#0b0d10!important;color:#eef1f4!important}.account-page-runtime *{box-sizing:border-box}.account-route-header{height:64px;border-bottom:1px solid #29313a;background:#0e1217;display:flex;align-items:center;justify-content:space-between;padding:0 20px;position:sticky;top:0;z-index:20}.account-route-header a{text-decoration:none}.account-route-main{width:100%;max-width:1180px;margin:0 auto;padding:24px 20px 64px}.account-shell{display:grid;grid-template-columns:220px minmax(0,1fr);gap:24px}.account-menu{display:flex;flex-direction:column;gap:3px;padding:8px;border:1px solid #29313a;border-radius:16px;background:#10151b;align-self:start;position:sticky;top:88px;min-width:0}.account-menu-link{display:flex!important;align-items:center!important;gap:9px!important;width:100%!important;min-height:40px!important;padding:10px 12px!important;border:0!important;border-radius:10px!important;background:transparent!important;color:#aab2bb!important;text-decoration:none!important;font:700 13px/1.2 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;white-space:nowrap!important}.account-menu-link:hover{background:#171d23!important;color:#fff!important}.account-menu-link.active{background:#d8ad4a!important;color:#0b0d10!important}.account-menu-link.danger{color:#e46b6b!important}.account-pane{min-width:0}.account-pane-head h2{color:#fff}.account-page-runtime .pane-loading{padding:40px 0;text-align:center;color:#89939d}.account-page-runtime .form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.account-page-runtime .form-grid label{display:grid;gap:6px;font-size:11px;font-weight:750;color:#9aa3ad}.account-page-runtime .form-grid input,.account-page-runtime .form-grid select{width:100%;padding:12px;border:1px solid #303944;border-radius:10px;background:#11161c;color:#eef1f4}.account-page-runtime .pane-btn{cursor:pointer}.account-page-runtime .saved-vehicle-row{cursor:pointer}.account-page-runtime .saved-vehicle-row:hover{border-color:#46515d}.account-page-runtime .toast{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:100;padding:11px 15px;border:1px solid #39434d;border-radius:10px;background:#161c23;color:#fff;box-shadow:0 10px 30px rgba(0,0,0,.35);opacity:0;pointer-events:none;transition:opacity .18s}.account-page-runtime .toast.show{opacity:1}@media(max-width:760px){.account-route-header{height:60px;padding:0 14px}.account-route-header img{width:34px;height:34px}.account-route-header span{font-size:15px}.account-route-main{padding:14px 10px 40px}.account-shell{display:block}.account-menu{position:static;display:flex;flex-direction:row;overflow-x:auto;overflow-y:hidden;flex-wrap:nowrap;gap:4px;padding:6px;margin-bottom:14px;-webkit-overflow-scrolling:touch;scrollbar-width:none}.account-menu::-webkit-scrollbar{display:none}.account-menu-link{flex:0 0 auto!important;width:auto!important;min-height:38px!important;padding:9px 11px!important;font-size:12px!important}.account-pane-head h2{font-size:23px}.account-page-runtime .form-grid{grid-template-columns:1fr}.account-page-runtime .pane-row{align-items:flex-start;flex-direction:column}.account-page-runtime .pane-actions{width:100%;justify-content:flex-start}.account-page-runtime .pane-actions button{min-height:42px}}</style>`;
async function bootSavedVehiclesRoute() {
  document.body.className = 'account-page-runtime'; document.body.style.cssText = 'margin:0;background:#0b0d10;color:#eef1f4;--gold:#d8ad4a;--ink:#0b0d10;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;min-height:100vh;';
  document.body.innerHTML = ACCOUNT_ROUTE_CSS + '<header class="account-route-header"><a href="/" style="display:flex;align-items:center;gap:10px;color:#fff;font-weight:900;letter-spacing:.03em"><img src="/app-logo.png" width="38" height="38" style="border-radius:10px" alt="Parça Avcısı"><span>PARÇA AVCISI</span></a><a href="/" style="color:#aeb6bf;font-size:13px;font-weight:700">← Ana Sayfa</a></header><main class="account-route-main"><div id="accountRouteMount">' + baseAccountShell('araclarim','') + '</div></main><div class="toast" id="toast" role="status" aria-live="polite"></div>';
  const { getCurrentUser } = await import('./lib/auth.js'); const user = await getCurrentUser().catch(() => null); if (!user) { window.location.assign('/giris'); return; }
  await import('./lib/turkey-vehicle-catalog-fix.js'); await import('./lib/saved-vehicles-ui.js');
  if (document.querySelector('.account-pane') && typeof window.__openSavedVehicles === 'function') await window.__openSavedVehicles();
}
async function bootAccountRoute(route = activePath) {
  activePath = route;
  document.body.className = 'account-page-runtime'; document.body.style.cssText = 'margin:0;background:#0b0d10;color:#eef1f4;--gold:#d8ad4a;--ink:#0b0d10;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;min-height:100vh;';
  document.body.innerHTML = ACCOUNT_ROUTE_CSS + '<header class="account-route-header"><a href="/" style="display:flex;align-items:center;gap:10px;color:#fff;font-weight:900;letter-spacing:.03em"><img src="/app-logo.png" width="38" height="38" style="border-radius:10px" alt="Parça Avcısı"><span>PARÇA AVCISI</span></a><a href="/" style="color:#aeb6bf;font-size:13px;font-weight:700">← Ana Sayfa</a></header><main class="account-route-main"><div id="accountRouteMount">' + baseAccountShell('', '') + '</div></main><div id="appModal" class="app-modal" aria-hidden="true"><div class="modal-card" role="dialog" aria-modal="true"><button class="modal-close" data-close-modal aria-label="Kapat">×</button><div id="modalContent"></div></div></div><div class="toast" id="toast" role="status" aria-live="polite"></div>';
  const { getCurrentUser } = await import('./lib/auth.js'); const user = await getCurrentUser().catch(() => null); if (!user) { window.location.assign('/giris'); return; }
  await import('./lib/account-center.js'); const mount = document.querySelector('#accountRouteMount');
  const pane = ({'/profilim':'profilim','/ilanlarim':'ilanlarim','/taleplerim':'taleplerim','/mesajlarim':'mesajlarim','/favorilerim':'favorilerim','/kayitli-aramalarim':'kayitli-aramalar','/bildirimler':'bildirimler','/musterilerim':'musterilerim','/hesap-bilgileri':'hesap-bilgileri','/ayarlar':'ayarlar','/yardim-destek':'yardim'}[activePath]);
  if (!pane || typeof window.__openAccountCenter !== 'function') { mount.innerHTML = '<div style="padding:40px;border:1px solid #29313a;border-radius:16px">Sayfa yüklenemedi. Lütfen tekrar dene.</div>'; return; }
  await window.__openAccountCenter(pane); mount.innerHTML = document.querySelector('#modalContent')?.innerHTML || '<div style="padding:40px">İçerik yüklenemedi.</div>'; document.querySelector('#appModal')?.remove();
  const menu = mount.querySelector('.account-menu'); if (menu && !menu.querySelector('[data-pane="araclarim"]')) { const link = document.createElement('a'); link.className = 'account-menu-link'; link.dataset.pane = 'araclarim'; link.href = '/araclarim'; link.innerHTML = '<span aria-hidden="true">🚗</span><strong>Araçlarım</strong>'; const profile = menu.querySelector('[data-pane="profilim"]'); if (profile?.parentNode) profile.parentNode.insertBefore(link, profile.nextSibling); else menu.prepend(link); }
  mount.querySelectorAll('.account-menu [data-pane]').forEach((button) => button.addEventListener('click', (event) => { const route = ACCOUNT_MENU.find(([key]) => key === button.dataset.pane)?.[2]; if (!route) return; event.preventDefault(); navigateAccount(route); }));
}
function navigateAccount(route, replace = false) {
  if (!ACCOUNT_ROUTES.has(route)) return;
  if (route === activePath) return;
  activePath = route;
  history[replace ? 'replaceState' : 'pushState']({}, '', route);
  if (route === '/araclarim') void bootSavedVehiclesRoute(); else void bootAccountRoute(route);
  window.scrollTo({ top: 0, behavior: 'instant' });
}
function installInstantAccountNavigation() {
  document.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target?.closest?.('a[href]');
    if (!link) return;
    const url = new URL(link.href, window.location.href);
    if (url.origin !== window.location.origin || !ACCOUNT_ROUTES.has(url.pathname)) return;
    event.preventDefault(); navigateAccount(url.pathname);
  }, true);
  window.addEventListener('popstate', () => {
    const route = window.location.pathname.replace(/\/+$/, '') || '/';
    if (!ACCOUNT_ROUTES.has(route)) { window.location.reload(); return; }
    activePath = route;
    if (route === '/araclarim') void bootSavedVehiclesRoute(); else void bootAccountRoute(route);
  });
}
async function bootHome() {
  await import('./app.js');
  const turkeyFix = import('./lib/turkey-vehicle-catalog-fix.js');
  const listingViewReady = import('./lib/listing-view.js');
  const nonCritical = Promise.all([
    import('./lib/route-actions.js'), import('./lib/header-navigation-final.js'), import('./lib/seo.js'),
    import('./lib/vehicle-seo-page.js'), import('./lib/seo-title-optimizer.js'), import('./lib/canonical-noindex.js'),
    import('./lib/service-seo-page.js'), import('./lib/internal-linking-seo.js'), import('./lib/schema-seo.js'),
    import('./lib/faq-seo.js'), import('./lib/about-contact-seo.js'), import('./lib/footer-seo.js'),
    import('./lib/legal-seo.js'), import('./lib/performance.js'), import('./lib/search-console-seo.js'),
    import('./lib/mobile-nav-fix.css'), import('./lib/mobile-header-fix.js'), import('./lib/categories-menu.js'),
    import('./lib/account-vehicles-menu.js'), import('./lib/home-redesign.css'), import('./lib/listing-entry-flow.js'),
    import('./lib/auth-header-bootstrap.js')
  ]);
  await turkeyFix;
  await import('./lib/ui-flows.js');
  await Promise.all([
    import('./lib/auth-header-pages.js'), import('./lib/header-vehicles.js'),
    import('./lib/part-icons-ui.js'), import('./lib/vin-ui-bridge.js'), import('./lib/vehicle-search-ui.js'),
    import('./lib/listing-card-click.js'), import('./lib/listing-filters-ui.js'), import('./lib/photo-limit-ui.js'),
    import('./lib/account-center.js'), import('./lib/account-menu-fix.js'),
    import('./lib/account-page-navigation.js'), import('./lib/account-route-shell.js'), import('./lib/saved-vehicles-ui.js'),
    import('./lib/listing-report-ui.js'), listingViewReady
  ]);
  const loadDetail = () => import('./lib/listing-detail.js');
  if (/^#\/ilan\/[^#]+$/.test(window.location.hash || '')) await loadDetail();
  else window.addEventListener('hashchange', () => { if (/^#\/ilan\/[^#]+$/.test(window.location.hash || '')) void loadDetail(); }, { once: false });
  if (activePath === '/ilan-ver') await import('./lib/listing-route-page.js');
  else window.addEventListener('click', (event) => {
    const target = event.target?.closest?.('#sellBtn,#mobileSell');
    if (target) void import('./lib/listing-route-page.js');
  }, { capture: true, once: true });
  await nonCritical;
}
installInstantAccountNavigation();
if (initialPath === '/araclarim') bootSavedVehiclesRoute(); else if (ACCOUNT_ROUTES.has(initialPath)) bootAccountRoute(initialPath); else bootHome();