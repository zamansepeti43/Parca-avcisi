# Parça Avcısı — MVP Yol Haritası

## DURUM — 14 Ağustos 2026
- [x] Ana sayfa ve marka dili
- [x] Responsive mobil/masaüstü arayüz
- [x] Arama ve hızlı arama etkileşimleri
- [x] Kategori keşfi
- [x] 0 KM / 2. El / Çıkma filtreleri
- [x] Araç seçme başlangıç akışı
- [x] Demo ilan kartları ve favori etkileşimi
- [x] AGENTS.md ile coding-agent çalışma kuralları
- [x] Supabase/Postgres MVP şeması (`supabase/schema.sql`)
- [x] Supabase client foundation (`src/lib/supabase.js`)
- [x] Supabase şemasında rerunnable RLS policy + auth profile trigger

## 01 — Gerçek veri katmanı
- [ ] Supabase projesi oluşturulması
- [x] `@supabase/supabase-js` dependency eklendi
- [x] Environment variable şablonu (`.env.example`)
- [x] Supabase JS client ve servis katmanı
- [x] Auth servis temeli
- [x] Aktif ilanların Supabase'den okunması (yapılandırma yoksa demo fallback)
- [x] İlan oluşturma servis temeli
- [x] Favorilerin kullanıcı verisine bağlanması
- [ ] Storage / ilan fotoğrafları

## 02 — Akıllı parça arama
- [ ] Marka / model / yıl / motor seçimi
- [ ] Parça kategorisi ve alt kategori
- [ ] OEM / parça numarası araması
- [ ] Filtreleme ve sıralama
- [ ] Araç uyumluluğu kontrolü

## 03 — İlan detayları
- [ ] Fotoğraf galerisi
- [ ] Parça durumu ve açıklama
- [ ] Uyumluluk bilgisi
- [ ] Fiyat ve konum
- [ ] Satıcı profili
- [ ] Favori ve paylaşım

## 04 — Üyelik ve kullanıcı profili
- [ ] Kayıt / giriş / çıkış ekranları
- [ ] Alıcı ve satıcı profili
- [ ] Kayıtlı araçlar
- [x] Favori servis altyapısı
- [ ] Kullanıcının ilanları

## 05 — İlan verme
- [ ] Fotoğraf yükleme
- [ ] Sıfır / 2. el / çıkma seçimi
- [ ] Araç ve parça bilgileri
- [ ] OEM numarası
- [ ] Fiyat / konum
- [x] Taslak ilan oluşturma servisi
- [ ] Önizleme ve yayınlama

## 06 — Alıcı-satıcı iletişimi
- [ ] İlan üzerinden mesajlaşma
- [ ] Bildirimler
- [ ] Satıcıya ulaşma
- [ ] Spam / rate-limit kontrolleri

## 07 — Güven ve moderasyon
- [ ] İlan doğrulama akışları
- [ ] Şikayet / bildirme
- [ ] Kullanıcı ve ilan moderasyonu
- [ ] Sahte ilan önleme altyapısı

## 08 — İlk gelir özellikleri
- [ ] Öne çıkarılmış ilan altyapısı
- [ ] Satıcı mağazası temeli
- [ ] Arama kaydetme
- [ ] Fiyat değişikliği bildirimi

## 09 — Yayına hazırlık
- [ ] Production güvenlik kontrolü
- [ ] Performans optimizasyonu
- [ ] SEO metadata
- [ ] PWA / mobil deneyim
- [ ] Analitik
- [ ] Vercel deployment
- [ ] Android build / AAB
- [ ] Google Play kapalı test
