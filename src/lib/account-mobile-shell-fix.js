import './account-stable-navigation.js';

/*
 * Account routes use one DOM shell. This module is only responsible for the
 * mobile navigation and keeping the visible account menu ordered. It must not
 * keep references to #appModal or wrap __openAccountCenter: doing so can bring
 * a detached/stale account screen back into the document after a route change.
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
      body.has-account-mobile-nav{padding-bottom:92px!important;}
      body.has-account-mobile-nav .account-mobile-nav{
        display:grid!important;position:fixed!important;left:10px!important;right:10px!important;bottom:calc(8px + env(safe-area-inset-bottom))!important;
        height:70px!important;z-index:9999!important;grid-template-columns:repeat(5,1fr)!important;align-items:stretch!important;
        margin:0!important;padding:6px 8px!important;border:1px solid rgba(255,255,255,.10)!important;border-radius:22px!important;
        background:rgba(15,20,26,.96)!important;backdrop-filter:blur(18px)!important;-webkit-backdrop-filter:blur(18px)!important;
        box-shadow:0 16px 40px rgba(0,0,0,.38),0 0 0 1px rgba(0,0,0,.24)!important;
      }
      body.has-account-mobile-nav .account-mobile-nav a{
        position:relative!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:4px!important;
        min-width:0!important;min-height:56px!important;padding:5px 3px!important;color:#7f8994!important;background:transparent!important;
        border:0!important;text-decoration:none!important;font:700 22px/1 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;
        transition:color .16s ease,transform .16s ease!important;
      }
      body.has-account-mobile-nav .account-mobile-nav a:active{transform:scale(.94)!important;}
      body.has-account-mobile-nav .account-mobile-nav a small{font:700 9px/1.1 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;white-space:nowrap!important;}
      body.has-account-mobile-nav .account-mobile-nav a.active{color:#f6c21d!important;}
      body.has-account-mobile-nav .account-mobile-nav a.active::after{content:"";position:absolute;bottom:1px;width:18px;height:3px;border-radius:99px;background:#f6b900;}
      body.has-account-mobile-nav .account-mobile-nav .account-mobile-sell{
        position:relative!important;margin-top:-21px!important;align-self:start!important;min-height:62px!important;height:62px!important;width:62px!important;
        justify-self:center!important;border:5px solid #0b0e12!important;border-radius:50%!important;background:#f6b900!important;color:#11151a!important;
        box-shadow:0 8px 24px rgba(0,0,0,.42),0 0 0 1px rgba(246,185,0,.24)!important;font-size:30px!important;
      }
      body.has-account-mobile-nav .account-mobile-nav .account-mobile-sell::before{content:"";position:absolute;inset:-3px;border:1px solid rgba(255,255,255,.85);border-radius:50%;pointer-events:none;}
      body.has-account-mobile-nav .account-mobile-nav .account-mobile-sell small{color:#aeb7c0!important;position:absolute!important;top:66px!important;font-size:9px!important;}
      html[data-pa-theme="light"] body.has-account-mobile-nav .account-mobile-nav{background:rgba(255,255,255,.96)!important;border-color:#dfe4e8!important;box-shadow:0 14px 36px rgba(28,36,44,.16)!important;}
      html[data-pa-theme="light"] body.has-account-mobile-nav .account-mobile-nav a{color:#66717b!important;}
      html[data-pa-theme="light"] body.has-account-mobile-nav .account-mobile-nav a.active{color:#b17f00!important;}
      html[data-pa-theme="light"] body.has-account-mobile-nav .account-mobile-nav .account-mobile-sell{background:#f2b500!important;border-color:#fff!important;}
      html[data-pa-theme="dark"] body.has-account-mobile-nav .account-mobile-nav{background:rgba(15,20,26,.96)!important;border-color:#2b333d!important;}
      html[data-pa-theme="dark"] body.has-account-mobile-nav .account-mobile-nav a{color:#aeb7c0!important;}
      html[data-pa-theme="dark"] body.has-account-mobile-nav .account-mobile-nav a.active{color:#f6c21d!important;}
      body.account-page-runtime #accountRouteMount .account-menu{
        position:sticky!important;top:60px!important;z-index:40!important;margin-bottom:14px!important;
        background:#10151b!important;box-shadow:0 8px 20px rgba(0,0,0,.18)!important;
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
    if (nestedPane && parentPane && parentPane !== nestedPane) {
      parentPane.innerHTML = nestedPane.innerHTML;
    }
    nestedShell.remove();
  }

  const remaining = mount.querySelectorAll('.account-shell');
  if (remaining.length > 1) {
    for (const extra of [...remaining].slice(1)) extra.remove();
  }
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
      '<a href="/" data-account-nav="home" aria-label="Ana Sayfa">⌂<small>Ana Sayfa</small></a>' +
      '<a href="/" data-account-nav="search" aria-label="Ara">⌕<small>Ara</small></a>' +
      '<a href="/ilan-ver" class="account-mobile-sell" data-account-nav="sell" aria-label="İlan Ver">+<small>İlan Ver</small></a>' +
      '<a href="/favorilerim" data-account-nav="favorites" aria-label="Favoriler">♡<small>Favoriler</small></a>' +
      '<a href="/profilim" class="active" data-account-nav="account" aria-current="page" aria-label="Hesabım">◉<small>Hesabım</small></a>';
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
