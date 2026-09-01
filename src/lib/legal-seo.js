import './legal-seo.css';

const SITE_URL = (import.meta.env.VITE_SITE_URL || 'https://parca-avcisi.vercel.app').replace(/\/$/, '');
const path = window.location.pathname.replace(/\/+$/, '') || '/';

const pages = {
  '/gizlilik': {
    title: 'Gizlilik Politikası | Parça Avcısı',
    description: 'Parça Avcısı kullanıcı verilerinin kullanımı, saklanması ve korunmasına ilişkin genel gizlilik bilgileri.',
    heading: 'Gizlilik Politikası',
    sections: [
      ['Toplanan bilgiler', 'Hesap oluşturma, ilan yayınlama, parça talebi ve platform kullanımı sırasında kullanıcı tarafından sağlanan bilgiler işlenebilir. İlan ve iletişim özellikleri için gerekli bilgiler ilgili hizmetin çalışması amacıyla kullanılır.'],
      ['Kullanım amacı', 'Bilgiler; hesap yönetimi, ilanların yayınlanması, parça taleplerinin yürütülmesi, güvenlik, destek ve platformun geliştirilmesi amaçlarıyla kullanılabilir.'],
      ['Yerel arama verileri', 'Site içi arama deneyimini iyileştirmek amacıyla aranan ifadelerin bazı istatistiksel kayıtları tarayıcıdaki yerel depolamada tutulabilir. Bu kayıtlar kullanıcı hesabı verisi olarak sunucuya gönderilmez.'],
      ['Çerezler ve benzeri teknolojiler', 'Platformun çalışması için gerekli tarayıcı depolama mekanizmaları kullanılabilir. İsteğe bağlı analiz araçları yalnızca ilgili yapılandırma etkinleştirildiğinde çalışır.'],
      ['Güvenlik', 'Hesap ve platform güvenliğini korumak için makul teknik ve idari önlemler uygulanır. Kullanıcılar hesap bilgilerini ve erişim bilgilerini üçüncü kişilerle paylaşmamalıdır.'],
      ['İletişim', 'Gizlilikle ilgili sorularınız için destek@parcaavcisi.com adresinden bizimle iletişime geçebilirsiniz.']
    ]
  },
  '/kullanim-sartlari': {
    title: 'Kullanım Şartları | Parça Avcısı',
    description: 'Parça Avcısı platformunun kullanımına ilişkin temel kurallar, kullanıcı sorumlulukları ve ilan kuralları.',
    heading: 'Kullanım Şartları',
    sections: [
      ['Platformun amacı', 'Parça Avcısı, oto parça ilanlarının keşfedilmesi, yayınlanması ve kullanıcıların ilgili ilan sahipleriyle iletişim kurabilmesi için sunulan bir pazaryeri platformudur.'],
      ['Kullanıcı sorumluluğu', 'Kullanıcılar hesap bilgilerinin doğruluğundan, yayınladıkları ilanların içeriğinden ve yaptıkları işlemlerin yürürlükteki mevzuata uygunluğundan sorumludur.'],
      ['İlan kuralları', 'İlan başlığı, açıklaması, fiyatı, parça durumu ve görseller gerçeğe uygun olmalıdır. Yanıltıcı, hukuka aykırı veya başkasının haklarını ihlal eden içerikler yayınlanmamalıdır.'],
      ['İletişim ve işlemler', 'Parça Avcısı, kullanıcılar arasındaki özel satış sözleşmesinin tarafı değildir. Satın alma, teslimat, ödeme ve ürün uygunluğu gibi konularda tarafların gerekli kontrolleri yapması gerekir.'],
      ['Güvenli kullanım', 'Şüpheli ilan, dolandırıcılık girişimi veya uygunsuz içerik fark edildiğinde platformun bildirim ve destek kanalları kullanılmalıdır.'],
      ['Destek', 'Kullanım ve ilanlarla ilgili destek için destek@parcaavcisi.com adresine ulaşabilirsiniz.']
    ]
  }
};

function addMeta(name, content) {
  let el = document.head.querySelector(`meta[name="${name}"]`);
  if (!el) { el = document.createElement('meta'); el.name = name; document.head.appendChild(el); }
  el.content = content;
}

function addCanonical(url) {
  let el = document.head.querySelector('link[rel="canonical"]');
  if (!el) { el = document.createElement('link'); el.rel = 'canonical'; document.head.appendChild(el); }
  el.href = url;
}

function addSchema(page) {
  let el = document.head.querySelector('script[data-pa-legal-schema]');
  if (!el) { el = document.createElement('script'); el.type = 'application/ld+json'; el.dataset.paLegalSchema = 'true'; document.head.appendChild(el); }
  el.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: page.title,
    description: page.description,
    url: `${SITE_URL}${path}`,
    isPartOf: { '@type': 'WebSite', name: 'Parça Avcısı', url: SITE_URL }
  });
}

function render() {
  const page = pages[path];
  if (!page) return;
  document.title = page.title;
  addMeta('description', page.description);
  addMeta('robots', 'index,follow');
  addCanonical(`${SITE_URL}${path}`);

  const root = document.getElementById('root');
  if (!root || document.querySelector('#pa-legal-page')) return;
  const section = document.createElement('section');
  section.id = 'pa-legal-page';
  section.className = 'section legal-seo-page';
  section.innerHTML = `<div class="container legal-container"><span class="eyebrow">PARÇA AVCISI</span><h1>${page.heading}</h1><p class="legal-intro">${page.description}</p><div class="legal-sections">${page.sections.map(([heading, text]) => `<article><h2>${heading}</h2><p>${text}</p></article>`).join('')}</div><div class="legal-actions"><a class="dark-btn" href="/">Ana sayfaya dön →</a><a class="text-btn" href="/#iletisim">İletişime geç →</a></div></div>`;
  root.innerHTML = '';
  root.appendChild(section);
  addSchema(page);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render, { once: true });
else render();

export const legalSeoReady = true;
