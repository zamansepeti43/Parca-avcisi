const path = window.location.pathname.replace(/\/+$/, '') || '/';
const ACCOUNT_ROUTES = new Set(['/profilim','/ilanlarim','/araclarim','/taleplerim','/mesajlarim','/favorilerim','/kayitli-aramalarim','/bildirimler','/musterilerim','/hesap-bilgileri','/ayarlar','/yardim-destek']);

const ACCOUNT_MENU = [
  ['profilim', 'Profilim', '/profilim'],
  ['ilanlarim', 'İlanlarım', '/ilanlarim'],
  ['araclarim', 'Araçlarım', '/araclarim'],
  ['taleplerim', 'Taleplerim', '/taleplerim'],
  ['mesajlarim', 'Mesajlarım', '/mesajlarim'],
  ['favorilerim', 'Favorilerim', '/favorilerim'],
  ['kayitli-aramalar', 'Kayıtlı Aramalarım', '/kayitli-aramalarim'],
  ['bildirimler', 'Bildirimler', '/bildirimler'],
  ['musterilerim', 'Müşterilerim', '/musterilerim'],
  ['hesap-bilgileri', 'Hesap Bilgileri', '/hesap-bilgileri'],
  ['ayarlar', 'Ayarlar', '/ayarlar'],
  ['yardim', 'Yardım & Destek', '/yardim-destek'],
];

function accountMenuHtml(active) {
  return ACCOUNT_MENU.map(([key, label, route]) => '<a class="account-menu-link ' + (active === key ? 'active' : '') + '" data-pane="' + key + '" href="' + route + '">' + (key === 'araclarim' ? '<span aria-hidden="true">🚗</span>' : '') + '<strong>' + label + '</strong></a>').join('') + '<a class="account-menu-link danger" href="/">Çıkış Yap</a>';
}

function baseAccountShell(active, bodyHtml) {
  return '<div class="account-shell"><aside class="account-menu">' + accountMenuHtml(active) + '</aside><section class="account-pane">' + bodyHtml + '</section></div>';
}

async function bootSavedVehiclesRoute() {
  document.body.className = 'account-page-runtime';
  document.body.style.cssText = 'margin:0;background:#0b0d10;color:#eef1f4;--gold:#d8ad4a;--ink:#0b0d10;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;min-height:100vh;';

  // Do not bootstrap the large account modal for Araçlarım. It used to leave a modal close button
  // on screen and wait for an unrelated profile query before the saved-vehicles pane could render.
  await import('./lib/account-center.css');
  document.body.innerHTML = '<header style="height:64px;border-bottom:1px solid #29313a;background:#0e1217;display:flex;align-items:center;justify-content:space-between;padding:0 20px;box-sizing:border-box;position:sticky;top:0;z-index:20"><a href="/" style="display:flex;align-items:center;gap:10px;color:#fff;text-decoration:none;font-weight:900;letter-spacing:.03em"><img src="/app-logo.png" width="38" height="38" style="border-radius:10px" alt="Parça Avcısı"><span>PARÇA AVCISI</span></a><a href="/" style="color:#aeb6bf;text-decoration:none;font-size:13px;font-weight:700">← Ana Sayfa</a></header><main style="width:100%;max-width:1180px;margin:0 auto;padding:20px;box-sizing:border-box"><div id="accountRouteMount">' + baseAccountShell('araclarim','<div class="pane-loading">Araçların hazırlanıyor…</div>') + '</div></main><div class="toast" id="toast" role="status" aria-live="polite"></div>';

  const { getCurrentUser } = await import('./lib/auth.js');
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    window.location.assign('/giris');
    return;
  }

  await import('./lib/saved-vehicles-ui.js');
  const pane = document.querySelector('.account-pane');
  if (pane && typeof window.__openSavedVehicles === 'function') {
    await window.__openSavedVehicles();
  }
}

async function bootAccountRoute() {
  document.body.className = 'account-page-runtime';
  document.body.style.cssText = 'margin:0;background:#0b0d10;color:#eef1f4;--gold:#d8ad4a;--ink:#0b0d10;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;min-height:100vh;';
  document.body.innerHTML = '<header style="height:64px;border-bottom:1px solid #29313a;background:#0e1217;display:flex;align-items:center;justify-content:space-between;padding:0 20px;box-sizing:border-box;position:sticky;top:0;z-index:20"><a href="/" style="display:flex;align-items:center;gap:10px;color:#fff;text-decoration:none;font-weight:900;letter-spacing:.03em"><img src="/app-logo.png" width="38" height="38" style="border-radius:10px" alt="Parça Avcısı"><span>PARÇA AVCISI</span></a><a href="/" style="color:#aeb6bf;text-decoration:none;font-size:13px;font-weight:700">← Ana Sayfa</a></header><main style="width:100%;max-width:1180px;margin:0 auto;padding:28px 20px 64px;box-sizing:border-box"><div id="accountRouteMount"><div style="padding:40px 0;text-align:center;color:#89939d">Yükleniyor…</div></div></main><div id="appModal" class="app-modal" aria-hidden="true"><div class="modal-card" role="dialog" aria-modal="true"><button class="modal-close" data-close-modal aria-label="Kapat">×</button><div id="modalContent"></div></div></div><div class="toast" id="toast" role="status" aria-live="polite"></div>';
  const { getCurrentUser } = await import('./lib/auth.js');
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    window.location.assign('/giris');
    return;
  }
  await import('./lib/account-center.js');
  const mount = document.querySelector('#accountRouteMount');
  const pane = ({'/profilim':'profilim','/ilanlarim':'ilanlarim','/taleplerim':'taleplerim','/mesajlarim':'mesajlarim','/favorilerim':'favorilerim','/kayitli-aramalarim':'kayitli-aramalar','/bildirimler':'bildirimler','/musterilerim':'musterilerim','/hesap-bilgileri':'hesap-bilgileri','/ayarlar':'ayarlar','/yardim-destek':'yardim'}[path]);
  if (!pane || typeof window.__openAccountCenter !== 'function') {
    mount.innerHTML = '<div style="padding:40px;border:1px solid #29313a;border-radius:16px">Sayfa yüklenemedi. Lütfen tekrar dene.</div>';
    return;
  }
  await window.__openAccountCenter(pane);
  const content = document.querySelector('#modalContent');
  mount.innerHTML = content?.innerHTML || '<div style="padding:40px">İçerik yüklenemedi.</div>';
  document.querySelector('#appModal')?.remove();

  // Ensure Araçlarım is present on every desktop/mobile account page without loading the heavy
  // saved-vehicles module on pages that do not need it.
  const menu = mount.querySelector('.account-menu');
  if (menu && !menu.querySelector('[data-pane="araclarim"]')) {
    const link = document.createElement('a');
    link.className = 'account-menu-link';
    link.dataset.pane = 'araclarim';
    link.href = '/araclarim';
    link.innerHTML = '<span aria-hidden="true">🚗</span><strong>Araçlarım</strong>';
    const profile = menu.querySelector('[data-pane="profilim"]');
    if (profile?.parentNode) profile.parentNode.insertBefore(link, profile.nextSibling); else menu.prepend(link);
  }

  mount.querySelectorAll('.account-menu [data-pane]').forEach((button) => {
    button.addEventListener('click', (event) => {
      const route = ACCOUNT_MENU.find(([key]) => key === button.dataset.pane)?.[2];
      if (!route) return;
      event.preventDefault();
      window.location.assign(route);
    });
  });
}

async function bootHome() {
  await import('./app.js');
  await import('./lib/route-actions.js');
  await import('./lib/header-navigation-final.js');
  await import('./lib/seo.js');
  await import('./lib/vehicle-seo-page.js');
  await import('./lib/seo-title-optimizer.js');
  await import('./lib/canonical-noindex.js');
  await import('./lib/service-seo-page.js');
  await import('./lib/internal-linking-seo.js');
  await import('./lib/schema-seo.js');
  await import('./lib/faq-seo.js');
  await import('./lib/about-contact-seo.js');
  await import('./lib/footer-seo.js');
  await import('./lib/legal-seo.js');
  await import('./lib/performance.js');
  await import('./lib/search-console-seo.js');
  await import('./lib/mobile-nav-fix.css');
  await import('./lib/mobile-header-fix.js');
  await import('./lib/categories-menu.js');
  await import('./lib/account-vehicles-menu.js');
  await import('./lib/home-redesign.css');
  await import('./lib/listing-entry-flow.js');
  await import('./lib/auth-header-bootstrap.js');
  await import('./lib/ui-flows.js');
  await import('./lib/listing-route-page.js');
  await import('./lib/auth-header-pages.js');
  await import('./lib/header-vehicles.js');
  await import('./lib/listing-detail.js');
  await import('./lib/listing-view.js');
  await import('./lib/part-icons-ui.js');
  await import('./lib/vin-ui-bridge.js');
  await import('./lib/vehicle-search-ui.js');
  await import('./lib/listing-card-click.js');
  await import('./lib/listing-filters-ui.js');
  await import('./lib/listing-creator.js');
  await import('./lib/photo-limit-ui.js');
  await import('./lib/account-center.js');
  await import('./lib/account-menu-fix.js');
  await import('./lib/account-drawer-ui.js');
  await import('./lib/account-page-navigation.js');
  await import('./lib/account-route-shell.js');
  await import('./lib/saved-vehicles-ui.js');
  await import('./lib/listing-report-ui.js');
}

if (path === '/araclarim') bootSavedVehiclesRoute();
else if (ACCOUNT_ROUTES.has(path)) bootAccountRoute();
else bootHome();
