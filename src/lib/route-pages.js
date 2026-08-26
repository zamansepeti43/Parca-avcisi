import './route-pages.css';

const path = window.location.pathname.replace(/\/+$/, '') || '/';
const isListingsPage = path === '/ilanlar';

document.body.classList.toggle('is-listings-page', isListingsPage);

function addListingsIntro() {
  const section = document.querySelector('#ilanlar');
  const head = section?.querySelector('.section-head');
  if (!section || !head || section.querySelector('.listing-page-intro')) return;

  const intro = document.createElement('div');
  intro.className = 'listing-page-intro';
  intro.innerHTML = '<span class="eyebrow">PARÇA AVCISI · PAZARYERİ</span><h1>Tüm İlanlar</h1><p>Sıfır, 2. el ve çıkma oto parçalarını tek yerde keşfet. Aracına uygun parçayı bul, fiyatları karşılaştır ve satıcıyla iletişime geç.</p>';
  head.before(intro);

  const eyebrow = head.querySelector('.eyebrow');
  const title = head.querySelector('h2');
  if (eyebrow) eyebrow.textContent = 'YENİ EKLENENLER';
  if (title) title.textContent = 'Parça ilanları';
  const allButton = section.querySelector('#allListings');
  if (allButton) allButton.textContent = 'Daha fazla ilan göster';
}

function updateNavigation() {
  document.querySelectorAll('.desktop-nav a').forEach((link) => {
    const href = link.getAttribute('href');
    if (href === '#top') link.setAttribute('href', '/');
    if (href === '#ilanlar') link.setAttribute('href', '/ilanlar');
  });

  document.querySelectorAll('footer a').forEach((link) => {
    const href = link.getAttribute('href');
    if (href === '#top') link.setAttribute('href', '/');
    if (href === '#ilanlar') link.setAttribute('href', '/ilanlar');
  });

  document.querySelectorAll('.desktop-nav a').forEach((link) => link.classList.remove('active'));
  const active = isListingsPage
    ? document.querySelector('.desktop-nav a[href="/ilanlar"]')
    : document.querySelector('.desktop-nav a[href="/"]');
  active?.classList.add('active');
}

function wirePageNavigation() {
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a');
    if (!link) return;
    const href = link.getAttribute('href') || '';

    if (href === '#ilanlar') {
      event.preventDefault();
      window.location.href = '/ilanlar';
      return;
    }

    if (href === '#top') {
      event.preventDefault();
      window.location.href = '/';
    }
  }, true);
}

function openDesktopCategoryMenu() {
  if (isListingsPage || window.innerWidth < 901) return;
  window.setTimeout(() => {
    const trigger = document.querySelector('.menu-trigger');
    if (trigger && trigger.getAttribute('aria-expanded') !== 'true') trigger.click();
  }, 120);
}

function init() {
  updateNavigation();
  wirePageNavigation();
  if (isListingsPage) addListingsIntro();
  openDesktopCategoryMenu();
}

init();
