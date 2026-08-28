# Parça Avcısı — Türkiye Araç Kataloğu Genişletme Görevi

## Amaç
Parça Avcısı'nın parça eşleştirme ve katalog öğrenme sistemini önce Türkiye'de kullanılan araç parkına göre genişletmek.

## Kaynak gerçekliği
TÜİK motorlu kara taşıtlarını otomobil, minibüs, otobüs, motosiklet, kamyonet, kamyon, özel amaçlı taşıt ve traktör gibi sınıflarla tanımlar. 2025 sonu itibarıyla Türkiye'de kayıtlı toplam motorlu kara taşıtı 33.612.650'dir; dağılımda otomobil %51,7, motosiklet %21,2, kamyonet %14,6, traktör %6,9, kamyon %3,1, minibüs %1,6, otobüs %0,6 ve özel amaçlı taşıt %0,3'tür.

## Uygulama
1. `data/turkey-vehicle-taxonomy.json` kanonik Türkiye araç kapsamıdır.
2. Öncelik Türkiye araç parkında yaygın markalar ve modellerdir.
3. Binek, hafif ticari ve ağır ticari ayrı kapsanır; motosiklet/traktör/özel amaçlı sınıflar da veri modelinde korunur.
4. Her araç mümkünse marka → model → nesil/kasa → yıl → versiyon/trim → motor → yakıt → şanzıman seviyesine kadar çözülür.
5. Parça kaydı mümkünse parça no + OEM + çapraz referans + araç uygulaması ilişkileriyle tek ürün havuzuna merge edilir.
6. Aynı parça farklı araçlarda kullanılıyorsa yeni ürün oluşturulmaz; araç uygulaması olarak bağlanır.
7. Türkiye'de kullanılmayan global araçlar öncelikli katalog verisi olarak eklenmez.
8. Veri kaynağında bulunmayan model/motor/trim tahmin edilmez.
9. Mevcut ürünler silinmez.
10. Her import sonunda kaynak bazında taranan kayıt, geçerli kayıt, duplicate, mevcut ürünle eşleşen ve yeni ürün sayılarını raporla.

## Öncelik
Tier 1: Renault, Fiat, Volkswagen, Opel, Hyundai, Ford, Toyota, Peugeot, Honda, Dacia.
Tier 2: Citroen, Mercedes-Benz, BMW, Skoda, Nissan, Kia, Audi, Seat, Mitsubishi, Suzuki, Chevrolet, Volvo.
Tier 3: BYD, Togg, Tesla, Chery, MG, Cupra, Jaecoo, Omoda, Leapmotor, Seres, Skywell, Maxus, KGM ve diğer doğrulanmış Türkiye pazarı markaları.

## Ticari / ağır vasıta
Ford, Fiat, Renault, Volkswagen, Mercedes-Benz, Peugeot, Citroen, Toyota, Opel, Iveco, Isuzu, Karsan, Otokar, Temsa, Anadolu Isuzu, MAN, Scania, Volvo Trucks, DAF, Renault Trucks, Mercedes-Benz Trucks, BMC, Ford Trucks.

## Traktör
New Holland, Case IH, John Deere, Massey Ferguson, Deutz-Fahr, Fendt, Tümosan, Başak, Erkunt, Same, Landini, Valtra, Kubota.

## Motosiklet / ATV
Honda, Yamaha, Kawasaki, Suzuki, KTM, Bajaj, TVS, Mondial, RKS, Arora, Kuba, CFMOTO, SYM, Kymco, Vespa, Piaggio, Benelli, Aprilia, BMW Motorrad.

## Kabul kriteri
Bu görev tamamlanmış sayılmaz; yalnızca adapter dosyalarının build olması yeterli değildir. Gerçek kaynak verisi okunmalı, Türkiye araç filtresi uygulanmalı, kayıtlar normalize edilmeli ve Supabase'e güvenli merge ile yazılmalıdır. Çalışma sonunda gerçek sayılar raporlanmalıdır.
