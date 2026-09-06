# Girişimci araçları

“Girişimim → Profil” ekranında iki kart bulunur. Yeni harici servis veya API anahtarı gerekmez; uygulamanın mevcut SQL Server bağlantısı (`ConnectionStrings:Default` / `ConnectionStrings__Default`) kullanılır.

## Nakit ömrü

Kasadaki para, aylık gelir ve aylık gider TL olarak girilir. Nakit ömrü = kasadaki para / (aylık gider − aylık gelir). Gelir gideri karşılıyorsa sonlu bir süre yerine “Nakit azalmıyor” gösterilir. %0–50 gider azaltma senaryosu kayıtlı tutarları değiştirmez. Kayıtlar girişim başına tek satırda tutulur; tutarlar negatif olamaz, en fazla iki ondalık basamak içerebilir.

## Haftalık üç hedef

Haftalar Türkiye saatiyle pazartesi başlar. Üç hedef alanının bir kısmı boş bırakılabilir; boş hedef tamamlandı olarak işaretlenemez. Başlıklar en fazla 200 karakterdir. Kaydet düğmesi metinleri ve tamamlanma durumlarını birlikte saklar. Önceki/sonraki hafta düğmeleriyle geçmiş kayıtlar açılır ve düzenlenebilir; gelecek haftaya kayıt yapılamaz. Kaydedilmemiş değişiklikler varken hafta değiştirme kapalıdır; kullanıcı kaydedebilir veya vazgeçebilir.

## Veritabanı ve erişim

- `NakitPlanlari`: `GirisimId` birincil anahtarı, üç `decimal(14,2)` tutar, güncellenme tarihi ve sürüm.
- `HaftalikHedefler`: (`GirisimId`, `HaftaBaslangici`) birleşik anahtarı, üç başlık ve tamamlanma durumu, güncellenme tarihi ve sürüm.
- Her iki tablo `Girisimler` tablosuna yabancı anahtarla bağlıdır. Girişim silinirse araç kayıtları da silinir.
- API yalnızca `StartupKullanicisi` rolüne açıktır. Girişim kimliği oturumdan alınır; istemcinin gönderdiği kimlik kullanılmaz.
- Başka sekmede değiştirilmiş kaydın üzerine yazma `409 Conflict` döndürür. Kullanıcı son kaydı yükleyip tekrar düzenleyebilir.
- Yeni kayıtlar mevcut kişisel veri dışa aktarma çıktısına dahildir.

## Kurulum / güncelleme

`AddGirisimAraclari` EF Core migration'ı iki yeni tabloyu ekler. Mevcut başlangıç akışı `DbInitializer.SeedAsync` içinde `Database.MigrateAsync()` çağırdığı için, doğru SQL Server bağlantısı ve şema değiştirme yetkisiyle API başlatıldığında migration otomatik uygulanır. Mevcut tabloların verileri değiştirilmez.

Üretim veritabanına bu geliştirme sırasında migration uygulanmamıştır. Uygulamanın mevcut demo seed davranışı bu değişikliğin dışında kalır.

## API

| Yöntem | Yol | İşlem |
|---|---|---|
| GET | `/api/girisimler/benim/araclar/nakit` | Son nakit planı |
| PUT | `/api/girisimler/benim/araclar/nakit` | Nakit planını kaydet |
| GET | `/api/girisimler/benim/araclar/hedefler?hafta=YYYY-MM-DD` | Seçilen pazartesinin hedefleri; tarih yoksa bu hafta |
| PUT | `/api/girisimler/benim/araclar/hedefler/YYYY-MM-DD` | Haftanın üç hedefini kaydet |

PUT isteklerinde ilk kayıt için `version: null`, sonraki kayıtlarda GET/PUT yanıtındaki `version` gönderilir.

## Doğrulama

```sh
dotnet test T3VentureOS.slnx
cd client
npm test
npm run build
```

Testler hesaplama uç durumlarını, hafta sınırlarını, API doğrulamasını, istekler arası kalıcılığı, yetkisiz erişimi, eski sürümle güncellemeyi ve kartların kaydetme/hata davranışlarını kapsar.

### Doğrulama sonucu (6 Eylül 2026)

- Backend: 157 test başarılı.
- Frontend: 50 test başarılı; TypeScript ve Vite üretim derlemesi başarılı.
- Yeni frontend dosyaları için lint başarılı.
- EF Core: bekleyen model farkı yok; migration yalnızca iki yeni tablo oluşturuyor.
- Ayrı, yerel SQL Server 2022 test veritabanında migration zinciri uygulandı; iki aracın PUT/GET kayıtları ve tarayıcı yenilemesinden sonra değerlerin geri gelmesi doğrulandı.
- Kullanıcının mevcut veya üretim veritabanına bağlantı kurulmadı.
