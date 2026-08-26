# Parça Avcısı — Ollama Vision Testi

## Hedef model

İlk yerel aday: `qwen3-vl:8b`.

Nedeni: Ollama kütüphanesinde görsel giriş destekliyor, yaklaşık 6.1 GB Q4_K_M boyutunda ve OCR/görsel anlama tarafında güçlü bir genel amaçlı VLM. Daha düşük donanımda `qwen3-vl:4b` veya `gemma4:e4b`, daha güçlü sunucuda `qwen3-vl:30b` / `gemma4:26b` değerlendirilebilir.

## Test kurulumu

Windows PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-ollama-vision.ps1
```

Ardından:

```powershell
node scripts/ollama-vision-test.mjs C:\test\alternator.jpg
```

Birden fazla fotoğraf için:

```powershell
node scripts/ollama-vision-test.mjs C:\test\part-1.jpg C:\test\part-2.jpg C:\test\label.jpg
```

## Değerlendirme seti

En az 20 gerçek otomobil parçası fotoğrafı kullanılmalı. Her parça için mümkünse:

1. genel görünüm,
2. parça üzerindeki etiket/OEM,
3. marka işareti,
4. bağlantı noktaları veya ayırt edici detay

olmalı.

Her örnek şu alanlarda elle doğrulanır:

- Parça tanıma
- Ana kategori
- Alt kategori
- Marka
- OEM/parça numarası
- Araç marka/model
- Model yılı veya aralık
- Türkçe ilan açıklaması

## Kabul eşiği

İlk MVP için hedef:

- Parça tanıma: ≥ %85
- Kategori: ≥ %90
- Alt kategori: ≥ %80
- Görselde açıkça bulunan OEM: ≥ %90
- Görselde açıkça bulunan marka: ≥ %90
- Araç uyumluluğu: yalnızca güçlü görsel kanıt varsa; uydurma oranı <%5
- İlan açıklaması: ≥ %90 kullanılabilirlik

OEM ve araç uyumluluğunda yanlış pozitif, eksik sonuçtan daha kötü kabul edilir. Model emin değilse boş bırakmalı ve kullanıcı doğrulamasına dönmelidir.

## Sonraki aşama

Yerel model başarılı olursa uygulama mimarisi:

`Fotoğraf → OCR/barkod → katalog eşleşmesi → yerel VLM → güven skoru → kullanıcı onayı → ilan`

AI API'si sadece gerektiğinde fallback olarak kullanılmalı. Böylece uzun vadede her ilan için üçüncü taraf Vision API ücreti ödemek zorunda kalmayız.
