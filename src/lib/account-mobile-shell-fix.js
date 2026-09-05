/* Keep account routes feeling like the same mobile app surface. */
const ACCOUNT_ORDER = ['profilim','araclarim','ilanlarim','taleplerim','mesajlarim','favorilerim','kayitli-aramalar','bildirimler','musterilerim','hesap-bilgileri','ayarlar','yardim'];

function normalizeAccountMenu(menu) {
  if (!menu) return;
  const items = ACCOUNT_ORDER.map((key) => menu.querySelector('[data-pane="' + key + '"]')).filter(Boolean);
  items.forEach((item) => menu.appendChild(item));
}

function ensureMobileNav() {
  if (!document.body.classList.contains('account-page-runtime')) return;
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
