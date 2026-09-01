const CATEGORY_LINKS = [
  ['Motor', 'motor'],
  ['Şanzıman', 'sanziman'],
  ['Kaporta', 'kaporta'],
  ['Aydınlatma', 'aydinlatma'],
  ['Fren Sistemi', 'fren-sistemi'],
  ['Süspansiyon', 'suspansiyon'],
  ['Elektrik', 'elektrik'],
  ['İç Aksam', 'ic-aksam'],
  ['Egzoz', 'egzoz'],
  ['Klima', 'klima'],
  ['Filtreler', 'filtreler'],
  ['Yakıt Sistemi', 'yakit-sistemi'],
  ['Direksiyon', 'direksiyon'],
  ['Jant & Lastik', 'jant-lastik'],
  ['Cam & Ayna', 'cam-ayna'],
  ['Soğutma Sistemi', 'sogutma-sistemi'],
  ['Aktarma', 'aktarma'],
  ['Diğer', 'diger'],
];

function renderFooterNavigation() {
  const footer = document.querySelector('footer');
  if (!footer || footer.dataset.seoEnhanced === 'true') return;

  const inner = footer.querySelector('.footer-inner');
  if (!inner) return;

  inner.innerHTML = `
    <div class="footer-brand-block">
      <a class="brand" href="/#top" aria-label="Parça Avcısı ana sayfa">
        <img class="brand-mark" src="/app-logo.png" alt="Parça Avcısı" width="34" height="34">
        <span>PARÇA <strong>AVCISI</strong></span>
      </a>
      <p>Aradığın her parça Parça Avcısı'nda.</p>
      <nav class="footer-primary-links" aria-label="Site bağlantıları">
        <a href="/ilanlar">Tüm İlanlar</a>
        <a href="/#aracini-sec">Aracını Seç</a>
        <a href="/#sss">Sık Sorulan Sorular</a>
        <a href="/#hakkimizda">Hakkımızda</a>
        <a href="/#iletisim">İletişim</a>
      </nav>
    </div>
    <div class="footer-category-block">
      <h2>Oto Parça Kategorileri</h2>
      <nav class="footer-category-grid" aria-label="Oto parça kategorileri">
        ${CATEGORY_LINKS.map(([label, slug]) => `<a href="/parcalar/${slug}">${label}</a>`).join('')}
      </nav>
    </div>
    <div class="footer-bottom">
      <span>© 2026 Parça Avcısı</span>
      <span>Oto yedek parça pazaryeri</span>
    </div>
  `;

  footer.dataset.seoEnhanced = 'true';
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderFooterNavigation, { once: true });
} else {
  renderFooterNavigation();
}
