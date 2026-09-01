import { vehicleCatalog } from './vehicle-catalog.js';

const path=window.location.pathname.replace(/\/+$/,'')||'/';
const slug=(v)=>String(v??'').trim().toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s').replace(/ö/g,'o').replace(/ç/g,'c').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
const escapeHtml=(v)=>String(v??'').replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const addLinks=(links,extra='')=>{const main=document.querySelector('main');if(!main||document.querySelector('#seo-internal-links'))return;const section=document.createElement('section');section.id='seo-internal-links';section.className='section';section.innerHTML=`<div class="container"><span class="eyebrow">PARÇA AVCISI KATALOĞU</span><h2>Aracınıza Uygun Parçaları Keşfedin</h2><p>Araç, model, motor ve parça kategorileri arasında ilerleyerek doğru yedek parçaya ulaşın.</p>${extra}<nav aria-label="İlgili bağlantılar" style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px">${links.map(({href,label})=>`<a class="text-btn" href="${href}">${escapeHtml(label)} →</a>`).join('')}</nav></div>`;main.appendChild(section);};
const p=path.split('/').filter(Boolean);
const services={
 'oto-bakim':['Oto Bakım ve Yedek Parça','Filtreler'],
 'fren-bakimi':['Fren Bakımı ve Fren Parçaları','Fren Sistemi'],
 'yag-degisimi':['Yağ Değişimi ve Filtreler','Filtreler'],
 'klima-servisi':['Oto Klima Servisi ve Parçaları','Klima'],
 'elektrik-servisi':['Oto Elektrik Servisi ve Parçaları','Elektrik'],
 'kaporta-boya':['Kaporta ve Boya Parçaları','Kaporta'],
 'suspansiyon':['Süspansiyon ve Yürüyen Aksam','Süspansiyon'],
 'diagnostik':['Araç Arıza ve Diagnostik','Elektrik']
};
if(p[0]==='arac'&&p[1]&&p[2]){
 const row=vehicleCatalog.find(v=>slug(v.make??v.brand)===p[1]&&slug(v.model)===p[2]);
 if(row){
  const make=row.make??row.brand,model=row.model;
  const engines=[...(Array.isArray(row.engines)?row.engines:[])].filter(Boolean).slice(0,8);
  const links=[{href:`/ilanlar?vehicleMake=${encodeURIComponent(make)}&vehicleModel=${encodeURIComponent(model)}`,label:`${make} ${model} parçaları`}];
  ['Motor','Fren Sistemi','Kaporta','Elektrik','Süspansiyon','Klima'].forEach(category=>links.push({href:`/ilanlar?category=${encodeURIComponent(category)}&vehicleMake=${encodeURIComponent(make)}&vehicleModel=${encodeURIComponent(model)}`,label:`${make} ${model} ${category}`}));
  const engineText=engines.length?`<p class="seo-vehicle-details"><strong>Motor seçenekleri:</strong> ${escapeHtml(engines.join(', '))}</p>`:'';
  addLinks(links,engineText);
 }
}
if(p[0]==='parcalar'&&p[1]){
 const category=p[1].replace(/-/g,' ');
 const makes=[...new Set(vehicleCatalog.map(v=>v.make).filter(Boolean))].slice(0,12);
 addLinks(makes.map(make=>({href:`/ilanlar?category=${encodeURIComponent(category)}&vehicleMake=${encodeURIComponent(make)}`,label:`${make} ${category}`})));
}
if(p[0]==='ilanlar'){
 const rows=vehicleCatalog.slice(0,18);
 const links=rows.map(v=>({href:`/arac/${slug(v.make??v.brand)}/${slug(v.model)}`,label:`${v.make??v.brand} ${v.model}`}));
 addLinks(links);
}
if(p[0]==='servisler'&&services[p[1]]){
 const [serviceTitle,category]=services[p[1]];
 const links=[
  {href:`/ilanlar?category=${encodeURIComponent(category)}`,label:`${category} parçaları`},
  {href:'/ilanlar',label:'Tüm ilanları gör'},
  {href:'/#aracini-sec',label:'Aracını seç'}
 ];
 Object.entries(services).filter(([key])=>key!==p[1]).slice(0,5).forEach(([key,data])=>links.push({href:`/servisler/${key}`,label:data[0]}));
 addLinks(links,`<p><strong>${escapeHtml(serviceTitle)}</strong> sayfasından doğrudan ilgili parça kategorisine geçebilir, araç seçerek sonuçları daraltabilirsiniz.</p>`);
}
export const internalLinkingSeoReady=true;
