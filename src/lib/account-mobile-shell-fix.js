import './account-stable-navigation.js';

/*
 * Account routes use one DOM shell. This module is responsible for the
 * account-page mobile navigation and keeping the visible account menu ordered.
 * The bottom navigation intentionally mirrors the home-page mobile nav so it
 * does not jump or change appearance when entering the account area.
 */
const ACCOUNT_ORDER = ['profilim','araclarim','ilanlarim','taleplerim','mesajlarim','favorilerim','kayitli-aramalar','bildirimler','musterilerim','hesap-bilgileri','ayarlar','yardim'];
const STYLE_ID = 'account-mobile-shell-fix-css';
let accountMenuScrollLeft = 0;
let applying = false;

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @media (max-width:760px){
      body.has-account-mobile-nav{padding-bottom:96px!important;}
      body.has-account-mobile-nav .account-mobile-nav{
        position:fixed!important;left:10px!important;right:10px!important;bottom:8px!important;width:auto!important;height:78px!important;
        display:grid!important;grid-template-columns:repeat(5,minmax(0,1fr))!important;align-items:center!important;gap:2px!important;
        margin:0!important;padding:8px 8px calc(8px + env(safe-area-inset-bottom))!important;z-index:9999!important;
        background:rgba(12,16,21,.96)!important;border:1px solid rgba(255,255,255,.10)!important;border-radius:24px!important;
        box-shadow:0 16px 42px rgba(0,0,0,.48),0 0 0 1px rgba(246,185,0,.025)!important;
        backdrop-filter:blur(22px)!important;-webkit-backdrop-filter:blur(22px)!important;
      }
      body.has-account-mobile-nav .account-mobile-nav a{
        position:relative!important;width:100%!important;height:60px!important;min-width:0!important;margin:0!important;padding:7px 2px!important;
        display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:5px!important;
        border:0!important;border-radius:17px!important;background:transparent!important;color:#89939d!important;text-decoration:none!important;
        font:700 10px/1 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;-webkit-tap-highlight-color:transparent!important;
      }
      body.has-account-mobile-nav .account-mobile-nav a:active{transform:scale(.94)!important;}
      body.has-account-mobile-nav .account-mobile-nav a[aria-current="page"]{color:#f6b900!important;background:rgba(246,185,0,.085)!important;}
      body.has-account-mobile-nav .account-mobile-nav a[aria-current="page"]::after{content:"";position:absolute;bottom:4px;width:4px;height:4px;border-radius:50%;background:#f6b900;box-shadow:0 0 10px rgba(246,185,0,.65);}
      body.has-account-mobile-nav .account-mobile-nav .mobile-nav-icon{width:24px!important;height:24px!important;display:grid!important;place-items:center!important;}
      body.has-account-mobile-nav .account-mobile-nav .mobile-nav-icon svg{width:22px!important;height:22px!important;fill:none!important;stroke:currentColor!important;stroke-width:1.8!important;stroke-linecap:round!important;stroke-linejoin:round!important;}
      body.has-account-mobile-nav .account-mobile-nav a small{display:block!important;margin:0!important;padding:0!important;color:inherit!important;font:800 9px/1.1 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;white-space:nowrap!important;letter-spacing:.01em!important;}
      body.has-account-mobile-nav .account-mobile-nav .account-mobile-sell{
        position:relative!important;width:64px!important;height:64px!important;justify-self:center!important;align-self:center!important;
        padding:0!important;margin:-24px 0 0!important;border-radius:50%!important;background:#f6b900!important;color:#101318!important;
        border:4px solid #0c1015!important;font-size:0!important;box-shadow:0 9px 25px rgba(0,0,0,.45),0 0 0 1px rgba(246,185,0,.35),0 0 24px rgba(246,185,0,.18)!important;
      }
      body.has-account-mobile-nav .account-mobile-nav .account-mobile-sell::before{content:"";position:absolute;inset:4px;border:1px solid rgba(255,255,255,.30);border-radius:50%;pointer-events:none;}
      body.has-account-mobile-nav .account-mobile-nav .account-mobile-sell .mobile-nav-plus{display:grid!important;place-items:center!important;width:100%!important;height:100%!important;font:300 39px/1 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;transform:translateY(-1px)!important;}
      body.has-account-mobile-nav .account-mobile-nav .account-mobile-sell small{position:absolute!important;left:50%!important;bottom:13px!important;transform:translate(-50%,100%)!important;color:#aeb7c0!important;font-size:8px!important;font-weight:800!important;white-space:nowrap!important;}
      body.has-account-mobile-nav .account-mobile-nav #favoriteLink,
      body.has-account-mobile-nav .account-mobile-nav #accountLink{color:#89939d!important;}
      body.has-account-mobile-nav .account-mobile-nav #favoriteLink[aria-current="page"],
      body.has-account-mobile-nav .account-mobile-nav #accountLink[aria-current="page"]{color:#f6b900!important;}
      html[data-pa-theme="light"] body.has-account-mobile-nav .account-mobile-nav{background:rgba(255,255,255,.96)!important;border-color:#e0e4e8!important;box-shadow:0 14px 34px rgba(20,28,36,.18)!important;}
      html[data-pa-theme="light"] body.has-account-mobile-nav .account-mobile-nav a{color:#66717b!important;}
      html[data-pa-theme="light"] body.has-account-mobile-nav .account-mobile-nav a[aria-current="page"]{color:#b17f00!important;background:rgba(242,181,0,.11)!important;}
      html[data-pa-theme="light"] body.has-account-mobile-nav .account-mobile-nav a[aria-current="page"]::after{background:#c08b00!important;}
      html[data-pa-theme="light"] body.has-account-mobile-nav .account-mobile-nav .account-mobile-sell{border-color:#fff!important;color:#111!important;background:#f2b500!important;}
      html[data-pa-theme="light"] body.has-account-mobile-nav .account-mobile-nav .account-mobile-sell small{color:#66717b!important;}
      html[data-pa-theme="dark"] body.has-account-mobile-nav .account-mobile-nav{background:rgba(12,16,21,.96)!important;border-color:rgba(255,255,255,.10)!important;}
      html[data-pa-theme="dark"] body.has-account-mobile-nav .account-mobile-nav a{color:#89939d!important;}
      html[data-pa-theme="dark"] body.has-account-mobile-nav .account-mobile-nav a[aria-current="page"]{color:#f6b900!important;}
      body.account-page-runtime #accountRouteMount .account-menu{
        position:sticky!important;top:60px!important;z-index:40!important;margin-bottom:14px!important;background:#10151b!important;box-shadow:0 8px 20px rgba(0,0,0,.18)!important;
      }
      html[data-pa-theme="light"] body.account-page-runtime #accountRouteMount .account-menu{background:#fff!important;box-shadow:0 8px 20px rgba(28,36,44,.10)!important;}
    }
    @media (min-width:761px){.account-mobile-nav{display:none!important;}}
  `;
  document.head.appendChild(style);
}

function ensureVehiclesTab(menu) {
  if (!menu || menu.querySelector('[data-pane="araclarim"]')) return;
  const link = document.createElement('a');
  link.className = 'account-menu-link';
  link.dataset.pane = 'araclarim';
  link.href = '/araclarim';
  link.innerHTML = '<span aria-hidden="true">🚗</span><strong>Araçlarım</strong>';
  const profile = menu.querySelector('[data-pane="profilim"]');
  if (profile?.parentNode) profile.parentNode.insertBefore(link, profile.nextSibling);
  else menu.prepend(link);
}

function bindAccountMenuScroll(menu) {
  if (!menu || menu.dataset.accountScrollBound === '1') return;
  menu.dataset.accountScrollBound = '1';
  menu.addEventListener('scroll', () => { accountMenuScrollLeft = menu.scrollLeft; }, { passive: true });
}

function restoreAccountMenuScroll(menu) {
  if (!menu) return;
  requestAnimationFrame(() => { if (document.contains(menu)) menu.scrollLeft = accountMenuScrollLeft; });
}

function normalizeAccountMenu(menu) {
  if (!menu) return;
  ensureVehiclesTab(menu);
  bindAccountMenuScroll(menu);
  const items = [...menu.children];
  const paneItems = items.filter((item) => item.dataset?.pane);
  const desired = ACCOUNT_ORDER.map((key) => paneItems.find((item) => item.dataset.pane === key)).filter(Boolean);
  const signOut = items.find((item) => item.classList?.contains('danger') || item.classList?.contains('account-signout-link') || item.dataset?.accountSignout !== undefined);
  const ordered = signOut ? [...desired, signOut] : desired;
  if (items.length === ordered.length && items.every((item, index) => item === ordered[index])) { restoreAccountMenuScroll(menu); return; }
  const fragment = document.createDocumentFragment();
  ordered.forEach((item) => fragment.appendChild(item));
  menu.appendChild(fragment);
  restoreAccountMenuScroll(menu);
}

function enforceSingleAccountShell() {
  const mount = document.querySelector('#accountRouteMount');
  if (!mount) return;
  const shells = [...mount.querySelectorAll('.account-shell')];
  if (shells.length <= 1) return;

  const rootShell = shells[0];
  for (const nestedShell of shells.slice(1)) {
    const nestedPane = nestedShell.querySelector(':scope > .account-pane') || nestedShell.querySelector('.account-pane');
    const parentPane = nestedShell.closest('.account-pane');
    if (nestedPane && parentPane && parentPane !== nestedPane) parentPane.innerHTML = nestedPane.innerHTML;
    nestedShell.remove();
  }

  const remaining = mount.querySelectorAll('.account-shell');
  if (remaining.length > 1) for (const extra of [...remaining].slice(1)) extra.remove();
  normalizeAccountMenu(rootShell.querySelector('.account-menu'));
}

function ensureMobileNav() {
  if (!document.body.classList.contains('account-page-runtime')) return;
  ensureStyles();
  let nav = document.querySelector('.account-mobile-nav');
  if (!nav) {
    nav = document.createElement('nav');
    nav.className = 'account-mobile-nav mobile-nav';
    nav.setAttribute('aria-label', 'Mobil menü');
    nav.innerHTML =
      '<a href="/" data-account-nav="home" aria-label="Ana Sayfa"><span class="mobile-nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3 10.8 12 3l9 7.8v9.2a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg></span><small>Ana Sayfa</small></a>' +
      '<a href="/" data-account-nav="search" aria-label="Parça ara"><span class="mobile-nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="10.8" cy="10.8" r="6.7"/><path d="m16 16 5 5"/></svg></span><small>Ara</small></a>' +
      '<a href="/ilan-ver" class="account-mobile-sell" data-account-nav="sell" aria-label="İlan Ver"><span class="mobile-nav-plus" aria-hidden="true">+</span><small>İlan Ver</small></a>' +
      '<a href="/favorilerim" id="favoriteLink" data-account-nav="favorites" aria-label="Favoriler"><span class="mobile-nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M20.8 8.7c0 5.3-8.8 10.3-8.8 10.3S3.2 14 3.2 8.7A4.7 4.7 0 0 1 12 6.1a4.7 4.7 0 0 1 8.8 2.6Z"/></svg></span><small>Favoriler</small></a>' +
      '<a href="/profilim" id="accountLink" class="active" data-account-nav="account" aria-current="page" aria-label="Hesabım"><span class="mobile-nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5"/><path d="M5 21c.7-4 3-6 7-6s6.3 2 7 6"/></svg></span><small id="accountLabel">Hesabım</small></a>';
    document.body.appendChild(nav);
  }
  bindMobileNav(nav);
  document.body.classList.add('has-account-mobile-nav');
}

function bindMobileNav(nav) {
  if (!nav || nav.dataset.bound === '1') return;
  nav.dataset.bound = '1';
  nav.addEventListener('click', (event) => {
    const link = event.target?.closest?.('a[data-account-nav]');
    if (!link) return;
    const action = link.dataset.accountNav;
    if (action === 'search') {
      event.preventDefault();
      window.location.assign('/#top');
    }
  });
}

function apply() {
  if (applying || !document.body.classList.contains('account-page-runtime')) return;
  applying = true;
  try {
    enforceSingleAccountShell();
    ensureMobileNav();
    normalizeAccountMenu(document.querySelector('.account-page-runtime #accountRouteMount .account-menu'));
  } finally {
    applying = false;
  }
}

const observer = new MutationObserver(() => apply());
observer.observe(document.documentElement, { childList: true, subtree: true });
apply();
