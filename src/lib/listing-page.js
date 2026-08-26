import './listing-page.css';

const isListingsPage = window.location.pathname.replace(/\/$/, '') === '/ilanlar';
if (!isListingsPage) {
  document.querySelectorAll('.desktop-nav a').forEach((link) => {
    if (link.textContent.trim() === 'İlanlar') link.setAttribute('href', '/ilanlar');
  });
  document.querySelectorAll('.brand-logo').forEach((link) => link.setAttribute('href', '/'));
} else {
  document.body.classList.add('listings-page');

  const listings = document.querySelector('#ilanlar');
  const arayan = document.querySelector('#arayan-bul');
  if (!listings) throw new Error('İlanlar bölümü bulunamadı.');

  // İlanlar sayfası: ana sayfanın diğer bölümlerini gizle, ortak header/footer korunur.
  document.querySelectorAll('main > section').forEach((section) => {
    section.hidden = section !== listings && section !== arayan;
  });
  listings.hidden = false;
  if (arayan) arayan.hidden = true;

  const nav = document.querySelector('.desktop-nav');
  if (nav) {
    nav.querySelectorAll('a').forEach((link) => {
      const text = link.textContent.trim();
      if (text === 'Ana Sayfa') link.href = '/';
      if (text === 'İlanlar') { link.href = '/ilanlar'; link.classList.add('active'); }
      if (text === 'Aracını Seç') link.href = '/';
    });
  }
  document.querySelectorAll('.brand-logo').forEach((link) => link.setAttribute('href', '/'));

  const container = listings.querySelector('.container');
  const sectionHead = listings.querySelector('.section-head');
  const grid = listings.querySelector('#listingGrid');
  if (!container || !sectionHead || !grid) throw new Error('İlanlar sayfası bileşenleri bulunamadı.');

  const tools = document.createElement('div');
  tools.className = 'listing-page-tools';
  tools.innerHTML = `
    <div class="listing-page-heading">
      <div>
        <span class="eyebrow">PARÇA AVCISI PAZARYERİ</span>
        <h1>İlanlar</h1>
        <p>Aradığın parçayı bul, kategoriye göre filtrele veya parça arayan müşterileri keşfet.</p>
      </div>
      <a class="listing-home-btn" href="/">← Ana Sayfaya Dön</a>
    </div>
    <div class="listing-search-panel">
      <div class="listing-search-modes" role="tablist" aria-label="İlanlar arama modu">
        <button type="button" class="listing-mode active" data-listing-mode="listings" role="tab" aria-selected="true">🔧 PARÇA BUL</button>
        <button type="button" class="listing-mode" data-listing-mode="requests" role="tab" aria-selected="false">👤 PARÇA ARAYANI BUL</button>
      </div>
      <div class="listing-search-row">
        <form id="listingPageSearchForm" class="listing-page-search">
          <span aria-hidden="true">⌕</span>
          <input id="listingPageSearchInput" autocomplete="off" placeholder="Parça, marka, model veya parça no ara..." aria-label="İlanlarda ara">
          <button type="submit">Ara</button>
        </form>
        <button type="button" class="listing-category-btn" data-open-categories>▦ KATEGORİYE GÖRE ARA <span>›</span></button>
      </div>
      <div class="listing-quick-tags">
        <button type="button" data-listing-query="Far">Far</button>
        <button type="button" data-listing-query="Motor">Motor</button>
        <button type="button" data-listing-query="Tampon">Tampon</button>
        <button type="button" data-listing-query="Fren">Fren</button>
        <button type="button" data-listing-query="Tofaş">Tofaş</button>
        <button type="button" data-listing-query="Ford">Ford</button>
      </div>
    </div>`;
  sectionHead.replaceWith(tools);

  const filters = listings.querySelector('.filters');
  if (filters) filters.classList.add('listing-condition-filters');
  const allListings = listings.querySelector('#allListings');
  if (allListings) allListings.closest('.center-action')?.classList.add('listing-bottom-action');

  let mode = 'listings';
  const setMode = (next) => {
    mode = next === 'requests' ? 'requests' : 'listings';
    tools.querySelectorAll('[data-listing-mode]').forEach((button) => {
      const active = button.dataset.listingMode === mode;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', String(active));
    });
    const input = document.querySelector('#listingPageSearchInput');
    const submit = tools.querySelector('.listing-page-search button[type="submit"]');
    if (input) input.placeholder = mode === 'requests' ? 'Aranan parça, araç veya şehir ara...' : 'Parça, marka, model veya parça no ara...';
    if (submit) submit.textContent = mode === 'requests' ? 'Arayanı Bul' : 'Ara';
    listings.classList.toggle('request-mode-active', mode === 'requests');
    if (arayan) arayan.hidden = mode !== 'requests';
    if (mode === 'requests') {
      listings.querySelector('#listingGrid')?.closest('.listing-content')?.classList.add('is-hidden');
      if (window.__hideArayanSection) window.__hideArayanSection();
    } else {
      if (arayan) arayan.hidden = true;
      listings.querySelector('#listingGrid')?.closest('.listing-content')?.classList.remove('is-hidden');
    }
  };

  // Mevcut grid'i ortak bir içerik kabına al; filtreler Parça Bul modunda kalır.
  const content = document.createElement('div');
  content.className = 'listing-content';
  const currentGrid = listings.querySelector('#listingGrid');
  if (currentGrid) {
    currentGrid.parentNode.insertBefore(content, currentGrid);
    content.appendChild(currentGrid);
  }

  const runSearch = (query) => {
    const input = document.querySelector('#listingPageSearchInput');
    if (input) input.value = query || '';
    if (mode === 'requests') {
      if (window.__searchRequests) window.__searchRequests(query || '');
      return;
    }
    if (window.__hideArayanSection) window.__hideArayanSection();
    if (window.__listingView) window.__listingView.search(query || '');
  };

  tools.querySelectorAll('[data-listing-mode]').forEach((button) => button.addEventListener('click', () => setMode(button.dataset.listingMode)));
  tools.querySelector('#listingPageSearchForm').addEventListener('submit', (event) => {
    event.preventDefault();
    runSearch(tools.querySelector('#listingPageSearchInput')?.value || '');
  });
  tools.querySelectorAll('[data-listing-query]').forEach((button) => button.addEventListener('click', () => runSearch(button.dataset.listingQuery)));

  // URL'deki kategori filtresini listing-view zaten okuyabildiği için kategori butonu
  // sadece mevcut kategori drawer'ını açar; seçim sonrası /ilanlar?category=... olarak kalır.
  window.__listingPageSetMode = setMode;
  setMode('listings');

  const params = new URLSearchParams(window.location.search);
  const initialQuery = params.get('q') || '';
  if (initialQuery) runSearch(initialQuery);
}
