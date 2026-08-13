# Araç verisi

## Kaynak ve lisans

Başlangıç kataloğu [VehiclesDB](https://github.com/vehiclesdb/vehiclesdb) açık kataloğunun ad/katman yaklaşımına göre hazırlanmıştır. VehiclesDB, açık resmî kayıtları birleştirir ve **CC-BY 4.0** ile yayımlanır; görünür atıf gerekir.

Atıf: “Vehicle data by VehiclesDB (CC-BY 4.0), built from official public registers.”

[Open Vehicle DB](https://github.com/plowman/open-vehicle-db) da değerlendirilmiştir: make/model/year/style verisi içerir fakat 70 marka, 1.678 model ve 1981–2027 döneminde özellikle ABD pazarına odaklanır. Bu nedenle Türkiye için kapsamlı nesil/motor kataloğu olarak tek başına kullanılmamıştır.

## Kapsam sınırı

Uygulamadaki küçük başlangıç kümesi yalnızca seçici deneyimini test etmek içindir; motor/versiyon alanı kaynakta güvenilir bir karşılık yoksa boş bırakılır. Sahte motor, nesil veya uyumluluk üretilmez. Üretimde katalog Supabase normalleştirilmiş tablolarına kaynak sürümü ve atıfla içe aktarılmalıdır.

## Mimari

`CatalogProvider` manuel seçim verisini sağlar; `VehicleResolver` arayüzün tek girişidir. `VinResolver` yalnızca gelecekteki adaptör noktasıdır ve etkin VIN çözümlemesi/API çağrısı yapmaz.
