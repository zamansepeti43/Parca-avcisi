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
- [x] Fotoğraftan/toplu ilan taslağı için provider tabanlı altyapı
- [x] AI tahminleri için kullanıcı kontrolü ve düşük güven uyarısı
- [x] GitHub Actions uzak build doğrulaması (run #28, #37)
- [x] Ücretsiz Tesseract.js OCR ve tarayıcı barkod/QR algılama
- [x] OCR/katalog güven skoru ve güvenli fallback modu
- [x] Araç verisi kaynak/lisans dokümantasyonu ve Supabase katalog migrasyonu

## 01 — Gerçek veri katmanı
- [ ] Supabase projesi oluşturulması ve migration uygulanması
- [x] `@supabase/supabase-js`, environment şablonu ve client
- [x] Aktif ilanlar için Supabase okuma, yapılandırmasız demo fallback
- [x] Auth, favori ve taslak ilan oluşturma servisleri
- [ ] Storage / ilan fotoğraflarının yüklenmesi
- [ ] Açık araç kataloğunun Supabase'e sürümlü içe aktarımı

## 02 — Akıllı parça arama
- [x] Araç tipi / marka / model / kasa / yıl akışı
- [x] Parça veya OEM arama giriş noktası
- [ ] Kaynak kapsamındaki motor/versiyon verisini içe aktarma
- [ ] Filtreleme, sıralama ve gerçek araç uyumluluğu sorgusu
- [ ] VIN resolver (bilinçli olarak sonraki aşama)

## 03 — İlan detayları
- [x] Üyelik kontrollü detay modalı
- [x] Fiyat, şehir, araç uyumluluğu ve favori başlangıcı
- [ ] Supabase Storage fotoğraf galerisi
- [ ] Gerçek satıcı profili ve mesajlaşma

## 04 — Üyelik ve ilan verme
- [x] Giriş/kayıt modalı ve üyelik kapısı
- [x] İlan formu, önizleme ve taslak kayıt
- [ ] Kullanıcı profili, kayıtlı araçlar ve ilan yönetimi

## 05 — Sonraki MVP adımları
- [ ] Mesajlaşma, bildirim, moderasyon ve güven
- [ ] Production güvenlik/performance/SEO/PWA
- [ ] Vercel ve Android yayını
