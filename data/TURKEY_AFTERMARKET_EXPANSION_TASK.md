# Parça Avcısı — Türkiye Aftermarket Katalog Genişletme

## Amaç
Mevcut 5 kaynaklı katalog iş akışının üzerine, Türkiye araç parkında kullanılan binek, hafif ticari, ağır ticari, otobüs/minibüs, motosiklet ve traktör parçalarını doğrulanabilir kaynaklarla genişletmek.

## Yeni kaynak havuzu
1. Özçete Otomotiv katalog merkezi — Bosch, TRW, Delphi, Febi, Frow, Bitapart.
2. Valeo Service Türkiye — ürün kataloğu, şasi numarası, parça numarası, araç marka/modeli ve teknik kütüphane.
3. VADEN Original — ağır vasıta katalogları; fren, kompresör, debriyaj, motor, soğutma, süspansiyon, şanzıman ve yakıt.
4. Parcadolu — çok markalı binek/ticari katalog ve araç markası kapsamı.
5. otoparcaAVM — geniş marka/ürün indeksi; marka ve ürün sayıları kaynakta ayrıca doğrulanmalı.
6. HK Birlik / Parçam Tedarik — OE arama, araç seçimi ve çok markalı stok.
7. Bisgen Parça — OE/muadil kod ve açık araç uyumluluk tabloları.
8. INTRA PARTS — araç sistemlerine göre parça kategorileri ve çok markalı katalog.
9. Seri Yedek Parça — OEM arama, şasi sorgulama, araç seçimi ve çok markalı katalog.

## Üretici önceliği
BOSCH, VALEO, DELPHI, FEBI BILSTEIN, TRW, MAHLE, DENSO, HELLA, SKF, SACHS, LUK, INA, FAG, GATES, DAYCO, NGK, CONTITECH, MANN-FILTER, FILTRON, LEMFORDER, BREMBO, ATE, TEXTAR, FERODO, JURID, KYB, MONROE, MEYLE, CORTECO, ELRING, VICTOR REINZ, NISSENS, PIERBURG, AISIN, EXEDY, SNR, HENGST, UFI, BLUE PRINT.

## Türkiye filtresi
Kaynakta bulunan araç uygulaması önce `data/turkey-vehicle-taxonomy.json` ile eşleştirilir. Türkiye araç parkında kullanılan marka/model/nesil/yıl/motor doğrulanamıyorsa kayıt araç uygulaması olarak tahmin edilmez.

## Parça kategorileri
Motor, yakıt, filtre, triger/zincir, soğutma, fren, ABS, süspansiyon, direksiyon, aks/rulman/porya, debriyaj/volan, şanzıman, diferansiyel, egzoz/DPF/EGR, turbo, elektrik, marş/alternatör, sensör, aydınlatma, kaporta, cam/ayna/silecek, klima, kabin, hidrolik, pnömatik, hava fren, dorse/beşinci teker, ticari araç, traktör ve motosiklet.

## Kesin kurallar
- Mevcut ürünler silinmez.
- Aynı parça tekrar ürün olarak oluşturulmaz; araç uygulaması/OEM/çapraz referans ilişkisi olarak merge edilir.
- Ürün numarası ve OEM numarası normalize edilir.
- Kaynakta olmayan motor, trim, kasa veya araç uygulaması tahmin edilmez.
- Ücretsiz/açık veya yetkili erişim koşullarına uygun olmayan veri kaynağı otomatik olarak kazınmaz; gerekirse yalnızca kaynak/indeks olarak kaydedilir.
- Her kaynak için taranan, geçerli, duplicate, mevcut ürünle eşleşen ve yeni ürün sayıları raporlanır.
- Sadece adapter build olması başarı kabul edilmez; gerçek kaynak verisinin okunması ve güvenli Supabase merge işlemi gerekir.

## Çalışma sırası
Türkiye araç filtresi → katalog keşfi → ürün/OE çıkarımı → normalize → cross-reference → araç uygulaması → duplicate merge → Supabase upsert → kaynak istatistikleri.
