export const PART_CATEGORIES = {
  'Motor': ['Komple Motor', 'Motor Bloğu', 'Silindir Kapağı', 'Turbo', 'Enjektör', 'Alternatör', 'Marş Motoru', 'Krank Mili', 'Piston & Sekman', 'Triger & Zincir Seti', 'Sübap Kapağı', 'Yağ Karteri'],
  'Şanzıman': ['Komple Şanzıman', 'Debriyaj Seti', 'Debriyaj Baskısı', 'Debriyaj Balatası', 'Şanzıman Dişlisi', 'Tork Konvertör', 'Şanzıman Kulak Takozu'],
  'Kaporta': ['Tampon', 'Kaput', 'Kapı', 'Çamurluk', 'Izgara', 'Bagaj Kapağı', 'Marşpiyel', 'Tavan', 'Kaporta Aksesuarı'],
  'Aydınlatma': ['Far', 'Stop', 'Sis Farı', 'Sinyal', 'Gündüz Farı', 'Ampul', 'Far Beyni', 'Plaka Lambası'],
  'Fren Sistemi': ['Balata', 'Fren Diski', 'Kaliper', 'Fren Hortumu', 'Fren Silindiri', 'ABS Modülü', 'El Freni', 'Fren Kumandası'],
  'Süspansiyon': ['Amortisör', 'Salıncak', 'Z Rotu', 'Rotil', 'Aks Bilyesi', 'Yay', 'Askı Buji', 'Süspansiyon Körüğü'],
  'Elektrik': ['Akü', 'Marş Motoru', 'Alternatör', 'Buji', 'Bobin', 'Sigorta', 'Beyin (ECU)', 'Kablo Demeti', 'Sensör'],
  'İç Aksam': ['Konsol', 'Koltuk', 'Döşeme', 'Tavan Döşemesi', 'Gösterge Paneli', 'Direksiyon', 'Vites Topuzu', 'Kapı Döşemesi'],
  'Egzoz': ['Katalitik Konvertör', 'Dizel Partikül Filtresi', 'Egzoz Susturucu', 'Egr Valfi', 'Egzoz Manifoldu'],
  'Klima': ['Klima Kompresörü', 'Kondenser', 'Evaporatör', 'Klima Hattı', 'Klima Fanı'],
  'Filtreler': ['Yağ Filtresi', 'Hava Filtresi', 'Yakıt Filtresi', 'Kabini Filtresi (Polen)'],
  'Yakıt Sistemi': ['Yakıt Pompası', 'Enjektör', 'Karbüratör', 'Benzin Deposu', 'Hava Akışmetre', 'Turbolar'],
  'Direksiyon': ['Direksiyon Kutusu', 'Direksiyon Mili', 'Hidrolik Direksiyon Pompası', 'Z Rotu', 'Direksiyon Tekerleği'],
  'Jant & Lastik': ['Jant', 'Lastik', 'Bijon', 'Kapa', 'Jant Göbeği'],
  'Cam & Ayna': ['Ön Cam', 'Arka Cam', 'Yan Cam', 'Ayna', 'Cam Motoru', 'Cam Kaldırma'],
  'Soğutma Sistemi': ['Radyatör', 'Su Pompası', 'Termostat', 'Fan', 'Soğutma Hattı'],
  'Aktarma': ['Şanzıman', 'Şaft', 'Aks', 'Diferansiyel', 'Kavrama'],
  'Diğer': ['Diğer'],
};

export const PART_CATEGORY_LIST = Object.keys(PART_CATEGORIES);

export function subcategoriesFor(category) {
  return PART_CATEGORIES[category] || [];
}
