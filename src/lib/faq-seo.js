import './faq-seo.css';

const SITE_URL = (import.meta.env.VITE_SITE_URL || 'https://parca-avcisi.vercel.app').replace(/\/$/, '');

const faq = [
  ['Parça Avcısı nedir?', 'Parça Avcısı; sıfır, 2. el ve çıkma oto parçalarını arayabileceğin, ilanları inceleyebileceğin ve satıcılarla iletişim kurabileceğin bir oto parça pazaryeridir.'],
  ['Aradığım oto parçayı nasıl bulabilirim?', 'Ana sayfadaki arama alanından parça adı, marka, model veya parça numarasıyla arama yapabilirsin. Ayrıca aracını seçerek aracına uygun ilanları filtreleyebilirsin.'],
  ['Nasıl ilan verebilirim?', 'Sağ üstteki “+ İlan Ver” butonunu kullanarak ilan oluşturabilirsin. İlanı fotoğraf, parça bilgileri, araç uyumluluğu, fiyat, şehir ve teslimat bilgileriyle hazırlayıp önizlemeden sonra yayınlayabilirsin.'],
  ['Parça bulamazsam ne yapabilirim?', 'Bulamadığın parçayı “Parça Arıyorum” bölümünden talep olarak oluşturabilirsin. Talebin uygun satıcıların karşısına çıkar ve elinde parça bulunan satıcılar “Bende Var” diyerek iletişime geçebilir.'],
  ['Sıfır, 2. el ve çıkma parça bulabilir miyim?', 'Evet. İlanlarda Sıfır, 2. El ve Çıkma seçenekleri bulunur ve ilan listesinden bu durumlara göre filtreleme yapabilirsin.'],
  ['Satıcıyla nasıl iletişim kurarım?', 'İlan detayındaki iletişim seçeneklerinden satıcıya mesaj gönderebilirsin. Satıcı telefon ve WhatsApp bilgilerini paylaşmışsa ilgili iletişim seçenekleri de gösterilir.'],
  ['Aracımın uyumlu parçalarını nasıl bulurum?', '“Aracını Seç” bölümünden marka, model ve yıl bilgilerini seç. Sistem seçtiğin araçla ilişkili ilanları aramana yardımcı olur.'],
  ['İlanımı daha sonra düzenleyebilir miyim?', 'Evet. Hesabım → İlanlarım bölümünden kendi ilanlarını yönetebilir; ilanı düzenleyebilir, yayınlayabilir, durdurabilir, satıldı olarak işaretleyebilir veya silebilirsin.'],
  ['İlan fotoğrafları ekleyebilir miyim?', 'Evet. İlan oluşturma ve düzenleme akışında fotoğraflar eklenebilir; kapak fotoğrafı seçilebilir ve mevcut fotoğraflar yönetilebilir.'],
  ['Güvenli alışveriş için nelere dikkat etmeliyim?', 'İlanı ve araç uyumluluğunu dikkatlice kontrol et, satıcı profilini incele ve alışveriş koşullarını satıcıyla netleştir. Parça Avcısı üzerinde sana gösterilen ilan bilgilerinin dışındaki ödeme veya teslimat taleplerini ayrıca doğrula.']
];

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));

function addFaqSection() {
  const main = document.querySelector('main');
  if (!main || document.querySelector('#sss')) return;

  const section = document.createElement('section');
  section.id = 'sss';
  section.className = 'section faq-section';
  section.innerHTML = `<div class="container"><div class="section-head faq-head"><div><span class="eyebrow">SIK SORULAN SORULAR</span><h2>Parça Avcısı hakkında merak edilenler</h2><p>Parça arama, ilan verme ve satıcılarla iletişim hakkında kısa cevaplar.</p></div><a class="text-btn" href="#top">Başa dön ↑</a></div><div class="faq-list" aria-label="Sık sorulan sorular">${faq.map(([q,a]) => `<details class="faq-item"><summary>${esc(q)}<span aria-hidden="true">+</span></summary><p>${esc(a)}</p></details>`).join('')}</div></div>`;

  main.appendChild(section);
  addFaqSchema();
}

function addFaqSchema() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map(([question, answer]) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer }
    }))
  };
  let script = document.head.querySelector('script[data-pa-schema="faq-page"]');
  if (!script) {
    script = document.createElement('script');
    script.type = 'application/ld+json';
    script.dataset.paSchema = 'faq-page';
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify({ ...data, url: `${SITE_URL}/#sss` });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addFaqSection, { once: true });
else addFaqSection();

export { faq };
export const faqSeoReady = true;
