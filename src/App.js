import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';

const categories = ['Motor', 'Şanzıman', 'Kaporta', 'Aydınlatma', 'Fren', 'Süspansiyon', 'Elektrik', 'İç Aksam', 'Jant & Lastik'];
const listings = [
  { id: 1, title: 'Renault Clio 4 Sağ Ön Far', condition: '2. El', price: '2.750 TL', location: 'Ankara', category: 'Aydınlatma', emoji: '💡' },
  { id: 2, title: 'Volkswagen Golf 7 Ön Tampon', condition: 'Çıkma', price: '3.900 TL', location: 'İstanbul', category: 'Kaporta', emoji: '🚘' },
  { id: 3, title: 'Ford Focus 1.6 TDCi Turbo', condition: '2. El', price: '8.500 TL', location: 'Bursa', category: 'Motor', emoji: '⚙️' },
  { id: 4, title: 'Fiat Egea Ön Fren Seti', condition: 'Sıfır', price: '4.250 TL', location: 'İzmir', category: 'Fren', emoji: '🔧' }
];

function App() {
  const [query, setQuery] = useState('');
  const [condition, setCondition] = useState('Tümü');
  const filtered = listings.filter((item) => {
    const q = query.toLocaleLowerCase('tr-TR');
    return (item.title.toLocaleLowerCase('tr-TR').includes(q) || item.category.toLocaleLowerCase('tr-TR').includes(q)) && (condition === 'Tümü' || item.condition === condition);
  });

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark">P</span><div><strong>PARÇA AVCISI</strong><small>Aradığın parçanın peşinde.</small></div></div>
        <nav><button>İlanlar</button><button>Nasıl Çalışır?</button><button className="ghost">Giriş Yap</button><button className="sell">+ İlan Ver</button></nav>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy"><span className="eyebrow">SIFIR • 2. EL • ÇIKMA</span><h1>Aradığın oto parçasını<br /><em>avla.</em></h1><p>Aracına uygun parçaları tek yerde bul, fiyatları karşılaştır ve satıcıyla doğrudan iletişime geç.</p></div>
          <div className="search-card">
            <div className="search-row"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Parça, marka veya model ara..." /><button>Parça Bul</button></div>
            <div className="vehicle-row"><button>🚗 Aracımı Seç</button><span>Örn. 2018 Renault Megane 1.5 dCi</span></div>
          </div>
        </section>

        <section className="section"><div className="section-head"><div><span className="eyebrow">HIZLI ERİŞİM</span><h2>Parçayı kategoriden bul</h2></div></div><div className="category-grid">{categories.map((c) => <button key={c} onClick={() => setQuery(c)} className="category"><span>◈</span>{c}</button>)}</div></section>

        <section className="section listings"><div className="section-head"><div><span className="eyebrow">SON İLANLAR</span><h2>Yeni eklenen parçalar</h2></div><div className="filters">{['Tümü','Sıfır','2. El','Çıkma'].map((c) => <button className={condition === c ? 'active' : ''} onClick={() => setCondition(c)} key={c}>{c}</button>)}</div></div><div className="listing-grid">{filtered.map((item) => <article className="listing" key={item.id}><div className="photo">{item.emoji}<span>{item.condition}</span></div><div className="listing-body"><small>{item.category} · {item.location}</small><h3>{item.title}</h3><div className="listing-bottom"><strong>{item.price}</strong><button>İncele →</button></div></div></article>)}</div>{filtered.length === 0 && <div className="empty">Aramana uygun ilan bulunamadı.</div>}</section>
      </main>

      <footer><strong>PARÇA AVCISI</strong><span>Türkiye'nin otomobil parçası pazaryeri — yakında.</span></footer>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
