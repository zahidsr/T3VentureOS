# Veritabanı Şeması — SQL Server (Entity Framework Core)

> Kaynak: `src/T3VentureOS.Domain/Entities/*.cs` + `T3VentureOS.Infrastructure/Data/AppDbContext.cs`.
> Migration'lar `T3VentureOS.Infrastructure/Data/Migrations` altında. Tek kiracılı sistem — `tenant_id`
> kolonu ve Row-Level Security **yoktur**. Tüm PK'ler `Guid` (`uniqueidentifier`), uygulama tarafında
> `Guid.NewGuid()` ile üretilir (DB tarafında `default gen_random_uuid()` değil).

## ER Özeti

```
User 1─┬─< Girisim (CreatedBy)
       └─(0..1)─ Girisim (StartupKullanicisi'nin bağlı olduğu girişim)

Girisim 1─┬─< ProgramKatilimi >─ 1 GirisimProgrami
          ├─< GelisimAdimi ─> User (CreatedBy)
          ├─< SatisKaydi ─> User (SubmittedBy / ReviewedBy)
          ├─< YatirimKaydi ─> User (SubmittedBy / ReviewedBy)
          ├─< Basari ─> User (SubmittedBy / ReviewedBy)
          ├─< Dokuman ─> User (SubmittedBy / ReviewedBy)
          ├─< GirisimGuncellemeTalebi ─> User (SubmittedBy / ReviewedBy)
          └─< Itiraz ─> User (SubmittedBy / ReviewedBy)

User 1─< VerificationToken
User 1─< Bildirim (KullaniciId) ──(0..1)─ Girisim (IlgiliGirisim)
User 1─< SilmeTalebi (UserId, ReviewedBy)
```

---

## Tablolar

### Users
| kolon | tip | not |
|---|---|---|
| Id | uniqueidentifier pk | |
| Email | nvarchar(256) | unique index |
| PasswordHash | nvarchar | nullable (davet edilip henüz parola belirlememiş kullanıcı) |
| FullName | nvarchar(200) | |
| Role | int (enum) | SuperAdmin, ProgramYoneticisi, StartupKullanicisi — index |
| Status | int (enum) | Invited, Active, Disabled |
| GirisimId | uniqueidentifier fk→Girisim, nullable | yalnızca Role=StartupKullanicisi iken set edilir; FK `SetNull` |
| LastLoginAt | datetime2 nullable | |
| EmailVerified | bit | |
| FailedLoginAttempts | int | |
| LockedUntil | datetime2 nullable | |
| CreatedAt, UpdatedAt | datetime2 | |

### Girisimler (Girisim)
| kolon | tip | not |
|---|---|---|
| Id | uniqueidentifier pk | |
| Ad | nvarchar(200) | zorunlu |
| Sektor, KisaTanim, Teknoloji, WebsiteUrl, LogoUrl | nvarchar nullable | |
| KurulusYili, EkipBuyuklugu | int nullable | |
| CreatedById | uniqueidentifier fk→Users | `Restrict` |
| CreatedAt, UpdatedAt | datetime2 | |

### Programlar (GirisimProgrami)
> Sınıf adı çakışmayı önlemek için `GirisimProgrami` — tablo `Programlar`.

| kolon | tip | not |
|---|---|---|
| Id | uniqueidentifier pk | |
| Name | nvarchar(200) | |
| Description | nvarchar nullable | |
| Durum | int (enum) | Taslak, Aktif, Tamamlandi, Arsivlendi |
| BaslangicTarihi, BitisTarihi | datetime2 nullable | |
| CreatedById | uniqueidentifier fk→Users | `Restrict` |
| CreatedAt, UpdatedAt | datetime2 | |

### ProgramKatilimlari (ProgramKatilimi)
| kolon | tip | not |
|---|---|---|
| Id | uniqueidentifier pk | |
| GirisimId | uniqueidentifier fk→Girisimler | `Cascade` |
| ProgramId | uniqueidentifier fk→Programlar | `Restrict` |
| Donem | nvarchar nullable | |
| Durum | int (enum) | Basvuru, KabulEdildi, DevamEdiyor, Mezun, Ayrildi |
| BaslangicTarihi | datetime2 | |
| BitisTarihi | datetime2 nullable | |
| Notlar | nvarchar nullable | |
| CreatedAt, UpdatedAt | datetime2 | |
| **unique index** | (GirisimId, ProgramId, Donem) | aynı girişim aynı dönemde aynı programa iki kez giremez |

### GelisimAdimlari (GelisimAdimi)
> Girişimin kronolojik zaman çizelgesindeki tek bir kilometre taşı.

| kolon | tip | not |
|---|---|---|
| Id | uniqueidentifier pk | |
| GirisimId | uniqueidentifier fk→Girisimler | `Cascade`, index |
| Tarih | datetime2 | |
| Baslik | nvarchar(...) | |
| Aciklama | nvarchar nullable | |
| CreatedById | uniqueidentifier fk→Users | `Restrict` |
| CreatedAt | datetime2 | |

### SatisKayitlari (SatisKaydi)
| kolon | tip | not |
|---|---|---|
| Id | uniqueidentifier pk | |
| GirisimId | uniqueidentifier fk→Girisimler | `Cascade` |
| Donem | nvarchar | örn. "2026-Q1" |
| Ciro | decimal(14,2) | |
| Ihracat | decimal(14,2) nullable | |
| OnayDurumu | int (enum) | Beklemede, Onaylandi, Reddedildi |
| SubmittedById | uniqueidentifier fk→Users | `Restrict` |
| ReviewedById | uniqueidentifier fk→Users nullable | `Restrict` |
| ReviewNotu | nvarchar nullable | reddedilirse zorunlu (uygulama katmanında) |
| CreatedAt, UpdatedAt | datetime2 | |

### YatirimKayitlari (YatirimKaydi)
| kolon | tip | not |
|---|---|---|
| Id | uniqueidentifier pk | |
| GirisimId | uniqueidentifier fk→Girisimler | `Cascade` |
| Tur | int (enum) | Hibe, OnTohum, Tohum, SeriA, SeriB, SeriSonrasi, Diger |
| Tutar | decimal(14,2) | |
| ParaBirimi | nvarchar(3) | varsayılan "TRY" |
| Tarih | datetime2 | |
| YatirimciAdi | nvarchar nullable | |
| OnayDurumu, SubmittedById, ReviewedById, ReviewNotu | — | SatisKaydi ile aynı desen |
| CreatedAt, UpdatedAt | datetime2 | |

### Basarilar (Basari)
| kolon | tip | not |
|---|---|---|
| Id | uniqueidentifier pk | |
| GirisimId | uniqueidentifier fk→Girisimler | `Cascade` |
| Tur | int (enum) | Hibe, Odul, Sertifika, Diger |
| Baslik | nvarchar | |
| Aciklama | nvarchar nullable | |
| Tarih | datetime2 | |
| OnayDurumu, SubmittedById, ReviewedById, ReviewNotu | — | ortak onay deseni |
| CreatedAt, UpdatedAt | datetime2 | |

### Dokumanlar (Dokuman)
| kolon | tip | not |
|---|---|---|
| Id | uniqueidentifier pk | |
| GirisimId | uniqueidentifier fk→Girisimler | `Cascade` |
| Baslik, DosyaAdi, DosyaUrl | nvarchar | `DosyaUrl` → `/uploads/...` göreli yol |
| DosyaBoyutu | bigint | byte cinsinden |
| OnayDurumu, SubmittedById, ReviewedById, ReviewNotu | — | ortak onay deseni |
| CreatedAt | datetime2 | |

### GirisimGuncellemeTalepleri (GirisimGuncellemeTalebi)
> `Girisim`'in düzenlenebilir alanlarının tam bir kopyası — onaylanınca asıl kayda uygulanır.

| kolon | tip | not |
|---|---|---|
| Id | uniqueidentifier pk | |
| GirisimId | uniqueidentifier fk→Girisimler | `Cascade` |
| Ad, Sektor, KisaTanim, Teknoloji, WebsiteUrl, KurulusYili, EkipBuyuklugu | — | `Girisim` ile aynı alanlar (snapshot) |
| OnayDurumu, SubmittedById, ReviewedById, ReviewNotu | — | ortak onay deseni |
| CreatedAt | datetime2 | |

### Itirazlar (Itiraz)
> Reddedilmiş bir Satis/Yatirim/Basari/Dokuman kaydına karşı girişimin itirazı — kendi `OnayDurumu`sunu taşır.

| kolon | tip | not |
|---|---|---|
| Id | uniqueidentifier pk | |
| GirisimId | uniqueidentifier fk→Girisimler | `Cascade` |
| KonuTuru | int (enum) | Satis, Yatirim, Basari, Dokuman |
| KonuId | uniqueidentifier | itiraz edilen kaydın id'si (polimorfik — DB'de FK değil), index |
| Aciklama | nvarchar | girişimin itiraz gerekçesi |
| OnayDurumu, SubmittedById, ReviewedById, ReviewNotu | — | ortak onay deseni (itirazın kendi kararı) |
| CreatedAt | datetime2 | |

> `Girisimler.Puan` (int, 0-100) türetilmiş bir değerdir ama sıralanabilmesi için tabloda tutulur. Hesap tek yerdedir (`GirisimSaglikService.PuanHesapla`); puanı etkileyen bir kayıt değiştiğinde `AppDbContext.SaveChangesAsync` ilgili girişimlerin puanını kendiliğinden tazeler, böylece uç noktalara tek tek "puanı güncelle" çağrısı serpiştirmek gerekmez.

### Aşama Geçişleri (AsamaGecisi)
> Girişimin ürün olgunluk aşamasının değiştiği anlar. Güncel aşama `Girisimler.Asama` alanındadır; asıl takip değeri buradaki geçmiştedir — geçmiş olmadan "programa hangi aşamada girdi" sorusu cevaplanamaz.

| kolon | tip | not |
|---|---|---|
| Id | uniqueidentifier pk | |
| GirisimId | uniqueidentifier fk→Girisimler | `Cascade`, (GirisimId, Tarih) index |
| OncekiAsama | int (enum)? | ilk kayıtta null |
| YeniAsama | int (enum) | Fikir, Prototip, MVP, IlkMusteri, Olcekleme, Buyume |
| Tarih | datetime2 | geçişin gerçekleştiği tarih (kaydın girildiği tarihten farklı olabilir) |
| Aciklama | nvarchar(500) | zaman çizelgesinde görünen not |
| DegistirenId | uniqueidentifier fk→Users | `Restrict` |

> `ProgramKatilimlari` tablosu ayrıca `BaslangictakiAsama` ve `BitistekiAsama` alanlarını taşır: girişimin programa girdiği ve çıktığı andaki aşama o an dondurulur, sonradan hesaplanmaz — aşama daha sonra değiştiğinde programın fotoğrafı bozulmasın.

### İstihdam Kayıtları (IstihdamKaydi)
> Girişimin bir dönem sonundaki çalışan sayısı; ciro ve yatırım gibi onay akışından geçer. Profildeki `EkipBuyuklugu` tek bir anlık sayıdır ve geçmiş tutmaz — istihdamın zaman içindeki seyri ve ekosistem toplamı için döneme bağlı kayıt gerekir.

| kolon | tip | not |
|---|---|---|
| Id | uniqueidentifier pk | |
| GirisimId | uniqueidentifier fk→Girisimler | `Cascade`, (GirisimId, Donem) index |
| Donem | nvarchar(20) | satış kayıtlarıyla aynı biçim: "2026-Q1" |
| CalisanSayisi | int | dönem sonundaki toplam çalışan |
| YeniIseAlim | int? | dönem içinde yapılan yeni işe alım |
| OnayDurumu, SubmittedById, ReviewedById, ReviewNotu | — | ortak onay deseni |
| CreatedAt, UpdatedAt | datetime2 | |

### Sunum Paylaşımları (SunumPaylasimi)
> Sunumu sistem dışına açan, süre sınırlı bağlantılar. Giriş yapmamış birine içerik gösterildiği için üç koruma birlikte kurulur: 256 bitlik rastgele jeton, zorunlu son kullanma tarihi ve iptal edilebilirlik.

| kolon | tip | not |
|---|---|---|
| Id | uniqueidentifier pk | |
| GirisimId | uniqueidentifier fk→Girisimler | `Cascade` |
| Jeton | nvarchar(64) | base64url, unique index |
| Etiket | nvarchar(200) | girişimcinin kendi notu (kime paylaşıldı) |
| GecerlilikBitisi | datetime2 | zorunlu; süresiz bağlantı seçeneği yoktur |
| IptalEdildi | bit | |
| GoruntulenmeSayisi, SonGoruntulenme | int, datetime2 | girişimci ilgiyi görebilsin |
| OlusturanId | uniqueidentifier fk→Users | `Restrict` |
| CreatedAt | datetime2 | |

### Onay Önerileri (OnayOnerisi)
> ProgramYoneticisi'nin bekleyen bir kayda bıraktığı bağlayıcı olmayan tavsiye; kararı SuperAdmin verir. `Itiraz` ile aynı polimorfik (KonuTuru, KonuId) desenini kullanır.

| kolon | tip | not |
|---|---|---|
| Id | uniqueidentifier pk | |
| KonuTuru | int (enum) | Satis, Yatirim, Basari, Dokuman, Guncelleme, Itiraz |
| KonuId | uniqueidentifier | önerinin bağlandığı bekleyen kaydın id'si (polimorfik — DB'de FK değil) |
| Tavsiye | int (enum) | Onay, Ret, Cekince |
| Not | nvarchar(1000) | Ret ve Çekince için zorunlu (API doğrulaması) |
| OneriVerenId | uniqueidentifier fk→Users | `Restrict` |
| CreatedAt, UpdatedAt | datetime2 | UpdatedAt yalnızca öneri güncellenmişse dolu |

Benzersiz index: `(KonuTuru, KonuId, OneriVerenId)` — bir kullanıcının bir kayıtta tek bir güncel önerisi olur.

> `AiAnalizKayitlari` tablosu `Tur` (Ekosistem / GirisimDurumu / GirisimGelisim) ve nullable `GirisimId` alanlarını taşır: ekosistem geneli ile tek girişimin analizleri aynı tabloda tutulur, tür alanı hangisinin listeleneceğini ayırır.

### Sunum Taslakları (SunumTaslagi)
> Girişimin verisinden üretilmiş Sequoia pitch deck taslağı. Girişim başına tek güncel kayıt tutulur.

| kolon | tip | not |
|---|---|---|
| Id | uniqueidentifier pk | |
| GirisimId | uniqueidentifier fk→Girisimler | `Cascade`, unique |
| IcerikJson | nvarchar(max) | bölümlerin JSON dizisi (anahtar/başlık/içerik) |
| VeriParmakIzi | nvarchar | üretim anındaki kaynak verinin SHA-256 özeti; tutmuyorsa sunum "güncel değil" sayılır |
| OlusturanId | uniqueidentifier fk→Users | `Restrict` |
| CreatedAt, UpdatedAt | datetime2 | |

### Bildirimler (Bildirim)
| kolon | tip | not |
|---|---|---|
| Id | uniqueidentifier pk | |
| KullaniciId | uniqueidentifier fk→Users | `Cascade` |
| Tur | int (enum) | OnayKarari, ItirazSonucu, ProgramGuncellemesi, Sistem |
| Baslik, Mesaj | nvarchar | |
| IlgiliGirisimId | uniqueidentifier fk→Girisimler, nullable | `SetNull` — derin bağlantı hedefi |
| Okundu | bit | |
| CreatedAt | datetime2 | |
| **index** | (KullaniciId, Okundu) | okunmamış sayacı sorgusu için |

### SilmeTalepleri (SilmeTalebi)
> KVKK/GDPR hesap silme talebi — onaylanırsa `User` hard-delete edilmez, anonimleştirilir (bkz. `PrivacyService`).

| kolon | tip | not |
|---|---|---|
| Id | uniqueidentifier pk | |
| UserId | uniqueidentifier fk→Users | `Cascade` |
| Sebep | nvarchar nullable | |
| Durum, ReviewedById, ReviewNotu | — | ortak onay deseni |
| CreatedAt | datetime2 | |

### VerificationTokens
| kolon | tip | not |
|---|---|---|
| Id | uniqueidentifier pk | |
| UserId | uniqueidentifier fk→Users | `Cascade` |
| TokenHash | nvarchar | unique index — ham token asla saklanmaz |
| Type | int (enum) | EmailVerify, PasswordReset |
| ExpiresAt | datetime2 | |
| UsedAt | datetime2 nullable | |
| CreatedAt | datetime2 | |
| **index** | (UserId, Type) | |

---

## İndeksler (özet)
- `Users(Email)` unique, `Users(Role)`
- `ProgramKatilimlari(GirisimId, ProgramId, Donem)` unique
- `GelisimAdimlari(GirisimId)`
- `VerificationTokens(TokenHash)` unique, `VerificationTokens(UserId, Type)`
- `Itirazlar(KonuId)`
- `OnayOnerileri(KonuTuru, KonuId, OneriVerenId)` — unique
- `Bildirimler(KullaniciId, Okundu)`

## Silme Davranışı (DeleteBehavior)
- `Girisim → {SatisKaydi, YatirimKaydi, Basari, Dokuman, GelisimAdimi, ProgramKatilimi, GirisimGuncellemeTalebi, Itiraz}`: **Cascade** — bir girişim silinirse alt kayıtları da silinir.
- `User → Girisim.CreatedBy`, `GirisimProgrami.CreatedBy`, her kaydın `SubmittedBy`/`ReviewedBy`'ı (Itiraz ve SilmeTalebi dahil): **Restrict** — bir kullanıcıyı sildirmek, geçmiş kayıtları etkisiz kılmaz (önce ilişkili kayıtlar taşınmalı/silinmeli). Bu yüzden KVKK hesap silme talebi hard-delete değil, anonimleştirme olarak uygulanır.
- `User.GirisimId` (StartupKullanicisi'nin bağlı olduğu girişim): **SetNull** — girişim silinirse kullanıcı "bağlantısız" kalır, silinmez.
- `Bildirim.IlgiliGirisimId`: **SetNull**.
- `ProgramKatilimi → GirisimProgrami`: **Restrict**.
- `SilmeTalebi.UserId`, `Bildirim.KullaniciId`: **Cascade** (kullanıcıyla birlikte silinir).
