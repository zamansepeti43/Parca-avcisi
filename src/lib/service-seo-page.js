const SITE_URL=(import.meta.env.VITE_SITE_URL||'https://parca-avcisi.vercel.app').replace(/\/$/,'');
const path=window.location.pathname.replace(/\/+$/,'')||'/';
const p=path.split('/').filter(Boolean);
const services={
 'oto-bakim':['Oto Bakım ve Yedek Parça','Periyodik bakım için motor yağı, filtre, fren ve diğer oto bakım parçalarını bulun.','Bakım'],
 'fren-bakimi':['Fren Bakımı ve Fren Parçaları','Fren balatası, disk ve fren sistemi parçalarını aracınıza uygun ilanlarla bulun.','Fren Sistemi'],
 'yag-degisimi':['Yağ Değişimi ve Filtreler','Motor yağı, yağ filtresi ve bakım parçalarını aracınıza uygun şekilde bulun.','Filtreler'],
 'klima-servisi':['Oto Klima Servisi ve Parçaları','Oto klima sistemi için uygun parça ve ilanları keşfedin.','Klima'],
 'elektrik-servisi':['Oto Elektrik Servisi ve Parçaları','Akü, alternatör, marş ve elektrik sistemi parçalarını bulun.','Elektrik'],
 'kaporta-boya':['Kaporta ve Boya Parçaları','Kaporta, ayna, far ve dış gövde parçalarını karşılaştırın.','Kaporta'],
 'suspansiyon':['Süspansiyon ve Yürüyen Aksam','Amortisör, salıncak ve süspansiyon parçalarını aracınıza göre bulun.','Süspansiyon'],
 'diagnostik':['Araç Arıza ve Diagnostik','Araç arızaları için uygun parça ve çözüm seçeneklerini keşfedin.','Elektrik']
};
if(p[0]==='servisler'){
 const [title,description,category]=services[p[1]||'oto-bakim']||['Oto Servis ve Bakım','Oto bakım, servis ve yedek parça seçeneklerini Parça Avcısı\'nda keşfedin.','Bakım'];
 document.title=`${title} | Parça Avcısı`;
 let meta=document.head.querySelector('meta[name="description"]');if(!meta){meta=document.createElement('meta');meta.name='description';document.head.appendChild(meta)}meta.content=description;
 let canonical=document.head.querySelector('link[rel="canonical"]');if(!canonical){canonical=document.createElement('link');canonical.rel='canonical';document.head.appendChild(canonical)}canonical.href=`${SITE_URL}${path}`;
 const root=document.getElementById('root');
 if(root&&!document.querySelector('#pa-service-landing')){const section=document.createElement('section');section.id='pa-service-landing';section.className='section';section.innerHTML=`<div class="container"><span class="eyebrow">PARÇA AVCISI SERVİS REHBERİ</span><h1>${title}</h1><p>${description}</p><div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:20px"><a class="dark-btn" href="/ilanlar?category=${encodeURIComponent(category)}">İlgili parçaları gör →</a><a class="text-btn" href="/ilan-ver">Parça ilanı ver →</a></div><div style="margin-top:28px"><h2>Parça Avcısı'nda nasıl kullanılır?</h2><p>Aracınızı seçin, uygun parça kategorisini açın ve mevcut ilanları karşılaştırın.</p></div></div>`;root.prepend(section)}
}
