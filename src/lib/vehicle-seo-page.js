import { vehicleCatalog } from './vehicle-catalog.js';

const SITE_URL = (import.meta.env.VITE_SITE_URL || 'https://parca-avcisi.vercel.app').replace(/\/$/, '');
const path = window.location.pathname.replace(/\/+$/, '');
const match = path.match(/^\/arac\/([^/]+)\/([^/]+)(?:\/([^/]+))?$/);
if (!match) throw new Error('not vehicle seo route');
const slug = (value) => String(value ?? '').trim().toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ı/g,'i').replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s').replace(/ö/g,'o').replace(/ç/g,'c').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
const rows = Array.isArray(vehicleCatalog) ? vehicleCatalog : [];
const candidates = rows.filter(v => slug(v.make ?? v.brand) === match[1] && slug(v.model) === match[2]);
if (!candidates.length) { document.title = 'Araç Bulunamadı | Parça Avcısı'; }
else {
  const first = candidates[0];
  const make = first.make ?? first.brand, model = first.model;
  const years = [...new Set(candidates.map(v => v.year).filter(Boolean))].sort((a,b)=>Number(a)-Number(b));
  const variants = [...new Set(candidates.map(v => v.version ?? v.engine ?? v.trim).filter(Boolean))];
  const year = match[3] ? candidates.find(v => slug(v.year) === match[3])?.year : null;
  const displayName = `${make} ${model}${year ? ` ${year}` : ''}`;
  const title = `${displayName} Yedek Parça | Parça Avcısı`;
  const description = `${displayName} için uyumlu oto yedek parçalarını bulun. ${variants.slice(0,4).join(', ')}${variants.length > 4 ? ' ve diğer seçenekler' : ''}. İlanları karşılaştırın.`;
  const setMeta=(name,content)=>{let e=document.head.querySelector(`meta[name="${name}"]`);if(!e){e=document.createElement('meta');e.name=name;document.head.appendChild(e)}e.content=content};
  document.title=title; setMeta('description',description); setMeta('robots','index,follow');
  let canonical=document.head.querySelector('link[rel="canonical"]');if(!canonical){canonical=document.createElement('link');canonical.rel='canonical';document.head.appendChild(canonical)}canonical.href=`${SITE_URL}${path}`;
  const jsonld={'@context':'https://schema.org','@type':'Vehicle',name:displayName,brand:{'@type':'Brand',name:make},model,url:`${SITE_URL}${path}`}; if(year) jsonld.vehicleModelDate=String(year);
  let schema=document.head.querySelector('script[data-vehicle-seo]');if(!schema){schema=document.createElement('script');schema.type='application/ld+json';schema.dataset.vehicleSeo='1';document.head.appendChild(schema)}schema.textContent=JSON.stringify(jsonld);
  const root=document.getElementById('root'); const section=document.createElement('section'); section.className='section'; section.innerHTML=`<div class="container"><div class="eyebrow">ARAÇ KATALOĞU</div><h1>${displayName} Yedek Parça</h1><p>${description}</p><div class="seo-vehicle-grid"><div><strong>Model yılları</strong><div class="seo-chip-list">${years.slice(0,30).map(y=>`<a class="seo-chip" href="/arac/${match[1]}/${match[2]}/${slug(y)}">${y}</a>`).join('')}</div></div><div><strong>Motor / versiyon</strong><div class="seo-chip-list">${variants.slice(0,30).map(v=>`<span class="seo-chip">${v}</span>`).join('')}</div></div></div><div class="seo-vehicle-cta"><a class="dark-btn" href="/ilanlar">${displayName} için ilanları ara</a></div></div>`; root.replaceChildren(section);
}
