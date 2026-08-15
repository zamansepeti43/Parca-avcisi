// Parça Avcısı MVP — Ana kategori → alt kategori sistemi.
// Temel ağaç binek/otomobil için; araç tipine özgü ağaçlar VEHICLE_TREES'ta.
// Alt kategoriler tüm araç tiplerinde körlemesine gösterilmez: araç tipi
// seçildiğinde ilgili ağaç kullanılır (ör. Kamyon'da "Bagaj Kapağı" yoktur).

export const PART_CATEGORIES = {
  'Motor': [
    'Motor Komple', 'Motor Bloğu', 'Silindir Kapağı', 'Krank', 'Piston', 'Eksantrik', 'Subap', 'Turbo', 'Enjektör',
    'Alternatör', 'Marş Motoru', 'Su Pompası', 'Yağ Pompası', 'Triger & Zincir Seti', 'Sübap Kapağı', 'Yağ Karteri',
  ],
  'Şanzıman': ['Komple Şanzıman', 'Debriyaj Seti', 'Debriyaj Baskısı', 'Debriyaj Balatası', 'Volan', 'Şanzıman Kapağı', 'Vites Mekanizması', 'Şanzıman Dişlisi', 'Tork Konvertör', 'Şanzıman Kulak Takozu'],
  'Kaporta': [
    'Kaput', 'Ön Tampon', 'Arka Tampon', 'Tampon', 'Sağ Ön Çamurluk', 'Sol Ön Çamurluk', 'Çamurluk',
    'Sağ Ön Kapı', 'Sol Ön Kapı', 'Sağ Arka Kapı', 'Sol Arka Kapı', 'Kapı', 'Bagaj Kapağı', 'Tavan',
    'Panel', 'Izgara', 'Marşpiyel', 'Ayna', 'Panjur', 'Kaporta Aksesuarı',
  ],
  'Aydınlatma': ['Ön Far', 'Far', 'Arka Stop', 'Stop', 'Sis Farı', 'Sinyal', 'Gündüz Farı', 'Ampul', 'Far Beyni', 'Plaka Lambası'],
  'Fren Sistemi': ['Ön Disk', 'Arka Disk', 'Fren Diski', 'Balata', 'Kaliper', 'Fren Merkezi', 'ABS Sensörü', 'ABS Parçası', 'Fren Hortumu', 'Fren Silindiri', 'El Freni', 'Fren Kumandası'],
  'Süspansiyon': ['Amortisör', 'Salıncak', 'Z Rotu', 'Rot', 'Rotil', 'Aks Bilyesi', 'Yay', 'Askı Buji', 'Porya', 'Süspansiyon Körüğü'],
  'Elektrik': ['Akü', 'Marş Motoru', 'Alternatör', 'Buji', 'Bobin', 'Sigorta', 'Sigorta Kutusu', 'Beyin (ECU)', 'ECU', 'Kablo Demeti', 'Sensör'],
  'İç Aksam': ['Konsol', 'Koltuk', 'Döşeme', 'Tavan Döşemesi', 'Gösterge Paneli', 'Torpido', 'Direksiyon', 'Vites Topuzu', 'Kapı Döşemesi'],
  'Egzoz': ['Katalitik Konvertör', 'Dizel Partikül Filtresi', 'Egzoz Susturucu', 'Egr Valfi', 'Egzoz Manifoldu'],
  'Klima': ['Klima Kompresörü', 'Kondenser', 'Evaporatör', 'Klima Hattı', 'Klima Fanı'],
  'Filtreler': ['Yağ Filtresi', 'Hava Filtresi', 'Yakıt Filtresi', 'Kabini Filtresi (Polen)'],
  'Yakıt Sistemi': ['Yakıt Pompası', 'Enjektör', 'Karbüratör', 'Benzin Deposu', 'Hava Akışmetre', 'Turbolar'],
  'Direksiyon': ['Direksiyon Kutusu', 'Direksiyon Mili', 'Hidrolik Direksiyon Pompası', 'Z Rotu', 'Direksiyon Tekerleği'],
  'Jant & Lastik': ['Jant', 'Lastik', 'Bijon', 'Porya', 'Kapa', 'Jant Göbeği'],
  'Cam & Ayna': ['Ön Cam', 'Arka Cam', 'Yan Cam', 'Ayna', 'Cam Motoru', 'Cam Kaldırma'],
  'Soğutma Sistemi': ['Radyatör', 'Su Pompası', 'Termostat', 'Fan', 'Soğutma Hattı'],
  'Aktarma': ['Şanzıman', 'Şaft', 'Aks', 'Diferansiyel', 'Kavrama'],
  'Diğer': ['Diğer'],
};

export const PART_CATEGORY_LIST = Object.keys(PART_CATEGORIES);

export function subcategoriesFor(category) {
  return PART_CATEGORIES[category] || [];
}
