const SITE_URL = (import.meta.env.VITE_SITE_URL || 'https://parca-avcisi.vercel.app').replace(/\/$/, '');
const GA_ID = import.meta.env.VITE_GA_ID || '';
const SEARCH_CONSOLE_VERIFICATION = import.meta.env.VITE_GOOGLE_SITE_VERIFICATION || '';

const CATEGORY_PAGES = {
  'motor': 'Motor', 'sanziman': 'Şanzıman', 'kaporta': 'Kaporta', 'aydinlatma': 'Aydınlatma',
  'fren-sistemi': 'Fren Sistemi', 'suspansiyon': 'Süspansiyon', 'elektrik': 'Elektrik', 'ic-aksam': 'İç Aksam',
  'egzoz': 'Egzoz', 'klima': 'Klima', 'filtreler': 'Filtreler', 'yakit-sistemi': 'Yakıt Sistemi',
  'direksiyon': 'Direksiyon', 'jant-lastik': 'Jant & Lastik', 'cam-ayna': 'Cam & Ayna',
  'sogutma-sistemi': 'Soğutma Sistemi', 'aktarma': 'Aktarma', 'diger': 'Diğer'
};
const accountPaths = new Set(['/profilim','/ilanlarim','/taleplerim','/mesajlarim','/favorilerim','/kayitli-aramalarim','/bildirimler','/musterilerim','/hesap-bilgileri','/ayarlar','/yardim-destek','/araclarim']);
const path = window.location.pathname.replace(/\/+$/, '') || '/';
const params = new URLSearchParams(window.location.search);
const category = params.get('category');
const subcategory = params.get('subcategory');
const vehicleType = params.get('vehicleType');
const categorySlug = path.startsWith('/parcalar/') ? path.slice('/parcalar/'.length) : '';
const landingCategory = CATEGORY_PAGES[categorySlug] || '';

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
function addLandingPage() {
  if (!landingCategory) return;
  const main = document.querySelector('main');
  if (!main || document.querySelector('#seo-landing')) return;
  const section = document.createElement('section');
  section.id = 'seo-landing';
  section.className = 'section';
  section.innerHTML = `<div class="container"><span class="eyebrow">PARÇA AVCISI KATEGORİ</span><h1>${landingCategory} Oto Parçaları</h1><p>Aracınıza uygun ${landingCategory.toLocaleLowerCase('tr-TR')} parçalarını Parça Avcısı'nda keşfedin. Sıfır, 2. el ve çıkma seçeneklerini karşılaştırın; uygun parçayı ve satıcıyı bulun.</p><div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:18px"><a class="dark-btn" href="/ilanlar?category=${encodeURIComponent(landingCategory)}">${landingCategory} ilanlarını gör</a><a class="text-btn" href="/ilanlar">Tüm ilanlara git →</a></div></div>`;
  main.prepend(section);
}

const isAccount = accountPaths.has(path);
const isListings = path === '/ilanlar';
const isCategoryLanding = Boolean(landingCategory);
const hasFilterQuery = Boolean(category || subcategory || vehicleType || params.get('q'));
let title = 'Parça Avcısı | Oto Parça Pazaryeri';
let description = 'Sıfır, 2. el ve çıkma oto parçalarını araç uyumluluğuna göre bul, karşılaştır ve ilan ver.';
if (isListings) { title = 'Oto Parça İlanları | Parça Avcısı'; description = 'Oto parça ilanlarını ara, filtrele ve satıcıları karşılaştır. Sıfır, 2. el ve çıkma parçaları Parça Avcısı\'nda keşfet.'; }
if (isCategoryLanding) { title = `${landingCategory} Oto Parçaları | Parça Avcısı`; description = `${landingCategory} oto parçalarını Parça Avcısı\'nda keşfedin. Sıfır, 2. el ve çıkma parça ilanlarını karşılaştırın ve aracınıza uygun parçayı bulun.`; }
if (category && !isCategoryLanding) { const label = [category, subcategory, vehicleType].filter(Boolean).join(' '); title = `${label} Oto Parçaları | Parça Avcısı`; description = `${label} oto parçalarını Parça Avcısı\'nda ara, ilanları karşılaştır ve uygun parçayı bul.`; }

document.title = title;
setMeta('description', description);
setMeta('robots', isAccount || (hasFilterQuery && !isCategoryLanding) ? 'noindex,follow' : 'index,follow');
setProperty('og:title', title); setProperty('og:description', description); setProperty('og:url', `${SITE_URL}${isCategoryLanding ? `/parcalar/${categorySlug}` : isListings ? '/ilanlar' : '/'}`); setProperty('og:type', 'website'); setProperty('og:site_name', 'Parça Avcısı'); setProperty('og:image', `${SITE_URL}/app-logo.png`);
setMeta('twitter:title', title); setMeta('twitter:description', description);
setCanonical(`${SITE_URL}${isCategoryLanding ? `/parcalar/${categorySlug}` : isListings ? '/ilanlar' : '/'}`);

addJsonLd('organization', {'@context':'https://schema.org','@type':'Organization',name:'Parça Avcısı',url:SITE_URL,logo:`${SITE_URL}/app-logo.png`});
addJsonLd('website', {'@context':'https://schema.org','@type':'WebSite',name:'Parça Avcısı',url:SITE_URL,potentialAction:{'@type':'SearchAction',target:`${SITE_URL}/ilanlar?q={search_term_string}`,'query-input':'required name=search_term_string'}});
if (isListings || isCategoryLanding) addJsonLd('breadcrumb', {'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'Ana Sayfa',item:`${SITE_URL}/`},{'@type':'ListItem',position:2,name:isCategoryLanding ? landingCategory : 'İlanlar',item:`${SITE_URL}${isCategoryLanding ? `/parcalar/${categorySlug}` : '/ilanlar'}`}]});
if (isCategoryLanding) { addLandingPage(); addJsonLd('category-page', {'@context':'https://schema.org','@type':'CollectionPage',name:`${landingCategory} Oto Parçaları`,description,url:`${SITE_URL}/parcalar/${categorySlug}`}); }

function updateListingItemList() {
  if (!isListings) return;
  const cards = [...document.querySelectorAll('#listingGrid .listing-card')]; if (!cards.length) return;
  addJsonLd('listing-item-list', {'@context':'https://schema.org','@type':'ItemList',name:'Parça Avcısı oto parça ilanları',itemListElement:cards.slice(0,24).map((card,index)=>({'@type':'ListItem',position:index+1,name:card.querySelector('h3')?.textContent?.trim() || 'Oto parçası'}))});
}
if (isListings) { const observer = new MutationObserver(updateListingItemList); observer.observe(document.body,{childList:true,subtree:true}); window.setTimeout(updateListingItemList,1500); }

if (SEARCH_CONSOLE_VERIFICATION) setMeta('google-site-verification', SEARCH_CONSOLE_VERIFICATION);
if (GA_ID && !document.querySelector(`script[data-pa-ga="${GA_ID}"]`)) { const script=document.createElement('script'); script.async=true; script.src=`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`; script.dataset.paGa=GA_ID; document.head.appendChild(script); window.dataLayer=window.dataLayer||[]; window.gtag=function gtag(){window.dataLayer.push(arguments);}; window.gtag('js',new Date()); window.gtag('config',GA_ID,{anonymize_ip:true}); }
document.addEventListener('submit', (event) => { if (event.target?.id === 'searchForm' || event.target?.id === 'listingPageSearchForm') { const input=event.target.querySelector('input'); if (typeof window.gtag==='function') window.gtag('event','search',{search_term:input?.value?.trim() || ''}); } });
export function trackSeoEvent(name,eventParams={}) { if (typeof window.gtag==='function') window.gtag('event',name,eventParams); }
