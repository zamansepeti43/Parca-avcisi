// Parça Avcısı MVP — Araç tipine göre parça kategorisi ağacı.
// Alt kategoriler bütün araç tiplerinde körlemesine gösterilmez; araç tipi
// seçildiğinde ilgili ağaç kullanılır. Mevcut katalog (vehicle-catalog.js)
// ve temel kategoriler (part-categories.js) korunur.

import { PART_CATEGORIES, PART_CATEGORY_LIST } from './part-categories.js';

// Binek/otomobil temel ağacı (Bagaj Kapağı dahil).
const PASSENGER_TREE = PART_CATEGORIES;

const TRUCK_TREE = {
  'Kaporta': ['Kabin', 'Kabin Kapağı', 'Damper', 'Kasa', 'Kasa Kapağı', 'Şasi', 'Tampon', 'Çamurluk', 'Kapı', 'Ayna', 'Cam', 'Izgara'],
  'Motor': ['Motor Komple', 'Motor Bloğu', 'Silindir Kapağı', 'Krank', 'Piston', 'Eksantrik', 'Turbo', 'Enjektör', 'Alternatör', 'Marş Motoru', 'Su Pompası', 'Radyatör', 'Termostat'],
  'Şanzıman': ['Komple Şanzıman', 'Debriyaj Seti', 'Şanzıman Dişlisi', 'Tork Konvertör'],
  'Aktarma': ['Şaft', 'Diferansiyel', 'Aks', 'Kavrama'],
  'Şasi & Süspansiyon': ['Amortisör', 'Yay', 'Z Rotu', 'Rotil', 'Askı Buji', 'Şasi'],
  'Fren Sistemi': ['Ön Disk', 'Arka Disk', 'Balata', 'Kaliper', 'Fren Merkezi', 'Havalı Fren', 'Kompresör', 'ABS Parçası'],
  'Elektrik': ['Akü', 'Alternatör', 'Marş Motoru', 'Sensör', 'Kablo Demeti', 'Sigorta Kutusu'],
  'Aydınlatma': ['Far', 'Stop', 'Sinyal', 'Ampul', 'Çalışma Lambası'],
  'Lastik & Jant': ['Jant', 'Lastik', 'Bijon', 'Jant Göbeği'],
  'İç Aksam': ['Koltuk', 'Direksiyon', 'Gösterge Paneli', 'Konsol', 'Döşeme'],
  'Klima': ['Klima Kompresörü', 'Kondenser', 'Klima Hattı'],
  'Filtreler': ['Yağ Filtresi', 'Hava Filtresi', 'Yakıt Filtresi'],
  'Egzoz': ['Egzoz Susturucu', 'Katalitik Konvertör'],
  'Diğer': ['Diğer'],
};

const BUS_TREE = {
  'Kaporta': ['Kabin', 'Kaput', 'Ön Panel', 'Yan Panel', 'Tavan', 'Cam', 'Kapı', 'Tampon', 'Ayna'],
  'Motor': ['Motor Komple', 'Motor Bloğu', 'Silindir Kapağı', 'Krank', 'Piston', 'Turbo', 'Enjektör', 'Alternatör', 'Marş Motoru', 'Su Pompası', 'Radyatör', 'Termostat'],
  'Şanzıman': ['Komple Şanzıman', 'Otomatik Şanzıman', 'Debriyaj Seti', 'Şanzıman Dişlisi'],
  'Aktarma': ['Şaft', 'Diferansiyel', 'Aks', 'Kavrama'],
  'Şasi': ['Şasi', 'Çatı', 'Karkas'],
  'Koltuk & İç': ['Koltuk', 'Konsol', 'Direksiyon', 'Gösterge Paneli', 'Döşeme'],
  'Süspansiyon': ['Amortisör', 'Yay', 'Havalı Süspansiyon', 'Rotil'],
  'Fren Sistemi': ['Balata', 'Fren Diski', 'Kaliper', 'Havalı Fren', 'Kompresör', 'ABS Parçası', 'Fren Merkezi'],
  'Elektrik': ['Akü', 'Alternatör', 'Marş Motoru', 'Sensör', 'Kablo Demeti', 'Sigorta Kutusu'],
  'Aydınlatma': ['Far', 'Stop', 'Sinyal', 'Ampul'],
  'Lastik & Jant': ['Jant', 'Lastik', 'Bijon', 'Jant Göbeği'],
  'Klima': ['Klima Kompresörü', 'Kondenser', 'Evaporatör', 'Klima Hattı'],
  'Diğer': ['Diğer'],
};

const MOTORCYCLE_TREE = {
  'Motor': ['Komple Motor', 'Silindir', 'Piston', 'Krank', 'Karbüratör', 'Enjektör', 'Marş Motoru', 'Alternatör', 'Buji'],
  'Şasi': ['Şasi', 'Gidon', 'Sele', 'Ayak', 'Kokpit'],
  'Depo': ['Yakıt Deposu', 'Depo Kapağı', 'Depo Kiliti'],
  'Grenaj & Kaporta': ['Grenaj', 'Ön Çamurluk', 'Arka Çamurluk', 'Yan Kapak'],
  'Fren': ['Fren Diski', 'Balata', 'Kaliper', 'Fren Merkezi'],
  'Süspansiyon': ['Ön Amortisör', 'Arka Amortisör', 'Fork'],
  'Elektrik': ['Far', 'Stop', 'Sinyal', 'Akü', 'Bobin', 'Ateşleme'],
  'Jant & Lastik': ['Jant', 'Lastik', 'Dingil'],
  'Egzoz': ['Egzoz', 'Susturucu'],
  'Diğer': ['Diğer'],
};

const PICKUP_TREE = {
  'Kaporta': ['Kaput', 'Ön Tampon', 'Arka Tampon', 'Çamurluk', 'Sağ Ön Kapı', 'Sol Ön Kapı', 'Kapı', 'Tavan', 'Panel', 'Izgara', 'Marşpiyel', 'Kasa', 'Kasa Kapağı', 'Damperlik', 'Kaporta Aksesuarı'],
  'Motor': PASSENGER_TREE['Motor'],
  'Şanzıman': PASSENGER_TREE['Şanzıman'],
  'Aydınlatma': PASSENGER_TREE['Aydınlatma'],
  'Fren Sistemi': PASSENGER_TREE['Fren Sistemi'],
  'Süspansiyon': PASSENGER_TREE['Süspansiyon'],
  'Elektrik': PASSENGER_TREE['Elektrik'],
  'İç Aksam': PASSENGER_TREE['İç Aksam'],
  'Egzoz': PASSENGER_TREE['Egzoz'],
  'Klima': PASSENGER_TREE['Klima'],
  'Filtreler': PASSENGER_TREE['Filtreler'],
  'Yakıt Sistemi': PASSENGER_TREE['Yakıt Sistemi'],
  'Direksiyon': PASSENGER_TREE['Direksiyon'],
  'Jant & Lastik': PASSENGER_TREE['Jant & Lastik'],
  'Cam & Ayna': PASSENGER_TREE['Cam & Ayna'],
  'Soğutma Sistemi': PASSENGER_TREE['Soğutma Sistemi'],
  'Aktarma': PASSENGER_TREE['Aktarma'],
  'Diğer': ['Diğer'],
};

// vehicleTypes listesindeki araç tiplerine karşılık ağaç eşlemesi.
// Binek türevi (Otomobil, SUV, Panelvan, Minibüs, Ticari, Diğer) temel ağacı kullanır.
export const VEHICLE_TREES = {
  'Kamyon': TRUCK_TREE,
  'Otobüs': BUS_TREE,
  'Motosiklet': MOTORCYCLE_TREE,
  'Pickup / Kamyonet': PICKUP_TREE,
};

function treeFor(vehicleType) {
  return VEHICLE_TREES[vehicleType] || PASSENGER_TREE;
}

// Bir araç tipi için uygun ana kategoriler (seçilmemişse genel binek listesi).
export function getMainCategories(vehicleType) {
  return Object.keys(treeFor(vehicleType));
}

// Araç tipine uygun ana kategorinin alt kategorileri.
export function getSubcategories(vehicleType, mainCategory) {
  return treeFor(vehicleType)[mainCategory] || [];
}

// Tüm araç tiplerindeki alt kategorilerin birleşimi (tip seçmeden arama için).
export function generalSubcategories(mainCategory) {
  return [...new Set(
    [PASSENGER_TREE[mainCategory] || [], ...Object.values(VEHICLE_TREES).map((tree) => tree[mainCategory] || [])].flat(),
  )];
}

export { PART_CATEGORIES, PART_CATEGORY_LIST };
