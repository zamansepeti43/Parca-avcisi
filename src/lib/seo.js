const SITE_URL = (import.meta.env.VITE_SITE_URL || 'https://parca-avcisi.vercel.app').replace(/\/$/, '');
const GA_ID = import.meta.env.VITE_GA_ID || '';
const SEARCH_CONSOLE_VERIFICATION = import.meta.env.VITE_GOOGLE_SITE_VERIFICATION || '';

const accountPaths = new Set(['/profilim','/ilanlarim','/taleplerim','/mesajlarim','/favorilerim','/kayitli-aramalarim','/bildirimler','/musterilerim','/hesap-bilgileri','/ayarlar','/yardim-destek','/araclarim']);
const path = window.location.pathname.replace(/\/+$/, '') || '/';
const params = new URLSearchParams(window.location.search);
const category = params.get('category');
const subcategory = params.get('subcategory');
const vehicleType = params.get('vehicleType');

function setMeta(name, content) {
  let element = document.head.querySelector(`meta[name="${name}"]`);
  if (!element) { element = document.createElement('meta'); element.name = name; document.head.appendChild(element); }
  element.content = content;
}
function setProperty(property, content) {
  let element = document.head.querySelector(`meta[property="${property}"]`);
  if (!element) { element = document.createElement('meta'); element.setAttribute('property', property); document.head.appendChild(element); }
  element.content = content;
}
function setCanonical(url) {
  let link = document.head.querySelector('link[rel="canonical"]');
  if (!link) { link = document.createElement('link'); link.rel = 'canonical'; document.head.appendChild(link); }
  link.href = url;
}
function addJsonLd(id, data) {
  let script = document.head.querySelector(`script[data-seo-jsonld="${id}"]`);
  if (!script) { script = document.createElement('script'); script.type = 'application/ld+json'; script.dataset.seoJsonld = id; document.head.appendChild(script); }
  script.textContent = JSON.stringify(data);
}

const isAccount = accountPaths.has(path);
const isListings = path === '/ilanlar';
const hasFilterQuery = Boolean(category || subcategory || vehicleType || params.get('q'));
let title = 'Parça Avcısı | Oto Parça Pazaryeri';
let description = 'Sıfır, 2. el ve çıkma oto parçalarını araç uyumluluğuna göre bul, karşılaştır ve ilan ver.';
if (isListings) {
  title = 'Oto Parça İlanları | Parça Avcısı';
  description = 'Oto parça ilanlarını ara, filtrele ve satıcıları karşılaştır. Sıfır, 2. el ve çıkma parçaları Parça Avcısı\'nda keşfet.';
}
if (category) {
  const label = [category, subcategory, vehicleType].filter(Boolean).join(' ');
  title = `${label} Oto Parçaları | Parça Avcısı`;
  description = `${label} oto parçalarını Parça Avcısı\'nda ara, ilanları karşılaştır ve uygun parçayı bul.`;
}

document.title = title;
setMeta('description', description);
setMeta('robots', isAccount || hasFilterQuery ? 'noindex,follow' : 'index,follow');
setProperty('og:title', title);
setProperty('og:description', description);
setProperty('og:url', `${SITE_URL}${isListings ? '/ilanlar' : '/'}`);
setProperty('og:type', 'website');
setProperty('og:site_name', 'Parça Avcısı');
setMeta('twitter:title', title);
setMeta('twitter:description', description);
setCanonical(`${SITE_URL}${isListings ? '/ilanlar' : '/'}`);

addJsonLd('organization', {'@context':'https://schema.org','@type':'Organization',name:'Parça Avcısı',url:SITE_URL,logo:`${SITE_URL}/app-logo.png`});
addJsonLd('website', {'@context':'https://schema.org','@type':'WebSite',name:'Parça Avcısı',url:SITE_URL,potentialAction:{'@type':'SearchAction',target:`${SITE_URL}/ilanlar?q={search_term_string}`,'query-input':'required name=search_term_string'}});
if (isListings) addJsonLd('breadcrumb', {'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'Ana Sayfa',item:`${SITE_URL}/`},{'@type':'ListItem',position:2,name:'İlanlar',item:`${SITE_URL}/ilanlar`}]});

if (SEARCH_CONSOLE_VERIFICATION) setMeta('google-site-verification', SEARCH_CONSOLE_VERIFICATION);
if (GA_ID && !document.querySelector(`script[data-pa-ga="${GA_ID}"]`)) {
  const script = document.createElement('script'); script.async = true; script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`; script.dataset.paGa = GA_ID; document.head.appendChild(script);
  window.dataLayer = window.dataLayer || []; window.gtag = function gtag(){ window.dataLayer.push(arguments); }; window.gtag('js', new Date()); window.gtag('config', GA_ID, { anonymize_ip: true });
}
export function trackSeoEvent(name, eventParams = {}) { if (typeof window.gtag === 'function') window.gtag('event', name, eventParams); }
