import './styles.css';
import { getMakes, getModels, getYears } from './lib/vehicle-catalog.js';

const root = document.querySelector('#root');

const categories = [
  ['⚙️', 'Motor', 'Motor ve motor parçaları'], ['🔧', 'Şanzıman', 'Debriyaj ve aktarma'], ['🚗', 'Kaporta', 'Tampon, kapı ve ayna'], ['💡', 'Aydınlatma', 'Far, stop ve sinyal'],
  ['🛑', 'Fren Sistemi', 'Balata, disk ve kaliper'], ['🛞', 'Süspansiyon', 'Amortisör ve yürür'], ['⚡', 'Elektrik', 'Akü, marş ve elektronik'], ['🪑', 'İç Aksam', 'Konsol ve döşeme'], ['⭕', 'Jant & Lastik', 'Jant ve lastik'],
];
const brandLogo = '/parca-avcisi-logo.png';

const footerBrandLogo = '/app-logo.png';

root.innerHTML = `
  <header class="site-header"><div class="container nav-wrap">
    <a class="brand brand-logo" href="#top" aria-label="Parça Avcısı ana sayfa"><img class="brand-mark" src="${brandLogo}" alt="Parça Avcısı" width="158" height="72"></a>
    <nav class="desktop-nav" aria-label="Ana menü"><a href="#ilanlar">İlanlar</a><a href="#kategoriler">Kategoriler</a><a href="#aracini-sec">Aracını Seç</a></nav>
    <span class="auth-slot" id="authSlot"></span>
    <button class="outline-btn" id="sellBtn">+ İlan Ver</button>
  </div></header>

  <main id="top">
    <section class="hero"><div class="container hero-grid"><div class="hero-copy">
      <span class="eyebrow">SIFIR · 2. EL · ÇIKMA</span><h1>Aradığın her parça<br><em>burada.</em></h1>
      <p>Aracına uygun oto parçalarını tek yerde bul. Fiyatları karşılaştır, satıcıyı incele ve doğru parçayı avla.</p>
      <div class="search-mode-tabs" role="tablist" aria-label="Arama modu">
        <button type="button" class="search-mode-tab active" data-search-mode="listings" role="tab" aria-selected="true">🔧 PARÇA BUL</button>
        <button type="button" class="search-mode-tab" data-search-mode="requests" role="tab" aria-selected="false">👤 PARÇA ARAYANI BUL</button>
      </div>
      <form class="search-box" id="searchForm"><span aria-hidden="true">⌕</span><input id="searchInput" autocomplete="off" placeholder="Parça, marka, model veya parça no ara..." aria-label="Parça ara"><button type="submit">Parça Bul</button></form>
      <div class="quick-tags"><button data-query="Far">Far</button><button data-query="Motor">Motor</button><button data-query="Tampon">Tampon</button><button data-query="Fren">Fren</button><button data-query="Tofaş">Tofaş</button><button data-query="Ford">Ford</button></div>
      <div class="hero-trust"><span>✓ Binlerce parça</span><span>✓ Türkiye geneli</span><span>✓ Sıfır & 2. el</span></div>
    </div><div class="hero-visual" aria-hidden="true"><div class="hero-emblem-glow"></div><img class="hero-emblem" src="/app-logo.png" alt=""></div></div></section>

    <section class="section marketplace-cta" id="piyasa"><div class="container marketplace-grid">
      <article class="marketplace-card request"><span class="eyebrow">ARADIN, BULAMADIN MI?</span><div class="marketplace-icon">🔎</div><h2>Parça Arıyorum</h2><p>Bulamadığın parçayı talep et; sende olan satıcılar sana ulaşsın.</p><button class="marketplace-btn" data-open-request>Parça Talebi Oluştur</button></article>
      <article class="marketplace-card sell"><span class="eyebrow">ELİNDE FAZLA PARÇA MI VAR?</span><div class="marketplace-icon">🔧</div><h2>Parça Satıyorum</h2><p>Sıfır, 2. el veya çıkma parçanı ilanla; arayan alıcılarla buluş.</p><button class="marketplace-btn" data-open-sell>İlan Ver</button></article>
      <article class="marketplace-card browse"><span class="eyebrow">SATICI HESABINLA</span><div class="marketplace-icon">👀</div><h2>Müşteri Taleplerini Gör</h2><p>Alıcıların şu an aradığı parçaları incele; sende olanlara "Bende Var" ile cevap ver.</p><button class="marketplace-btn" data-open-customer-requests>Müşteri Taleplerini Gör</button></article>
    </div></section>

    <section class="section vehicle-section" id="aracini-sec"><div class="container vehicle-card"><div><span class="eyebrow">ARACINI SEÇ</span><h2>Aracına uygun parçayı daha hızlı bul.</h2><p>Marka, model ve yılı seç; uyumlu parçaları keşfet.</p></div><form class="vehicle-form" id="vehicleForm"><select id="make"><option value="">Marka Seçiniz</option></select><select id="model" disabled><option value="">Model Seçiniz</option></select><select id="year" disabled><option value="">Yıl Seçiniz</option></select><button type="submit">Parçaları Göster</button></form></div></section>

    <section class="section" id="kategoriler"><div class="container"><div class="section-head"><div><span class="eyebrow">POPÜLER KATEGORİLER</span><h2>Parçayı kategoriden bul</h2></div><button class="text-btn" data-show-all="true">Tümünü Gör →</button></div><div class="category-grid" id="categoryGrid"></div></div></section>

    <section class="section listings-section" id="ilanlar"><div class="container"><div class="section-head"><div><span class="eyebrow">SATILAN PARÇALAR · YENİ EKLENENLER</span><h2>Yeni eklenen parçalar</h2></div><div class="filters"><button class="filter active" data-condition="Tümü">Tümü</button><button class="filter" data-condition="Sıfır">Sıfır</button><button class="filter" data-condition="2. El">2. El</button><button class="filter" data-condition="Çıkma">Çıkma</button></div></div><div class="listing-grid" id="listingGrid"></div><div class="center-action"><button class="dark-btn" id="allListings">Tüm ilanları gör</button></div></div></section>

    <section class="section requests-section arayan-bul-section" id="arayan-bul" hidden>
      <div class="container">
        <div class="section-head"><div><span class="eyebrow">PARÇA ARAYANI BUL</span><h2>Bu parçayı arayan müşteriler</h2></div><button class="text-btn" id="arayanBack">← İlanlara Dön</button></div>
        <p class="requests-intro">Alıcıların aktif taleplerini ara; elindeki parçaya "Bende Var" de ve mesajlaşmaya başla.</p>
        <div id="arayanFilters"></div>
        <div class="listing-grid request-grid" id="arayanGrid"></div>
        <div class="center-action" id="arayanAction"></div>
      </div>
    </section>

    <section class="section requests-section" id="talep-market"><div class="container">
      <div class="section-head"><div><span class="eyebrow">MÜŞTERİLERİN ARADIĞI PARÇALAR</span><h2>Alıcılar bu parçaları arıyor</h2></div><button class="text-btn" id="allRequestsBtn">Hepsini Gör →</button></div>
      <p class="requests-intro">Aradığın parça burada yoksa, başka bir müşteri de senin elindeki parçayı arıyor olabilir. Sende olan parçaya "Bende Var" de, alıcıyla mesajlaşmayı başlat.</p>
      <div class="listing-grid request-grid" id="requestMarketGrid"></div>
      <div class="center-action"><button class="dark-btn" data-open-request>Parça ARIYORUM — Talep Oluştur</button></div>
    </div></section>

    <section class="section benefits"><div class="container benefit-grid"><article><b>⌕</b><strong>Kolay arama</strong><span>Aradığın parçayı hızlıca bul.</span></article><article><b>◇</b><strong>Geniş ürün yelpazesi</strong><span>0, 2. el ve çıkma seçenekleri.</span></article><article><b>₺</b><strong>Uygun fiyat</strong><span>Farklı satıcıları karşılaştır.</span></article><article><b>✓</b><strong>Güvenli alışveriş</strong><span>Satıcı profillerini incele.</span></article><article><b>⚡</b><strong>Hızlı iletişim</strong><span>Satıcıya doğrudan ulaş.</span></article></div></section>

    <section class="how section" id="nasil-calisir"><div class="container"><span class="eyebrow">PARÇA AVCISI NASIL ÇALIŞIR?</span><h2>Doğru parçaya üç adımda ulaş.</h2><div class="steps"><article><b>01</b><h3>Ara</h3><p>Marka, model, parça adı veya OEM numarasıyla aramaya başla.</p></article><article><b>02</b><h3>Karşılaştır</h3><p>Sıfır, 2. el ve çıkma ilanlarını fiyat ve konuma göre incele.</p></article><article><b>03</b><h3>Ulaş</h3><p>Satıcı profilini kontrol et ve ilan üzerinden iletişime geç.</p></article></div></div></section>
  </main>

  <footer><div class="container footer-inner"><div><a class="brand" href="#top"><img class="brand-mark" src="${footerBrandLogo}" alt="Parça Avcısı" width="34" height="34"><span>PARÇA <strong>AVCISI</strong></span></a><p>Aradığın her parça Parça Avcısı'nda.</p></div><div class="footer-links"><a href="#ilanlar">İlanlar</a><a href="#kategoriler">Kategoriler</a><a href="#aracini-sec">Araç Seç</a></div><span>© 2026 Parça Avcısı</span></div></footer>
  <nav class="mobile-nav" aria-label="Mobil menü"><a href="#top">⌂<small>Ana Sayfa</small></a><a href="#kategoriler">▦<small>Kategoriler</small></a><button id="mobileSell">+<small>İlan Ver</small></button><a href="#favorilerim" id="favoriteLink">♡<small>Favoriler</small></a><a href="#hesabim" id="accountLink">◉<small id="accountLabel">Hesabım</small></a></nav><div class="toast" id="toast" role="status" aria-live="polite"></div>
`;

const categoryGrid = document.querySelector('#categoryGrid');
const searchInput = document.querySelector('#searchInput');
const makeSelect = document.querySelector('#make');
const modelSelect = document.querySelector('#model');
const yearSelect = document.querySelector('#year');

categoryGrid.innerHTML = categories.map(([icon, name, desc]) => `<button class="category-card" data-query="${escapeHtml(name)}"><span>${icon}</span><strong>${escapeHtml(name)}</strong><small>${escapeHtml(desc)}</small><i>→</i></button>`).join('');

function escapeHtml(value) { return String(value || '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char])); }

const listingView = () => window.__listingView;
let searchMode = 'listings';

const SEARCH_MODE_KEY = 'pa:searchMode';

function setSearchMode(mode) {
  searchMode = mode === 'requests' ? 'requests' : 'listings';
  try { window.localStorage.setItem(SEARCH_MODE_KEY, searchMode); } catch { /* depolama kapalıysa mod oturum içinde geçerli kalır */ }
  document.querySelectorAll('.search-mode-tab').forEach((tab) => {
    const active = tab.dataset.searchMode === searchMode;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-selected', String(active));
  });
  const submit = document.querySelector('#searchForm button');
  if (submit) submit.textContent = searchMode === 'requests' ? 'Arayanı Bul' : 'Parça Bul';
  const input = document.querySelector('#searchInput');
  if (input) input.placeholder = searchMode === 'requests' ? 'Aranan parça, araç veya şehir ara...' : 'Parça, marka, model veya parça no ara...';
  if (window.__setRequestSearchMode) window.__setRequestSearchMode(searchMode);
}

function search(query) {
  searchInput.value = query;
  if (searchMode === 'requests') {
    if (window.__searchRequests) {
      window.__searchRequests(query);
      return;
    }
    setSearchMode('listings');
  }
  if (window.__hideArayanSection) window.__hideArayanSection();
  if (listingView()) listingView().search(query);
  document.querySelector('#ilanlar').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

document.querySelectorAll('[data-search-mode]').forEach((tab) => {
  tab.addEventListener('click', () => setSearchMode(tab.dataset.searchMode));
});

(function restoreSearchMode() {
  try {
    if (window.localStorage.getItem(SEARCH_MODE_KEY) === 'requests') setSearchMode('requests');
  } catch { /* depolama kapalıysa varsayılan PARÇA BUL kullanılır */ }
})();

// ---- Hero vehicle form: Marka → Model → Yıl (dependent selects) ----
makeSelect.innerHTML = '<option value="">Marka Seçiniz</option>' + getMakes().map((name) => `<option>${escapeHtml(name)}</option>`).join('');
function resetModelYear() {
  modelSelect.innerHTML = '<option value="">Model Seçiniz</option>';
  modelSelect.disabled = !makeSelect.value;
  yearSelect.innerHTML = '<option value="">Yıl Seçiniz</option>';
  yearSelect.disabled = true;
}
function resetYear() {
  yearSelect.innerHTML = '<option value="">Yıl Seçiniz</option>';
  yearSelect.disabled = !modelSelect.value;
}
makeSelect.addEventListener('change', () => {
  const models = getModels(makeSelect.value);
  resetModelYear();
  modelSelect.innerHTML = '<option value="">Model Seçiniz</option>' + models.map((name) => `<option>${escapeHtml(name)}</option>`).join('');
});
modelSelect.addEventListener('change', () => {
  const years = getYears(makeSelect.value, modelSelect.value);
  resetYear();
  yearSelect.innerHTML = '<option value="">Yıl Seçiniz</option>' + years.map((value) => `<option>${value}</option>`).join('');
});

document.querySelector('#searchForm').addEventListener('submit', (event) => { event.preventDefault(); search(searchInput.value); });
document.querySelectorAll('[data-query]').forEach((button) => button.addEventListener('click', () => search(button.dataset.query)));

document.querySelectorAll('.filter').forEach((button) => button.addEventListener('click', () => {
  document.querySelectorAll('.filter').forEach((item) => item.classList.remove('active'));
  button.classList.add('active');
  if (listingView()) listingView().setCondition(button.dataset.condition);
}));

document.querySelector('#vehicleForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const make = makeSelect.value;
  const model = modelSelect.value;
  if (!make || !model) return showToast('Önce marka ve model seç.');
  search([make, model, yearSelect.value].filter(Boolean).join(' '));
});

function showToast(message) {
  const toast = document.querySelector('#toast');
  toast.textContent = message; toast.classList.add('show');
  window.clearTimeout(showToast.timer); showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 2600);
}

document.querySelector('#allListings').addEventListener('click', () => {
  document.querySelectorAll('.filter').forEach((item) => item.classList.toggle('active', item.dataset.condition === 'Tümü'));
  if (listingView()) { listingView().setCondition('Tümü'); listingView().search(''); }
});
document.querySelector('[data-show-all]').addEventListener('click', () => document.querySelector('#ilanlar').scrollIntoView({ behavior: 'smooth' }));

document.querySelector('[data-open-customer-requests]').addEventListener('click', () => {
  if (!window.__requireMember) return;
  window.__requireMember(() => {
    if (window.__openAccountCenter) window.__openAccountCenter('musteri-talepleri');
  });
});

const arayanBack = document.querySelector('#arayanBack');
if (arayanBack) {
  arayanBack.addEventListener('click', () => {
    setSearchMode('listings');
    search(searchInput.value);
  });
}
