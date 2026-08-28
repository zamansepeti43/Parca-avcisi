# NEXT TASK — Türkiye araç parkı odaklı katalog genişletme

Amaç: İlk beş kaynak tamamlandıktan sonra yalnızca Türkiye'de kullanılan araçların parça kapsamını büyütmek. Global katalog seli yapılmayacak; açıkça Türkiye araç/aftermarket kapsamı olan kaynaklar önceliklendirilecek.

## Sıra
1. KAUTEK — https://www.kautek.com.tr/tr/catalog — 14,932 listelenen ürün; OEM/çapraz referans ve marka-model hiyerarşisi.
2. Hanparça — https://www.hanparca.com/ — 84,131 yedek parça; 180,130 OEM; 62 araç markası; VIN/araç uyumluluğu.
3. Phira — https://phira.com.tr/online-katalog/ — 28 marka; OEM + marka/model araması.
4. Teknorot — https://www.teknorot.com/katalog/ — OEM, Teknorot ref, çapraz referans, marka/model/yıl/şasi; ayrıca açık PDF kataloglar.
5. Oto Karaman — https://otokaraman.com/tr — 40+ ağır vasıta markası; OEM ve çapraz referans.
6. Aypar Otomotiv — Türkiye aftermarket dağıtım kapsamı; yalnızca açık ve yetkili katalog/export endpoint bulunduğunda ingest et.
7. Disa Automotive — OEM/çapraz referans katalog endpoint'i doğrulanınca ingest et.
8. Valeo Service Türkiye — https://www.valeoservice.com.tr/tr — ürün/şasi/parça/araç arama kaynaklarını doğrula ve yetkili erişim koşullarına uy.

## Teknorot açık PDF adayları
- https://apps.teknorot.com/pdf/ev-tr-no-space.pdf?ver=1.0.0-20260307
- https://www.teknorot.com/wp-content/uploads/2020/02/2019_teknorot_catalog_part1.pdf

## Veri kuralları
- Türkiye araç parkı filtresi öncelikli.
- Binek + hafif ticari + ağır ticari kapsamı korunacak.
- OEM, üretici parça kodu ve çapraz referansların tamamı korunacak.
- Açık araç uyumluluğu varsa marka/model/yıl/şasi/motor bilgisi korunacak.
- Aynı parça farklı kataloglarda varsa tek ürün altında kaynaklar birleştirilecek.
- Mevcut ürünler kesinlikle silinmeyecek.
- Eksik araç uyumluluğu tahmin edilmeyecek.
- Tek bir bozuk kaynak veya PDF bütün dalgayı durdurmayacak.
- Her kaynak checkpoint'li ve idempotent çalışacak.
- Sonuçta discovered/new/matched/applications/skipped/errors sayıları raporlanacak.
- Hedef tablo: `public.ai_catalog_records`; canonical product pool merge mekanizması korunacak.

## Kategoriler
Motor, triger/zincir, conta, soğutma, yakıt, turbo, hava, filtre, fren, ABS, süspansiyon, amortisör, salıncak, rot/direksiyon, aks/porya/rulman, debriyaj/volan, şanzıman, diferansiyel, egzoz/DPF/EGR, elektrik/alternatör/marş, sensör, aydınlatma, klima, kaporta, cam/silecek, hidrolik/pnömatik, ticari araç ve ağır vasıta.

## Yetki ve erişim
Yalnızca herkese açık, yetkili veya kullanım şartları izin veren kaynaklar kullanılacak. Robots.txt, rate limit ve kullanım şartlarına uyulacak. Kaynak erişimi uygun değilse adapter oluşturulacak fakat otomatik toplu çekim yapılmayacak.
