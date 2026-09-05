/* Keep account routes as one stable mobile app surface. */
const ACCOUNT_ORDER = ['profilim','araclarim','ilanlarim','taleplerim','mesajlarim','favorilerim','kayitli-aramalar','bildirimler','musterilerim','hesap-bilgileri','ayarlar','yardim'];

const STYLE_ID = 'account-mobile-shell-fix-css';
let accountModal = null;
let accountCenterBridgeInstalled = false;
let accountCenterBridgeTimer = null;

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @media (max-width:760px){
      body.has-account-mobile-nav{padding-bottom:76px!important;}
      body.has-account-mobile-nav .account-mobile-nav{display:grid!important;position:fixed!important;left:0!important;right:0!important;bottom:0!important;height:68px!important;z-index:9999!important;grid-template-columns:repeat(5,1fr)!important;align-items:stretch!important;margin:0!important;padding:6px 6px calc(6px + env(safe-area-inset-bottom))!important;box-shadow:0 -8px 24px rgba(0,0,0,.12)!important;}
      body.has-account-mobile-nav .account-mobile-nav a{display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:3px!important;min-width:0!important;min-height:52px!important;padding:5px 3px!important;color:#69737d!important;background:transparent!important;text-decoration:none!important;font:700 23px/1 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;}
      body.has-account-mobile-nav .account-mobile-nav a small{font:600 10px/1.15 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;white-space:nowrap!important;}
      body.has-account-mobile-nav .account-mobile-nav a.active{color:#e2a900!important;}
      body.has-account-mobile-nav .account-mobile-nav .account-mobile-sell{position:relative;margin-top:-20px;min-height:62px!important;border:5px solid #fff!important;border-radius:50%!important;background:#f2b900!important;color:#101318!important;box-shadow:0 5px 18px rgba(0,0,0,.18)!important;font-size:30px!important;}
      body.has-account-mobile-nav .account-mobile-nav .account-mobile-sell small{color:#69737d!important;position:absolute!important;top:64px!important;}
      html[data-pa-theme="light"] body.has-account-mobile-nav .account-mobile-nav{background:#fff!important;border-top:1px solid #dfe3e7!important;}
      html[data-pa-theme="light"] body.has-account-mobile-nav .account-mobile-nav a{color:#66717b!important;}
      html[data-pa-theme="light"] body.has-account-mobile-nav .account-mobile-nav a.active{color:#b17f00!important;}
      html[data-pa-theme="dark"] body.has-account-mobile-nav .account-mobile-nav{background:#11161c!important;border-top:1px solid #2b333d!important;}
      html[data-pa-theme="dark"] body.has-account-mobile-nav .account-mobile-nav a{color:#aeb7c0!important;}
      html[data-pa-theme="dark"] body.has-account-mobile-nav .account-mobile-nav a.active{color:#f0b900!important;}
      html[data-pa-theme="dark"] body.has-account-mobile-nav .account-mobile-sell small{color:#aeb7c0!important;}

      /* The account tabs are a separate navigation layer. Keep them below the
         sticky site header while the account content scrolls underneath. */
      body.account-page-runtime #accountRouteMount .account-menu{
        position:sticky!important;
        top:60px!important;
        z-index:40!important;
        margin-bottom:14px!important;
        background:#10151b!important;
        box-shadow:0 8px 20px rgba(0,0,0,.18)!important;
      }
      html[data-pa-theme="light"] body.account-page-runtime #accountRouteMount .account-menu{
        background:#fff!important;
        box-shadow:0 8px 20px rgba(28,36,44,.10)!important;
      }
    }
    @media (min-width:761px){.account-mobile-nav{display:none!important;}}
  `;
  document.head.appendChild(style);
}

function rememberFirstAccountModal() {
  if (!accountModal) {
    const candidate = document.querySelector('#appModal');
    if (candidate) accountModal = candidate;
  }
}

function ensureAccountCenterBridge() {
  rememberFirstAccountModal();
  const open = window.__openAccountCenter;
  if (typeof open !== 'function' || accountCenterBridgeInstalled) return;
  const bridged = async (...args) => {
    if (accountModal) {
      const current = document.querySelector('#appModal');
      if (current && current !== accountModal) current.remove();
      if (!document.body.contains(accountModal)) document.body.appendChild(accountModal);
    }
    return open(...args);
  };
  bridged.__parcaAccountCenterBridge = true;
  window.__openAccountCenter = bridged;
  accountCenterBridgeInstalled = true;
  if (accountCenterBridgeTimer) {
    window.clearInterval(accountCenterBridgeTimer);
    accountCenterBridgeTimer = null;
  }
}

function ensureAccountCenterBridgeEventually() {
  ensureAccountCenterBridge();
  if (accountCenterBridgeInstalled || accountCenterBridgeTimer) return;
  accountCenterBridgeTimer = window.setInterval(() => ensureAccountCenterBridge(), 100);
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

function normalizeAccountMenu(menu) {
  if (!menu) return;
  ensureVehiclesTab(menu);
  const items = [...menu.children];
  const paneItems = items.filter((item) => item.dataset?.pane);
  const desired = ACCOUNT_ORDER
    .map((key) => paneItems.find((item) => item.dataset.pane === key))
    .filter(Boolean);
  const signOut = items.find((item) =>
    item.classList?.contains('danger') ||
    item.classList?.contains('account-signout-link') ||
    item.dataset?.accountSignout !== undefined
  );
  const ordered = signOut ? [...desired, signOut] : desired;
  if (items.length === ordered.length && items.every((item, index) => item === ordered[index])) return;
  const fragment = document.createDocumentFragment();
  ordered.forEach((item) => fragment.appendChild(item));
  menu.appendChild(fragment);
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
      '<a href="/">⌂<small>Ana Sayfa</small></a>' +
      '<a href="/#kategoriler">▦<small>Kategoriler</small></a>' +
      '<a href="/ilan-ver" class="account-mobile-sell">+<small>İlan Ver</small></a>' +
      '<a href="/favorilerim">♡<small>Favoriler</small></a>' +
      '<a href="/profilim" class="active">◉<small>Hesabım</small></a>';
    document.body.appendChild(nav);
  }
  document.body.classList.add('has-account-mobile-nav');
}

function apply() {
  if (!document.body.classList.contains('account-page-runtime')) return;
  ensureAccountCenterBridgeEventually();
  normalizeAccountMenu(document.querySelector('.account-page-runtime #accountRouteMount .account-menu'));
  ensureMobileNav();
}

const observer = new MutationObserver(() => apply());
observer.observe(document.documentElement, { childList: true, subtree: true });
apply();
