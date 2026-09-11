# Parça Avcısı 🚗🔧

Parça Avcısı, Türkiye odaklı bir oto parça pazaryeri ve parça-talep platformudur. Kullanıcıların araçlarına uygun sıfır, 2. el ve çıkma parçaları bulmasına, ilanları karşılaştırmasına, parça ilanı vermesine ve bulunamayan parçalar için talep oluşturmasına yardımcı olur.

## 🌐 Canlı Demo

**https://parca-avcisi.vercel.app/**

## Öne Çıkan Özellikler

- 🔎 Parça arama, kategori ve araç uyumluluğuna göre filtreleme
- 🚘 Marka → model → yıl → versiyon/araç seçimi
- 🧩 Geniş araç/parça kataloğu ve doğrudan uyumluluk eşleştirme altyapısı
- 🛒 Sıfır / 2. El / Çıkma ilanları
- 📷 İlan fotoğrafları, kapak görseli ve galeri
- ✨ Fotoğraftan ilan taslağı oluşturma için OCR/AI destekli akışlar
- 📋 Parça arıyorum talepleri ve satıcıların “Bende Var” yanıtı
- 💬 İlan ve talep bazlı mesajlaşma
- ❤️ Favoriler ve kayıtlı aramalar
- 🔔 Bildirimler
- 🚗 Kullanıcının kayıtlı araçları
- 👤 Profil ve hesap merkezi
- 📱 Responsive mobil arayüz
- 🔐 E-posta ve telefon doğrulama; ilan yayınlama için doğrulama kapısı
- 🛡️ Supabase RLS, Storage politikaları ve mesajlaşma rate-limit altyapısı
- 🔍 SEO, sitemap, araç sitemap'i ve yapılandırılmış veri desteği

## Teknoloji

- React + Vite
- Supabase (Auth, PostgreSQL, Storage, Realtime)
- JavaScript / CSS
- Tesseract.js
- Vercel
- GitHub Actions

## Yerel Kurulum

```bash
npm install
cp .env.example .env
npm run dev
```

Üretim build'i:

```bash
npm run lint
npm run seo:sitemap
npm run seo:vehicle-sitemap
npm run build
```

## Ortam Değişkenleri

`.env.example` dosyasını temel alın. Tarayıcıya gönderilen `VITE_*` değişkenleri yalnızca public istemci yapılandırması içindir. `SUPABASE_SERVICE_ROLE_KEY` ve `GEMINI_API_KEY` gibi server-side anahtarlar kesinlikle public istemciye eklenmemelidir.

## Veritabanı

Supabase şema ve migration dosyaları `supabase/` altında tutulur. Üretim doğrulaması için `supabase/production-verification.sql` ve güncel migration geçmişi kullanılabilir.

## Doğrulama

Ana branch için GitHub Actions; bağımlılık kurulumu, SEO sitemap üretimi/doğrulaması ve production build adımlarını çalıştırır. Vercel production deployment'ı da GitHub `main` branch'i ile bağlıdır.

## Durum

Proje aktif MVP/production geliştirme aşamasındadır. VIN çözümleme özelliği bilinçli olarak kapalıdır; katalogda güvenilir karşılığı olmayan motor/versiyon bilgileri uydurulmaz.

## Lisans

Bu repository için ayrıca bir açık kaynak lisansı tanımlanmamıştır. Kodun yeniden dağıtımı veya ticari kullanımı için repository sahibinden izin alınmalıdır.
