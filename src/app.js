import './styles.css';

const root = document.querySelector('#root');

const categories = [
  ['⚙️', 'Motor', 'Motor ve motor parçaları'], ['🔧', 'Şanzıman', 'Debriyaj ve aktarma'], ['🚗', 'Kaporta', 'Tampon, kapı ve ayna'], ['💡', 'Aydınlatma', 'Far, stop ve sinyal'],
  ['🛑', 'Fren Sistemi', 'Balata, disk ve kaliper'], ['🛞', 'Süspansiyon', 'Amortisör ve yürür'], ['⚡', 'Elektrik', 'Akü, marş ve elektronik'], ['🪑', 'İç Aksam', 'Konsol ve döşeme'], ['⭕', 'Jant & Lastik', 'Jant ve lastik'],
];

const listings = [
  { id: 1, title: 'Audi A4 B8 Sağ Ön Far', condition: 'Sıfır', category: 'Aydınlatma', price: 8750, city: 'İstanbul', vehicle: 'Audi A4 B8 · 2012–2015', seller: 'Otoparça Center', tone: 'headlight' },
  { id: 2, title: 'BMW F30 Ön Tampon', condition: '2. El', category: 'Kaporta', price: 5250, city: 'Ankara', vehicle: 'BMW 3 Serisi F30 · 2012–2018', seller: 'VAG & BMW Parça', tone: 'bumper' },
  { id: 3, title: 'Volkswagen Golf 7 Çıkma Motor', condition: 'Çıkma', category: 'Motor', price: 12000, city: 'İzmir', vehicle: 'Golf 7 · 1.6 TDI', seller: 'İzmir Motor', tone: 'engine' },
  { id: 4, title: 'Mercedes W204 Stop Sol', condition: 'Sıfır', category: 'Aydınlatma', price: 2250, city: 'Bursa', vehicle: 'Mercedes W204 · 2007–2014', seller: 'Yıldız Parça', tone: 'tail' },
  { id: 5, title: 'Renault Megane 3 Direksiyon Airbag', condition: '2. El', category: 'İç Aksam', price: 1750, city: 'Adana', vehicle: 'Megane 3 · 2009–2016', seller: 'Renault Çıkma', tone: 'airbag' },
  { id: 6, title: 'Fiat Egea Ön Fren Seti', condition: 'Sıfır', category: 'Fren Sistemi', price: 4250, city: 'İzmir', vehicle: 'Egea · 2015+', seller: 'Egea Parça', tone: 'brake' },
  { id: 7, title: 'Toyota Corolla Sağ Ayna', condition: 'Çıkma', category: 'Kaporta', price: 3100, city: 'Konya', vehicle: 'Corolla · 2019+', seller: 'Konya Çıkma', tone: 'mirror' },
  { id: 8, title: 'BMW F30 Ön Amortisör', condition: 'Sıfır', category: 'Süspansiyon', price: 6800, city: 'İstanbul', vehicle: 'BMW F30', seller: 'Premium Parça', tone: 'suspension' },
];

const money = (value) => `${new Intl.NumberFormat('tr-TR').format(value)} TL`;
const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));

root.innerHTML = `
  <header class="site-header"><div class="container nav-wrap">
    <a class="brand" href="#top" aria-label="Parça Avcısı ana sayfa"><span class="brand-mark">P</span><span>PARÇA <strong>AVCISI</strong></span></a>
    <nav class="desktop-nav" aria-label="Ana menü"><a href="#ilanlar">İlanlar</a><a href="#kategoriler">Kategoriler</a><a href="#aracini-sec">Aracını Seç</a></nav>
    <button class="outline-btn" id="sellBtn">+ İlan Ver</button>
  </div></header>

  <main id="top">
    <section class="hero"><div class="container hero-grid"><div class="hero-copy">
      <span class="eyebrow">SIFIR • 2. EL • ÇIKMA</span><h1>Aradığın her parça<br><em>burada.</em></h1>
      <p>Aracına uygun oto parçalarını tek yerde bul. Fiyatları karşılaştır, satıcıyı incele ve doğru parçayı avla.</p>
      <form class="search-box" id="searchForm"><span aria-hidden="true">⌕</span><input id="searchInput" autocomplete="off" placeholder="Parça, marka, model veya parça no ara..." aria-label="Parça ara"><button type="submit">Parça Bul</button></form>
      <div class="quick-tags"><button data-query="Far">Far</button><button data-query="Motor">Motor</button><button data-query="Tampon">Tampon</button><button data-query="Fren">Fren</button><button data-query="ABS">ABS Beyni</button></div>
      <div class="hero-trust"><span>✓ Binlerce parça</span><span>✓ Türkiye geneli</span><span>✓ Sıfır & 2. el</span></div>
    </div><div class="hero-visual" aria-hidden="true"><div class="car-glow"></div><div class="hero-car">◖<span>◗</span></div><div class="visual-label"><b>DOĞRU PARÇA</b><small>DOĞRU FİYAT</small></div></div></div></section>

    <section class="section vehicle-section" id="aracini-sec"><div class="container vehicle-card"><div><span class="eyebrow">ARACINI SEÇ</span><h2>Aracına uygun parçayı daha hızlı bul.</h2><p>Marka, model ve yılı seç; uyumlu parçaları keşfet.</p></div><form class="vehicle-form" id="vehicleForm"><select id="make"><option value="">Marka Seçiniz</option><option>Volkswagen</option><option>BMW</option><option>Audi</option><option>Renault</option><option>Fiat</option><option>Mercedes</option><option>Toyota</option></select><select id="model" disabled><option value="">Model Seçiniz</option></select><select id="year" disabled><option value="">Yıl Seçiniz</option></select><button type="submit">Parçaları Göster</button></form></div></section>

    <section class="section" id="kategoriler"><div class="container"><div class="section-head"><div><span class="eyebrow">POPÜLER KATEGORİLER</span><h2>Parçayı kategoriden bul</h2></div><button class="text-btn" data-show-all="true">Tümünü Gör →</button></div><div class="category-grid" id="categoryGrid"></div></div></section>

    <section class="section listings-section" id="ilanlar"><div class="container"><div class="section-head"><div><span class="eyebrow">YENİ EKLENENLER</span><h2>Öne çıkan ilanlar</h2></div><div class="filters"><button class="filter active" data-condition="Tümü">Tümü</button><button class="filter" data-condition="Sıfır">0 KM</button><button class="filter" data-condition="2. El">2. El</button><button class="filter" data-condition="Çıkma">Çıkma</button></div></div><div class="listing-grid" id="listingGrid"></div><div class="center-action"><button class="dark-btn" id="allListings">Tüm ilanları gör</button></div></div></section>

    <section class="section benefits"><div class="container benefit-grid"><article><b>⌕</b><strong>Kolay arama</strong><span>Aradığın parçayı hızlıca bul.</span></article><article><b>◇</b><strong>Geniş ürün yelpazesi</strong><span>0, 2. el ve çıkma seçenekleri.</span></article><article><b>₺</b><strong>Uygun fiyat</strong><span>Farklı satıcıları karşılaştır.</span></article><article><b>✓</b><strong>Güvenli alışveriş</strong><span>Satıcı profillerini incele.</span></article><article><b>⚡</b><strong>Hızlı iletişim</strong><span>Satıcıya doğrudan ulaş.</span></article></div></section>

    <section class="how section" id="nasil-calisir"><div class="container"><span class="eyebrow">PARÇA AVCISI NASIL ÇALIŞIR?</span><h2>Doğru parçaya üç adımda ulaş.</h2><div class="steps"><article><b>01</b><h3>Ara</h3><p>Marka, model, parça adı veya OEM numarasıyla aramaya başla.</p></article><article><b>02</b><h3>Karşılaştır</h3><p>Sıfır, 2. el ve çıkma ilanlarını fiyat ve konuma göre incele.</p></article><article><b>03</b><h3>Ulaş</h3><p>Satıcı profilini kontrol et ve ilan üzerinden iletişime geç.</p></article></div></div></section>
  </main>

  <footer><div class="container footer-inner"><div><a class="brand" href="#top"><span class="brand-mark">P</span><span>PARÇA <strong>AVCISI</strong></span></a><p>Aradığın her parça Parça Avcısı'nda.</p></div><div class="footer-links"><a href="#ilanlar">İlanlar</a><a href="#kategoriler">Kategoriler</a><a href="#aracini-sec">Araç Seç</a></div><span>© 2026 Parça Avcısı</span></div></footer>
  <nav class="mobile-nav" aria-label="Mobil menü"><a href="#top">⌂<small>Ana Sayfa</small></a><a href="#kategoriler">▦<small>Kategoriler</small></a><button id="mobileSell">+<small>İlan Ver</small></button><a href="#ilanlar">♡<small>Favoriler</small></a><a href="#aracini-sec">◉<small>Hesabım</small></a></nav><div class="toast" id="toast" role="status" aria-live="polite"></div>
`;

const categoryGrid = document.querySelector('#categoryGrid');
const listingGrid = document.querySelector('#listingGrid');
const searchInput = document.querySelector('#searchInput');
const toast = document.querySelector('#toast');
let selectedCondition = 'Tümü';

categoryGrid.innerHTML = categories.map(([icon, name, desc]) => `<button class="category-card" data-query="${escapeHtml(name)}"><span>${icon}</span><strong>${escapeHtml(name)}</strong><small>${escapeHtml(desc)}</small><i>→</i></button>`).join('');

function listingArt(tone) { return ({ headlight: '◖', bumper: '▰', engine: '⚙', tail: '◉', airbag: '◌', brake: '◎', mirror: '◒', suspension: '╱' })[tone] || '◉'; }

function renderListings(query = '') {
  const normalized = query.trim().toLocaleLowerCase('tr-TR');
  const visible = listings.filter((item) => {
    const matchesCondition = selectedCondition === 'Tümü' || item.condition === selectedCondition;
    const haystack = `${item.title} ${item.category} ${item.vehicle} ${item.city} ${item.seller}`.toLocaleLowerCase('tr-TR');
    return matchesCondition && (!normalized || haystack.includes(normalized));
  });
  listingGrid.innerHTML = visible.length ? visible.map((item) => `<article class="listing-card"><div class="listing-image ${item.tone}"><span class="condition ${item.condition === 'Sıfır' ? 'new' : ''}">${escapeHtml(item.condition)}</span><button class="heart" data-save="${item.id}" aria-label="Favorilere ekle">♡</button><div class="part-art">${listingArt(item.tone)}</div><span class="art-caption">PARÇA AVCISI</span></div><div class="listing-body"><div class="listing-meta"><span>${escapeHtml(item.category)}</span><span>⌖ ${escapeHtml(item.city)}</span></div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.vehicle)}</p><strong class="price">${money(item.price)}</strong><div class="seller-line"><span>✓ ${escapeHtml(item.seller)}</span><button class="detail-btn" data-detail="${item.id}">İncele</button></div></div></article>`).join('') : '<div class="empty"><strong>Aramana uygun ilan bulamadık.</strong><span>Başka bir parça, marka veya kategori dene.</span></div>';
}

function search(query) { searchInput.value = query; renderListings(query); document.querySelector('#ilanlar').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
function showToast(message) { toast.textContent = message; toast.classList.add('show'); window.clearTimeout(showToast.timer); showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 2600); }

document.querySelector('#searchForm').addEventListener('submit', (event) => { event.preventDefault(); search(searchInput.value); });
document.querySelectorAll('[data-query]').forEach((button) => button.addEventListener('click', () => search(button.dataset.query)));
document.querySelectorAll('.filter').forEach((button) => button.addEventListener('click', () => { document.querySelectorAll('.filter').forEach((item) => item.classList.remove('active')); button.classList.add('active'); selectedCondition = button.dataset.condition; renderListings(searchInput.value); }));

document.querySelector('#make').addEventListener('change', (event) => { const model = document.querySelector('#model'); const year = document.querySelector('#year'); const models = { Volkswagen: ['Golf 7', 'Passat', 'Polo'], BMW: ['F30', 'F10', 'G20'], Audi: ['A4 B8', 'A3', 'A6'], Renault: ['Clio 4', 'Megane 3', 'Megane 4'], Fiat: ['Egea', 'Doblo', 'Linea'], Mercedes: ['W204', 'W205', 'W213'], Toyota: ['Corolla', 'Auris', 'Yaris'] }; model.innerHTML = '<option value="">Model Seçiniz</option>' + (models[event.target.value] || []).map((value) => `<option>${value}</option>`).join(''); model.disabled = !event.target.value; year.innerHTML = '<option value="">Yıl Seçiniz</option>' + ['2025','2024','2023','2022','2021','2020','2019','2018','2017','2016','2015'].map((value) => `<option>${value}</option>`).join(''); year.disabled = !event.target.value; });
document.querySelector('#vehicleForm').addEventListener('submit', (event) => { event.preventDefault(); const make = document.querySelector('#make').value; const model = document.querySelector('#model').value; if (!make || !model) return showToast('Önce marka ve model seç.'); search(`${make} ${model}`); });

document.addEventListener('click', (event) => { const save = event.target.closest('[data-save]'); if (save) { save.textContent = save.textContent === '♥' ? '♡' : '♥'; showToast(save.textContent === '♥' ? 'İlan favorilere eklendi.' : 'İlan favorilerden çıkarıldı.'); } const detail = event.target.closest('[data-detail]'); if (detail) { const item = listings.find((listing) => listing.id === Number(detail.dataset.detail)); showToast(`${item.title} — detay sayfası geliştirme aşamasında.`); } });

document.querySelector('#sellBtn').addEventListener('click', () => showToast('İlan verme akışı sonraki MVP adımında açılacak.'));
document.querySelector('#mobileSell').addEventListener('click', () => showToast('İlan verme akışı sonraki MVP adımında açılacak.'));
document.querySelector('#allListings').addEventListener('click', () => { selectedCondition = 'Tümü'; document.querySelectorAll('.filter').forEach((item) => item.classList.toggle('active', item.dataset.condition === 'Tümü')); search(''); });
document.querySelector('[data-show-all]').addEventListener('click', () => document.querySelector('#ilanlar').scrollIntoView({ behavior: 'smooth' }));

renderListings();
