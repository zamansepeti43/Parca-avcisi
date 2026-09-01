import './about-contact-seo.css';

const SITE_URL = (import.meta.env.VITE_SITE_URL || 'https://parca-avcisi.vercel.app').replace(/\/$/, '');
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));

function addPublicInfo() {
  const main = document.querySelector('main');
  if (!main || document.querySelector('#hakkimizda')) return;

  const section = document.createElement('section');
  section.id = 'hakkimizda';
  section.className = 'section about-contact-section';
  section.innerHTML = `<div class="container"><div class="about-grid"><article class="about-card"><span class="eyebrow">HAKKIMIZDA</span><h2>Oto parça aramayı daha kolay hale getiriyoruz.</h2><p>Parça Avcısı; sıfır, 2. el ve çıkma oto parçalarını tek yerde keşfetmek, araç uyumluluğuna göre aramak ve ilan sahipleriyle iletişim kurmak için tasarlanmış bir oto parça pazaryeridir.</p><div class="about-points"><div><strong>Parça Bul</strong><span>Parça adı, marka, model veya parça numarasıyla ara.</span></div><div><strong>Aracını Seç</strong><span>Marka, model ve yıl bilgileriyle uygun ilanları keşfet.</span></div><div><strong>Parça Sat</strong><span>Elindeki parçayı ilan oluşturma akışıyla satışa çıkar.</span></div></div></article><article class="contact-card" id="iletisim"><span class="eyebrow">İLETİŞİM</span><h2>Yardım mı gerekiyor?</h2><p>İlan, hesap, parça talebi veya platform kullanımıyla ilgili destek için bize ulaşabilirsin.</p><a class="contact-email" href="mailto:destek@parcaavcisi.com">destek@parcaavcisi.com</a><small>Destek taleplerini mümkün olduğunca açık şekilde ilet; ilgili ilan veya talep numarasını eklemek çözümü kolaylaştırır.</small></article></div></div>`;
  main.appendChild(section);
  addOrganizationSchema();
}

function addOrganizationSchema() {
  let script = document.head.querySelector('script[data-pa-schema="organization-public"]');
  if (!script) {
    script = document.createElement('script');
    script.type = 'application/ld+json';
    script.dataset.paSchema = 'organization-public';
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Parça Avcısı',
    url: SITE_URL,
    email: 'destek@parcaavcisi.com'
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addPublicInfo, { once: true });
else addPublicInfo();

export const aboutContactSeoReady = true;
