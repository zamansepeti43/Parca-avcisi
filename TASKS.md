# Parça Avcısı — MVP Yol Haritası

## DURUM — 14 Ağustos 2026
- [x] Ana sayfa, marka dili ve responsive temel
- [x] Arama, kategori keşfi, demo ilanlar ve güvenli fallback
- [x] Supabase istemcisi, auth/favori/ilan servis temeli
- [x] GitHub Actions uzak doğrulaması: `npm install` ve `npm run build`
- [x] Hiyerarşik manuel araç seçici: tip → marka → model → kasa/nesil → yıl → motor
- [x] Araç katalog sağlayıcı/adaptör altyapısı; VIN çözümleme kasıtlı olarak kapalı
- [x] Üyelik gerektiren ilan verme ve ilan detay akışları
- [x] İlan önizleme ve taslak oluşturma akışı
- [x] Taslak sonrası ilan detayına yönlendirme; İlanlarım (kullanıcının kendi ilanları) ve durum rozeti
- [x] Fotoğraftan/toplu ilan taslağı için provider tabanlı altyapı
- [x] AI tahminleri için kullanıcı kontrolü ve düşük güven uyarısı
- [x] GitHub Actions uzak build doğrulaması (run #28, #37)
- [x] Ücretsiz Tesseract.js OCR ve tarayıcı barkod/QR algılama
- [x] OCR/katalog güven skoru ve güvenli fallback modu
- [x] Araç verisi kaynak/lisans dokümantasyonu ve Supabase katalog migrasyonu
- [x] Ayrı giriş/kayıt formları, e-posta doğrulama akışı, şifre sıfırlama, oturum durumu ve Hesabım
- [x] Hesap merkezi: profil, ilan yönetimi (yayınla/durdur/satıldı/düzenle/sil), favoriler, kayıtlı aramalar, bildirimler, hesap bilgileri, ayarlar, yardım ve çıkış
- [x] Satıcı ile mesajlaşma (konuşma listesi, mesajlaşma penceresi, okundu işaretleme)
- [x] Bildirim altyapısı: trigger'lar, header çanı + okunmamış rozet, kayıtlı arama eşleştirme
- [x] Migration `20260814_messages_notifications.sql`: notifications tablosu, profile settings, saved_searches.notify, RLS genişletmesi
- [x] Migration `20260815_listing_photos_storage.sql`: `listing-images` storage bucket + storage.objects RLS, `listing_images` RLS (public okuma, satıcı yönetimi) + `is_cover` kolonu
- [x] İlan fotoğrafları: Supabase Storage upload → `listing_images` kaydı → kapak görseli kartlarda → detay galerisi (thumbnail + bozuk görsel fallback)
- [x] Birleşik ilan listesi/arama (`src/lib/listing-view.js`): gerçek ilanlar tek grid, anlık yenileme (yayın/sil sonrası `parca:listings-updated`), başlık/parça/araç/OEM/kategori/açıklama araması, en yeni önce, duplicate yok, Sıfır/2. El/Çıkma filtreleri (0 KM → "Sıfır")
- [x] Araç kataloğu genişletme (`vehicle-catalog.js`): Tofaş/Ford/Renault/Fiat/VW/Opel/Peugeot/Citroën/Toyota + BMW/Audi/Mercedes/Honda/Hyundai/Kia/Škoda/Nissan/Suzuki; Marka → Model → Yıl → Versiyon sırası; eski model yılları (Şahin 1989–1999, Escort 1981–2000 vb.)
- [x] Migration `20260815_vehicle_catalog_expansion.sql`: `vehicle_types`/`vehicle_makes`/`vehicle_models` idempotent seed (on conflict do nothing, mevcut veri bozulmaz)
- [x] İlan oluşturma/düzenleme akışı (profesyonel pazaryeri): kategori + alt kategori menüsü (arama filtresi, `src/lib/part-categories.js`), araç bilgisinin ilana kaydedilip detayda gösterilmesi, İlan Ver'de "İlanı Yayınla" (aktif, F5'siz listeye düşer) + "Taslak Kaydet" seçenekleri, kapsamlı önizleme (fotoğraf/kapak/araç/kategori/fiyat/şehir/açıklama), Hesabım → İlanlarım → Düzenle'de fotoğraf yönetimi (mevcut thumbnail + kapak rozeti, sil/taşı/kapak yap, çoklu yeni ekleme, `is_cover`/`sort_order` Supabase senkronu)
- [x] Migration `20260815_listing_metadata.sql`: `listings` tablosuna `category`/`subcategory`/`vehicle` kolonları + `listings_category_idx` (canlı DB'ye uygulanmadı)
- [x] Gerçek ilan detay sayfası (`src/lib/listing-detail.js/.css`): modal kaldırıldı, "İncele" artık `#/ilan/<id>` hash rotasına gider; sayfa yenilenince Supabase'den doğrudan yüklenir; geri butonu; büyük kapak + thumbnail galerisi (tıkla/oku ile gezinme, fotoğraf yoksa placeholder); ilan bilgileri (başlık/fiyat/durum/marka/model/yıl/versiyon/kategori/alt kategori/parça adı/OEM/şehir/ilan tarihi/ilan no/açıklama/araç uyumluluğu); satıcı kartı (profil, bireysel/kurumsal, şehir, aktif ilan sayısı, üyelik tarihi, iletişim); satıcının diğer ilanları; favori + paylaş; masaüstünde solda galeri/sağda özet, mobilde tek kolon (siyah/altın premium tasarım)
- [x] `npm run lint` betiği eklendi (`scripts/lint.mjs`, bağımlılıksız sözdizimi kontrolü)
- [x] İlan detayı profesyonelleştirme: breadcrumb (← İlanlar > Kategori > Alt Kategori > Parça, tıklanabilir, mobilde yatay kaydırma); satıcı kartına telefon gösterimi + "Telefonla Ara" + WhatsApp (settings.whatsapp veya mobil numaradan türetme) + "Mesaj Gönder"; mobilde sabit iletişim çubuğu (Ara/WhatsApp/Mesaj); Türkçe duyarlı baş harf normalizasyonu (başlık, şehir, kategori, alt kategori, marka, model, satıcı adı — büyük harf akronimler korunur, DB değişmez); eksik veride alan gizleme/"Belirtilmemiş"; `getProfileById`'ye `settings` alanı eklendi
- [x] İlan detayı veri kaybı düzeltmesi: `listing_vehicles` tablosunda RLS okuma politikası yoktu → Marka/Model/Yıl/Versiyon embed'i her zaman `[]` dönüyordu; `20260816_listing_vehicles_rls.sql` (salt-okunur) + `schema.sql` eklendi. `part:parts(name, category, subcategory, oem_number)` embed'i genişletildi; `toListingCard`/`getListingById`'de part kaynaklı alt kategori/OEM/kategori fallback'leri eklendi; detayda 16 zorunlu alanın tamamı artık "Belirtilmemiş" fallback'iyle her zaman render ediliyor; "Araç uyumluluğu" kutusu yapısal araç verisinden türetilen etiketle her zaman gösteriliyor
- [x] Marka/brand varlıkları: `parca-avcisi-logo-seffaf.png` (1337x760) içindeki piston + dişli P amblemi kırpılarak (yeniden çizilmedi, oran korundu) `public/logo-emblem.png` (ham), `public/logo-emblem-badge.png` (altın yuvarlak köşeli rozet), `public/favicon.png` (64), `public/icons/icon-192.png`, `public/icons/icon-512.png` (+maskable), `public/icons/apple-touch-icon.png` (180) üretildi. `public/manifest.json` oluşturuldu; `index.html`'e favicon + apple-touch-icon + manifest bağlantıları eklendi; `app.js` header/footer brand'i imgeye taşındı; `styles.css` `.brand-mark` imge stili + mobil kompakt (26px) boyut. Orijinal logo dosyası korunuyor. Build 95 modül ✓, lint 21 dosya ✓

## 01 — Gerçek veri katmanı
- [ ] Supabase projesi oluşturulması ve migration uygulanması
- [x] `@supabase/supabase-js`, environment şablonu ve client
- [x] Aktif ilanlar için Supabase okuma, yapılandırmasız demo fallback
- [x] Auth, favori ve taslak ilan oluşturma servisleri
- [x] Storage / ilan fotoğraflarının yüklenmesi (`src/lib/listing-images.js`, migration hazır; canlı DB'ye uygulanmadı)
- [x] `listings.category`/`subcategory`/`vehicle` kolonları (`20260815_listing_metadata.sql` hazır; canlı DB'ye uygulanmadı — uygulanmadan ilan oluşturma/düzenleme insert'i hata verir)
- [ ] Açık araç kataloğunun Supabase'e sürümlü içe aktarımı

## 02 — Akıllı parça arama
- [x] Araç tipi / marka / model / yıl / versiyon akışı (kasa/nesil adımı kaldırıldı; Marka → Model → Yıl → Versiyon)
- [x] Parça veya OEM arama giriş noktası (başlık, parça adı, araç bilgisi, OEM, kategori, açıklama)
- [x] Sıfır / 2. El / Çıkma filtresi ve en yeni önce sıralama
- [ ] Kaynak kapsamındaki motor/versiyon verisini içe aktarma
- [ ] Gerçek araç uyumluluğu sorgusu (liste/migration temeli atıldı)
- [ ] VIN resolver (bilinçli olarak sonraki aşama)

## 03 — İlan detayları
- [x] Üyelik kontrollü detay modalı
- [x] Fiyat, şehir, araç uyumluluğu ve favori başlangıcı
- [ ] Supabase Storage fotoğraf galerisi (galeri tamamlandı; canlı DB'ye migration uygulanmadı)
- [x] Gerçek satıcı profili ve mesajlaşma

## 04 — Üyelik ve ilan verme
- [x] Giriş/kayıt modalı ve üyelik kapısı
- [x] Ayrı login/kayıt formları, e-posta doğrulama, şifre sıfırlama ve Hesabım
- [x] İlan formu, önizleme ve taslak kayıt
- [ ] Kullanıcı profili, kayıtlı araçlar ve ilan yönetimi (profil ve ilan yönetimi hazır; kayıtlı araçlar sonraki adım)

## 05 — Sonraki MVP adımları
- [x] Mesajlaşma ve bildirimler (temel; moderasyon/güven sonraki aşama)
- [ ] Moderasyon, kullanıcı güveni ve satıcı puanlaması
- [ ] Production güvenlik/performance/SEO/PWA
- [ ] Vercel ve Android yayını
