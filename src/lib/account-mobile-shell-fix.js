/* Keep account routes feeling like the same mobile app surface. */
const ACCOUNT_ORDER = ['profilim','araclarim','ilanlarim','taleplerim','mesajlarim','favorilerim','kayitli-aramalar','bildirimler','musterilerim','hesap-bilgileri','ayarlar','yardim'];

const STYLE_ID = 'account-mobile-shell-fix-css';
function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @media (max-width:760px){
      body.has-account-mobile-nav{padding-bottom:76px!important;}
      body.has-account-mobile-nav .account-mobile-nav{display:grid!important;position:fixed!important;left:0!important;right:0!important;bottom:0!important;height:68px!important;z-index:9999!important;grid-template-columns:repeat(5,1fr)!important;align-items:stretch!important;margin:0!important;padding:6px 6px calc(6px + env(safe-area-inset-bottom))!important;background:#11161c!important;border-top:1px solid #2b333d!important;box-shadow:0 -8px 24px rgba(0,0,0,.22)!important;}
      body.has-account-mobile-nav .account-mobile-nav a{display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:3px!important;min-width:0!important;min-height:52px!important;padding:5px 3px!important;color:#aeb7c0!important;text-decoration:none!important;font:700 23px/1 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;}
      body.has-account-mobile-nav .account-mobile-nav a small{font:600 10px/1.15 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;white-space:nowrap!important;}
      body.has-account-mobile-nav .account-mobile-nav a.active{color:#f0b900!important;}
      body.has-account-mobile-nav .account-mobile-nav .account-mobile-sell{position:relative;margin-top:-20px;min-height:62px!important;border:5px solid #fff!important;border-radius:50%!important;background:#f2b900!important;color:#101318!important;box-shadow:0 5px 18px rgba(0,0,0,.24)!important;font-size:30px!important;}
      body.has-account-mobile-nav .account-mobile-nav .account-mobile-sell small{color:#aeb7c0!important;position:absolute!important;top:64px!important;}
    }
    @media (min-width:761px){.account-mobile-nav{display:none!important;}}
  `;
  document.head.appendChild(style);
}

function normalizeAccountMenu(menu) {
  if (!menu) return;
  const items = ACCOUNT_ORDER.map((key) => menu.querySelector('[data-pane="' + key + '"]')).filter(Boolean);
  items.forEach((item) => menu.appendChild(item));
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
  normalizeAccountMenu(document.querySelector('.account-page-runtime .account-menu'));
  ensureMobileNav();
}

const observer = new MutationObserver(() => apply());
observer.observe(document.documentElement, { childList: true, subtree: true });
apply();
