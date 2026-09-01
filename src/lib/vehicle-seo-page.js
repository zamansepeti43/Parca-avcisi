import { vehicleCatalog } from './vehicle-catalog.js';
import './vehicle-seo-page.css';

const SITE_URL=(import.meta.env.VITE_SITE_URL||'https://parca-avcisi.vercel.app').replace(/\/$/,'');
const path=window.location.pathname.replace(/\/+$/,'');
const match=path.match(/^\/arac\/([^/]+)\/([^/]+)(?:\/([^/]+))?$/);
if(match){
 const slug=v=>String(v??'').trim().toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s').replace(/ö/g,'o').replace(/ç/g,'c').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
 const rows=Array.isArray(vehicleCatalog)?vehicleCatalog:[];
 const candidates=rows.filter(v=>slug(v.make??v.brand)===match[1]&&slug(v.model)===match[2]);
 const setMeta=(n,c)=>{let e=document.head.querySelector(`meta[name="${n}"]`);if(!e){e=document.createElement('meta');e.name=n;document.head.appendChild(e)}e.content=c};
 if(!candidates.length){document.title='Araç Bulunamadı | Parça Avcısı';setMeta('robots','noindex,follow');}
 else{
  const first=candidates[0],make=first.make??first.brand,model=first.model;
  const years=[...new Set(candidates.map(v=>v.year).filter(Boolean))].sort((a,b)=>Number(a)-Number(b));
  const variants=[...new Set(candidates.map(v=>v.version??v.engine??v.trim).filter(Boolean))];
  const year=match[3]?candidates.find(v=>slug(v.year)===match[3])?.year:null;
  const displayName=`${make} ${model}${year?` ${year}`:''}`;
  const title=`${displayName} Yedek Parça | Parça Avcısı`,description=`${displayName} için uyumlu oto yedek parçalarını bulun. ${variants.slice(0,4).join(', ')}${variants.length>4?' ve diğer seçenekler':''}. İlanları karşılaştırın.`;
  document.title=title;setMeta('description',description);setMeta('robots','index,follow');
  let canonical=document.head.querySelector('link[rel="canonical"]');if(!canonical){canonical=document.createElement('link');canonical.rel='canonical';document.head.appendChild(canonical)}canonical.href=`${SITE_URL}${path}`;
  let schema=document.head.querySelector('script[data-vehicle-seo]');if(!schema){schema=document.createElement('script');schema.type='application/ld+json';schema.dataset.vehicleSeo='1';document.head.appendChild(schema)}schema.textContent=JSON.stringify({'@context':'https://schema.org','@type':'Vehicle',name:displayName,brand:{'@type':'Brand',name:make},model,url:`${SITE_URL}${path}`,...(year?{vehicleModelDate:String(year)}:{})});
  const categories=[['motor','Motor'],['fren-sistemi','Fren Sistemi'],['kaporta','Kaporta'],['aydinlatma','Aydınlatma'],['elektrik','Elektrik'],['suspansiyon','Süspansiyon'],['sanziman','Şanzıman'],['filtreler','Filtreler'],['klima','Klima'],['jant-lastik','Jant & Lastik']];
  const root=document.getElementById('root');if(root){const section=document.createElement('section');section.id='pa-vehicle-seo';section.innerHTML=`<div class="pa-vehicle-seo-wrap"><div class="eyebrow">ARAÇ KATALOĞU</div><h1>${displayName} Yedek Parça</h1><p>${description}</p><div class="pa-vehicle-seo-grid">${categories.map(([s,n])=>`<a class="pa-vehicle-seo-card" href="/ilanlar?vehicleMake=${encodeURIComponent(make)}&vehicleModel=${encodeURIComponent(model)}${year?`&vehicleYear=${encodeURIComponent(year)}`:''}&category=${encodeURIComponent(n)}"><strong>${n}</strong><span class="pa-vehicle-seo-muted">${displayName} için parçaları ara →</span></a>`).join('')}</div><div><strong>Model yılları</strong><div class="pa-vehicle-seo-years">${years.slice(0,40).map(y=>`<a class="pa-vehicle-seo-chip" href="/arac/${match[1]}/${match[2]}/${slug(y)}">${y}</a>`).join('')}</div></div><div style="margin-top:20px"><strong>Motor / versiyon</strong><div class="pa-vehicle-seo-engines">${variants.slice(0,40).map(v=>`<span class="pa-vehicle-seo-chip">${v}</span>`).join('')}</div></div><div class="pa-vehicle-seo-cta"><a class="pa-vehicle-seo-primary" href="/ilanlar?vehicleMake=${encodeURIComponent(make)}&vehicleModel=${encodeURIComponent(model)}${year?`&vehicleYear=${encodeURIComponent(year)}`:''}">Bu araç için tüm ilanları gör</a><a class="pa-vehicle-seo-secondary" href="/ilan-ver">Parça ilanı ver</a></div></div>`;root.replaceChildren(section)}
 }
}
