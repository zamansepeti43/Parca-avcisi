import './styles.css';

const root = document.querySelector('#root');

const categories = [
  ['⚙️', 'Motor'], ['🔧', 'Şanzıman'], ['🚗', 'Kaporta'], ['💡', 'Aydınlatma'],
  ['🛑', 'Fren'], ['🛞', 'Süspansiyon'], ['⚡', 'Elektrik'], ['🪑', 'İç Aksam'], ['⭕', 'Jant & Lastik'],
];

const listings = [
  { id: 1, title: 'Renault Clio 4 Sağ Ön Far', condition: '2. El', category: 'Aydınlatma', price: 2750, city: 'Ankara', vehicle: 'Clio 4', seller: 'Ankara Oto Parça', featured: true },
  { id: 2, title: 'Volkswagen Golf 7 Ön Tampon', condition: 'Çıkma', category: 'Kaporta', price: 3900, city: 'İstanbul', vehicle: 'Golf 7', seller: 'VAG Parça Merkezi' },
  { id: 3, title: 'Ford Focus 1.6 TDCi Turbo', condition: '2. El', category: 'Motor', price: 8500, city: 'Bursa', vehicle: 'Focus 1.6 TDCi', seller: 'Bursa Turbo' },
  { id: 4, title: 'Fiat Egea Ön Fren Seti', condition: 'Sıfır', category: 'Fren', price: 4250, city: 'İzmir', vehicle: 'Egea', seller: 'Egea Parça' },
  { id: 5, title: 'Toyota Corolla 2019 Sağ Ayna', condition: 'Çıkma', category: 'Kaporta', price: 3100, city: 'Konya', vehicle: 'Corolla 2019', seller: 'Konya Çıkma' },
  { id: 6, title: 'BMW 3 Serisi F30 Ön Amortisör', condition: 'Sıfır', category: 'Süspansiyon', price: 6800, city: 'İstanbul', vehicle: 'BMW F30', seller: 'Premium Parça' },
  { id: 7, title: 'Renault Megane 4 Debriyaj Seti', condition: 'Sıfır', category: 'Şanzıman', price: 7250, city: 'Ankara', vehicle: 'Megane 4', seller: 'Renault Uzmanı' },
  { id: 8, title: 'Fiat Doblo 1.6 Multijet Enjektör', condition: '2. El', category: 'Motor', price: 5400, city: 'Bursa', vehicle: 'Doblo 1.6', seller: 'Dizel Parça' },
];

const money = (value) => `${new Intl.NumberFormat('tr-TR').format(value)} TL`;
const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));

root.innerHTML = `
  <header class="site-header">
    <div class="container nav-wrap">
      <a class="brand" href="#top" aria-label="Parça Avcısı ana sayfa"><span class="brand-mark">P</span><span>PARÇA <strong>AVCISI</strong></span></a>
      <nav class="desktop-nav" aria-label="Ana menü">
        <a href="#ilanlar">İlanlar</a><a href="#kategoriler">Kategoriler</a><a href="#nasil-calisir">Nasıl Çalışır?</a>
      </nav>
      <button class="outline-btn" id="sellBtn">+ İlan Ver</button>
    </div>
  </header>

  <main id="top">
    <section class="hero">
      <div class="container hero-grid">
        <div class="hero-copy">
          <span class="eyebrow">SIFIR • 2. EL • ÇIKMA</span>
          <h1>Aradığın parçayı<br><em>bul. Avla. Al.</em></h1>
          <p>Aracına uygun oto parçalarını tek yerde bul. Fiyatları karşılaştır, satıcıya ulaş ve doğru parçayı seç.</p>
          <form class="search-box" id="searchForm">
            <span aria-hidden="true">⌕</span><input id="searchInput" autocomplete="off" placeholder="Parça, marka, model veya parça no ara..." aria-label="Parça ara"><button type="submit">Parça Bul</button>
          </form>
          <div class="quick-tags"><button data-query="Motor">Motor</button><button data-query="Fren">Fren</button><button data-query="Far">Far</button><button data-query="Tampon">Tampon</button></div>
        </div>
        <div class="hero-panel"><div class="panel-ring"></div><div class="panel-content"><span>PARÇA AVCISI</span><strong>Doğru parça.<br>Doğru fiyat.</strong><small>Türkiye'nin yeni nesil oto parça pazaryeri.</small></div></div>
      </div>
    </section>

    <section class="section" id="kategoriler">
      <div class="container"><div class="section-head"><div><span class="eyebrow">KEŞFET</span><h2>Parçayı kategoriden bul</h2></div><span class="muted">9 kategori</span></div><div class="category-grid" id="categoryGrid"></div></div>
    </section>

    <section class="section listings-section" id="ilanlar">
      <div class="container"><div class="section-head"><div><span class="eyebrow">PAZARDAN</span><h2>Yeni ilanlar</h2></div><div class="filters"><button class="filter active" data-condition="Tümü">Tümü</button><button class="filter" data-condition="Sıfır">Sıfır</button><button class="filter" data-condition="2. El">2. El</button><button class="filter" data-condition="Çıkma">Çıkma</button></div></div><div class="listing-grid" id="listingGrid"></div></div>
    </section>

    <section class="how section" id="nasil-calisir"><div class="container"><span class="eyebrow">NASIL ÇALIŞIR?</span><h2>Aradığın parçaya üç adımda ulaş.</h2><div class="steps"><article><b>01</b><h3>Ara</h3><p>Marka, model, parça adı veya parça numarasıyla aramaya başla.</p></article><article><b>02</b><h3>Karşılaştır</h3><p>Sıfır, 2. el ve çıkma seçeneklerini fiyat ve konuma göre incele.</p></article><article><b>03</b><h3>Ulaş</h3><p>Satıcıyı incele, ilanı kaydet ve doğrudan iletişime geç.</p></article></div></div></section>
  </main>

  <footer><div class="container footer-inner"><div><a class="brand" href="#top"><span class="brand-mark">P</span><span>PARÇA <strong>AVCISI</strong></span></a><p>Türkiye'nin otomobil parçası pazaryeri.</p></div><span>© 2026 Parça Avcısı</span></div></footer>
  <div class="toast" id="toast" role="status" aria-live="polite"></div>
`;

const categoryGrid = document.querySelector('#categoryGrid');
const listingGrid = document.querySelector('#listingGrid');
const searchInput = document.querySelector('#searchInput');
const toast = document.querySelector('#toast');
let selectedCondition = 'Tümü';

categoryGrid.innerHTML = categories.map(([icon, name]) => `<button class="category-card" data-query="${escapeHtml(name)}"><span>${icon}</span><strong>${escapeHtml(name)}</strong><small>Parçaları gör →</small></button>`).join('');

function renderListings(query = '') {
  const normalized = query.trim().toLocaleLowerCase('tr-TR');
  const visible = listings.filter((item) => {
    const matchesCondition = selectedCondition === 'Tümü' || item.condition === selectedCondition;
    const haystack = `${item.title} ${item.category} ${item.vehicle} ${item.city} ${item.seller}`.toLocaleLowerCase('tr-TR');
    return matchesCondition && (!normalized || haystack.includes(normalized));
  });

  listingGrid.innerHTML = visible.length ? visible.map((item) => `
    <article class="listing-card">
      <div class="listing-image"><span class="condition ${item.condition === 'Sıfır' ? 'new' : ''}">${escapeHtml(item.condition)}</span><button class="heart" data-save="${item.id}" aria-label="Favorilere ekle">♡</button><div class="car-placeholder">${item.category === 'Motor' ? '⚙' : item.category === 'Aydınlatma' ? '◉' : '▱'}</div></div>
      <div class="listing-body"><div class="listing-meta"><span>${escapeHtml(item.category)}</span><span>${escapeHtml(item.city)}</span></div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.vehicle)} · ${escapeHtml(item.seller)}</p><strong class="price">${money(item.price)}</strong><button class="detail-btn" data-detail="${item.id}">İlanı incele</button></div>
    </article>`).join('') : '<div class="empty"><strong>Aramana uygun ilan bulamadık.</strong><span>Başka bir parça, marka veya kategori dene.</span></div>';
}

function search(query) {
  searchInput.value = query;
  renderListings(query);
  document.querySelector('#ilanlar').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

document.querySelector('#searchForm').addEventListener('submit', (event) => { event.preventDefault(); search(searchInput.value); });
document.querySelectorAll('[data-query]').forEach((button) => button.addEventListener('click', () => search(button.dataset.query)));
document.querySelectorAll('.filter').forEach((button) => button.addEventListener('click', () => {
  document.querySelectorAll('.filter').forEach((item) => item.classList.remove('active'));
  button.classList.add('active');
  selectedCondition = button.dataset.condition;
  renderListings(searchInput.value);
}));

document.addEventListener('click', (event) => {
  const save = event.target.closest('[data-save]');
  if (save) { save.textContent = save.textContent === '♥' ? '♡' : '♥'; showToast(save.textContent === '♥' ? 'İlan favorilere eklendi.' : 'İlan favorilerden çıkarıldı.'); }
  const detail = event.target.closest('[data-detail]');
  if (detail) { const item = listings.find((listing) => listing.id === Number(detail.dataset.detail)); showToast(`${item.title} — detay sayfası sonraki MVP görevinde açılacak.`); }
});

document.querySelector('#sellBtn').addEventListener('click', () => showToast('İlan verme akışı sonraki MVP görevinde açılacak.'));
function showToast(message) { toast.textContent = message; toast.classList.add('show'); window.clearTimeout(showToast.timer); showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 2600); }

renderListings();
