// Demo listings used ONLY when Supabase is not configured.
// Shape mirrors toListingCard() in listings.js so the grid renders uniformly.
// subcategory values match part-catalog.js PART_CATEGORIES tree.

export const demoListings = [
  {
    id: 1, title: 'Tofaş Şahin Sağ Ön Far', partName: 'Far', condition: 'Sıfır', category: 'Aydınlatma', subcategory: 'Ön Far',
    price: 1450, city: 'Bursa', vehicle: 'Tofaş · Şahin · 1989–1999', seller: 'Tofaş Parça',
    oem: 'H0012451', description: 'Tofaş Şahin için orijinal kalite sağ ön far. Çiftliğe uygun, montaj seti dahil.', coverImage: null,
  },
  {
    id: 2, title: 'Ford Escort Ön Sağ Kapı', partName: 'Kapı', condition: '2. El', category: 'Kaporta', subcategory: 'Sağ Ön Kapı',
    price: 3800, city: 'İstanbul', vehicle: 'Ford · Escort · 1981–2000', seller: 'Escort Çıkma',
    oem: '90FB26001', description: 'Ford Escort için sağlam ön sağ kapı. Boyasız, eziksiz, çıkma parça.', coverImage: null,
  },
  {
    id: 3, title: 'Ford Transit Marş Motoru', partName: 'Marş motoru', condition: 'Çıkma', category: 'Motor', subcategory: 'Marş Motoru',
    price: 5200, city: 'İzmir', vehicle: 'Ford · Transit · 1978–2024', seller: 'Transit Ustası',
    oem: '93FB11000', description: 'Ford Transit için çıkma marş motoru. Test edildi, çalışıyor.', coverImage: null,
  },
  {
    id: 4, title: 'Renault R12 Ön Amortisör', partName: 'Amortisör', condition: '2. El', category: 'Süspansiyon', subcategory: 'Amortisör',
    price: 950, city: 'Konya', vehicle: 'Renault · R12 · 1969–1990', seller: 'R12 Severler',
    oem: '7700714192', description: 'Renault R12 için ön amortisör. Basınç testi yapıldı, sızdırmıyor.', coverImage: null,
  },
  {
    id: 5, title: 'Renault Megane 2 Arka Stop Sol', partName: 'Stop lambası', condition: '2. El', category: 'Aydınlatma', subcategory: 'Arka Stop',
    price: 1250, city: 'Ankara', vehicle: 'Renault · Megane · 2002–2008', seller: 'Megane Parça',
    oem: '265506444R', description: 'Renault Megane 2 arka stop lambası. Çatlak yok, soket dahil.', coverImage: null,
  },
  {
    id: 6, title: 'Fiat Egea Ön Fren Seti', partName: 'Fren seti', condition: 'Sıfır', category: 'Fren Sistemi', subcategory: 'Balata',
    price: 4250, city: 'İzmir', vehicle: 'Fiat · Egea · 2015–2024', seller: 'Egea Parça',
    oem: '51927314', description: 'Fiat Egea için ön fren seti: balata + disk + sensör. Sıfır, orijinal.', coverImage: null,
  },
  {
    id: 7, title: 'Fiat Doblo Debriyaj Seti', partName: 'Debriyaj seti', condition: 'Sıfır', category: 'Şanzıman', subcategory: 'Debriyaj Seti',
    price: 5850, city: 'Bursa', vehicle: 'Fiat · Doblo · 2000–2022', seller: 'Doblo Parça',
    oem: '55229374', description: 'Fiat Doblo için baskı balata + rulman debriyaj seti. Sıfır.', coverImage: null,
  },
  {
    id: 8, title: 'Volkswagen Golf 6 Sağ Ayna', partName: 'Yan ayna', condition: 'Çıkma', category: 'Kaporta', subcategory: 'Ayna',
    price: 2600, city: 'İstanbul', vehicle: 'Volkswagen · Golf · 2008–2013', seller: 'VW Çıkma',
    oem: '5K0857538A', description: 'Volkswagen Golf 6 sağ yan ayna. Elektrikli, sinyal lambalı.', coverImage: null,
  },
  {
    id: 9, title: 'Toyota Corolla 1.6 Motor', partName: 'Motor', condition: 'Çıkma', category: 'Motor', subcategory: 'Motor Komple',
    price: 18000, city: 'Adana', vehicle: 'Toyota · Corolla · 1991–2002', seller: 'Corolla Çıkma',
    oem: '11001-0D041', description: 'Toyota Corolla 1.6 benzinli motor. Şasiyle test edildi.', coverImage: null,
  },
  {
    id: 10, title: 'Opel Astra J Ön Tampon', partName: 'Tampon', condition: '2. El', category: 'Kaporta', subcategory: 'Ön Tampon',
    price: 3100, city: 'Ankara', vehicle: 'Opel · Astra · 2009–2015', seller: 'Astra Parça',
    oem: '13349794', description: 'Opel Astra J ön tampon. Boya hasarı yok, montaj klipsleri mevcut.', coverImage: null,
  },
  {
    id: 11, title: 'Peugeot 206 Debriyaj Seti', partName: 'Debriyaj seti', condition: 'Sıfır', category: 'Şanzıman', subcategory: 'Debriyaj Seti',
    price: 4100, city: 'Bursa', vehicle: 'Peugeot · 206 · 1998–2009', seller: '206 Parça',
    oem: '20519904', description: 'Peugeot 206 için debriyaj seti. Sıfır, kutusunda.', coverImage: null,
  },
  {
    id: 12, title: 'Renault Clio 2 Akü', partName: 'Akü', condition: 'Sıfır', category: 'Elektrik', subcategory: 'Akü',
    price: 3300, city: 'İstanbul', vehicle: 'Renault · Clio · 1998–2005', seller: 'Akü Merkezi',
    oem: '7711234567', description: 'Renault Clio 2 için 60Ah akü. Garantili, sıfır.', coverImage: null,
  },
  {
    id: 13, title: 'Tofaş Murat 124 Far', partName: 'Far', condition: '2. El', category: 'Aydınlatma', subcategory: 'Far',
    price: 850, city: 'Eskişehir', vehicle: 'Tofaş · Murat 124 · 1971–1977', seller: 'Klasik Tofaş',
    oem: 'K1971124', description: 'Tofaş Murat 124 için sağlam far. Camı çiziksiz, kasa sağlam.', coverImage: null,
  },
  {
    id: 14, title: 'Ford Escort 1996 Gösterge Paneli', partName: 'Gösterge', condition: '2. El', category: 'İç Aksam', subcategory: 'Gösterge Paneli',
    price: 1750, city: 'Konya', vehicle: 'Ford · Escort · 1981–2000', seller: 'Escort Çıkma',
    oem: '96FB10F160', description: 'Ford Escort 1996 gösterge paneli. Çalışır durumda, çatlak yok.', coverImage: null,
  },
  {
    id: 15, title: 'Citroën Berlingo Arka Tampon', partName: 'Tampon', condition: '2. El', category: 'Kaporta', subcategory: 'Arka Tampon',
    price: 2900, city: 'İzmir', vehicle: 'Citroën · Berlingo · 1996–2021', seller: 'Berlingo Parça',
    oem: '7414L0', description: 'Citroën Berlingo arka tampon. Yırtık yok, boya ile kullanılabilir.', coverImage: null,
  },
  {
    id: 16, title: 'Toyota Hilux Ön Amortisör', partName: 'Amortisör', condition: 'Sıfır', category: 'Süspansiyon', subcategory: 'Amortisör',
    price: 4750, city: 'Ankara', vehicle: 'Toyota · Hilux · 1968–2024', seller: 'Hilux Parça',
    oem: '48521-0K050', description: 'Toyota Hilux için ön amortisör. Sıfır, orijinal.', coverImage: null,
  },
  {
    id: 17, title: 'Ford Escort Kaput', partName: 'Kaput', condition: 'Çıkma', category: 'Kaporta', subcategory: 'Kaput',
    price: 3200, city: 'Kocaeli', vehicle: 'Ford · Escort · 1981–2000', seller: 'Escort Çıkma',
    oem: '90FB16028', description: 'Ford Escort için kaput. Eziksiz, çizik boya mevcut, çıkma parça.', coverImage: null,
  },
  {
    id: 18, title: 'VW Passat B5 Kaput', partName: 'Kaput', condition: 'Sıfır', category: 'Kaporta', subcategory: 'Kaput',
    price: 6800, city: 'İstanbul', vehicle: 'Volkswagen · Passat · 1996–2005', seller: 'VW Parça',
    oem: '3B5823025', description: 'VW Passat B5 için sıfır kaput. Orijinal, orijinal ambalajında.', coverImage: null,
  },
];
