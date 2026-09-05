# API Endpoint Listesi — ASP.NET Core Web API

> Base: `/api`. Auth: `Authorization: Bearer <access_token>` (JWT, `AuthController.Login`/`Register`'dan
> alınır). Tek kiracılı sistemdir — tenant header'ı yoktur. Rol kontrolü merkezi authorization policy'leri
> (`AuthorizationPolicies`) ile `[Authorize(Policy = ...)]` üzerinden yapılır; `StartupKullanicisi`'nin
> "kendi girişimi mi" kontrolü `[GirisimErisim]` kaynak bazlı filter'ıyla otomatik uygulanır. Aşağıdaki
> tablolarda "Yetki" kolonu, o policy'nin karşılık geldiği rolleri okunabilirlik için listeler.
>
> Kaynak: `src/T3VentureOS.Web/Controllers/*.cs`.

## Auth (`api/auth`)
| Metod | Yol | Yetki | Açıklama |
|---|---|---|---|
| POST | `/auth/login` | herkes | email+şifre → JWT access token + kullanıcı DTO'su |
| POST | `/auth/register` | herkes | yeni `StartupKullanicisi` + kendi `Girisim`'i self-servis kaydolur |
| POST | `/auth/forgot-password` | herkes | var/yok bilgisi sızdırmadan sıfırlama kodu e-postalar |
| POST | `/auth/reset-password` | herkes (token ile) | kod + yeni parola → parola günceller |
| GET | `/auth/me` | auth | giriş yapan kullanıcının profili |
| POST | `/auth/change-password` | auth | mevcut + yeni parola |
| POST | `/auth/resend-verification` | auth | e-posta doğrulama kodunu yeniden gönderir |
| POST | `/auth/verify-email` | auth | doğrulama kodunu kullanır, `EmailVerified=true` yapar |

## Dashboard (`api/dashboard`)
| Metod | Yol | Yetki | Açıklama |
|---|---|---|---|
| GET | `/dashboard` | SuperAdmin, ProgramYoneticisi, KararVerici | toplam girişim/program/onay sayısı, sektör dağılımı, aylık trend, yatırım türü dağılımı |
| GET | `/dashboard/ozet` | **anonim** | ana sayfanın canlı istatistik paneli için özet (giriş yapmamış ziyaretçiye de açık) |
| POST | `/dashboard/ai-analiz` | SuperAdmin, ProgramYoneticisi, KararVerici | dashboard verisini Anthropic Claude API'ye gönderip Türkçe ekosistem yorumu üretir |

## Girişimler (`api/girisimler`)
| Metod | Yol | Yetki | Açıklama |
|---|---|---|---|
| GET | `/girisimler` | SuperAdmin, ProgramYoneticisi, KararVerici | sayfalanmış liste (sektör/program/arama/sıralama filtreli) |
| GET | `/girisimler/benim` | StartupKullanicisi | kendi girişim kartının detayı |
| GET | `/girisimler/{id}` | auth (StartupKullanicisi yalnızca kendi girişimi) | girişim detayı |
| POST | `/girisimler` | SuperAdmin, ProgramYoneticisi | yeni girişim kartı oluşturur |
| PUT | `/girisimler/{id}` | SuperAdmin, ProgramYoneticisi | girişim bilgilerini günceller |
| POST | `/girisimler/{id}/gelisim-adimlari` | StartupKullanicisi, SuperAdmin, ProgramYoneticisi | zaman çizelgesine kilometre taşı ekler |
| POST | `/girisimler/{id}/satis` | StartupKullanicisi, SuperAdmin, ProgramYoneticisi | satış kaydı gönderir (onay bekler) |
| DELETE | `/girisimler/{id}/satis/{satisId}` | StartupKullanicisi, SuperAdmin, ProgramYoneticisi | satış kaydını siler |
| POST | `/girisimler/{id}/yatirim` | StartupKullanicisi, SuperAdmin, ProgramYoneticisi | yatırım kaydı gönderir (onay bekler) |
| DELETE | `/girisimler/{id}/yatirim/{yatirimId}` | StartupKullanicisi, SuperAdmin, ProgramYoneticisi | yatırım kaydını siler |
| POST | `/girisimler/{id}/basari` | StartupKullanicisi, SuperAdmin, ProgramYoneticisi | başarı kaydı gönderir (onay bekler) |
| DELETE | `/girisimler/{id}/basari/{basariId}` | StartupKullanicisi, SuperAdmin, ProgramYoneticisi | başarı kaydını siler |
| POST | `/girisimler/{id}/logo` | StartupKullanicisi, SuperAdmin, ProgramYoneticisi | logo yükler (multipart, ≤5 MB) |
| POST | `/girisimler/{id}/dokuman` | StartupKullanicisi, SuperAdmin, ProgramYoneticisi | doküman yükler (multipart, ≤20 MB, onay bekler) |
| DELETE | `/girisimler/{id}/dokuman/{dokumanId}` | StartupKullanicisi, SuperAdmin, ProgramYoneticisi | dokümanı siler |
| POST | `/girisimler/{id}/guncelleme-talebi` | StartupKullanicisi | profil alanları için toplu güncelleme talebi gönderir (onay bekler) |
| GET | `/girisimler/{id}/guncelleme-talepleri` | auth (kendi girişimi) | o girişime ait güncelleme taleplerinin geçmişi |
| POST | `/girisimler/{id}/itiraz` | StartupKullanicisi | reddedilmiş bir satış/yatırım/başarı/doküman kaydına itiraz gönderir |
| GET | `/girisimler/{id}/itirazlar` | auth (kendi girişimi) | o girişime ait itirazların geçmişi |
| GET | `/girisimler/{id}/durum` | auth (kendi girişimi) | girişim künyesinin durum kartı: profil tamlığı, son veri girişi, bekleyen kayıt sayısı |
| GET | `/girisimler/{id}/sunum-taslagi` | auth (kendi girişimi) | girişimin güncel Sequoia pitch deck taslağı; `guncel=false` ise taslak üretildikten sonra veri değişmiştir |
| POST | `/girisimler/{id}/sunum-taslagi` | auth (kendi girişimi) | girişimin verisinden AI ile sunum taslağı üretir, mevcut taslağın üzerine yazar |
| PUT | `/girisimler/{id}/sunum-taslagi/{anahtar}` | auth (kendi girişimi) | sunum bölümünün metnini elle günceller; gövdedeki `icerik` boş bırakılırsa AI metnine geri dönülür. Elle düzenlenen bölüm yeniden üretimde korunur |
| GET | `/girisimler/{id}/onboarding-durumu` | auth (kendi girişimi) | profil tamamlanma kontrol listesi (logo, kısa tanım, ilk satış, ilk gelişim adımı, e-posta doğrulama) |

## Onaylar (`api/onaylar`)
> Kuyruğu görme ve öneri bırakma `SuperAdmin, ProgramYoneticisi` ile sınırlıdır; **onay/ret kararı yalnızca `SuperAdmin`e açıktır** (ProgramYoneticisi için `403`).
> Bir kayıt karara bağlandığında üzerindeki öneriler silinir.

| Metod | Yol | Yetki | Açıklama |
|---|---|---|---|
| GET | `/onaylar` | SuperAdmin, ProgramYoneticisi | bekleyen satış/yatırım/başarı/doküman/güncelleme/itiraz kayıtlarının tek bir kuyruk halinde listesi + bu kayıtlara bırakılmış öneriler |
| POST | `/onaylar/oneri` | SuperAdmin, ProgramYoneticisi | bekleyen bir kayda bağlayıcı olmayan öneri bırakır (`Onay`/`Ret`/`Cekince`; Ret ve Çekince için gerekçe zorunlu). Aynı kullanıcının o kayıttaki önceki önerisini günceller |
| POST | `/onaylar/satis/{id}` | SuperAdmin | satış kaydı için onay/ret kararı (ret → not zorunlu) |
| POST | `/onaylar/yatirim/{id}` | SuperAdmin | yatırım kaydı için onay/ret kararı |
| POST | `/onaylar/basari/{id}` | SuperAdmin | başarı kaydı için onay/ret kararı |
| POST | `/onaylar/dokuman/{id}` | SuperAdmin | doküman için onay/ret kararı |
| POST | `/onaylar/guncelleme/{id}` | SuperAdmin | profil güncelleme talebi için onay/ret kararı (onaylanırsa alanlar `Girisim`'e uygulanır) |
| POST | `/onaylar/itiraz/{id}` | SuperAdmin | itiraz için onay/ret kararı (kabul edilirse hedef kayıt tekrar `Onaylandi` olur) |

## Programlar (`api/programs`)
| Metod | Yol | Yetki | Açıklama |
|---|---|---|---|
| GET | `/programs` | auth | sayfalanmış program listesi (arama filtreli) |
| GET | `/programs/aktif` | **anonim** | ana sayfanın aktif-programlar bölümü için |
| GET | `/programs/{id}` | auth | program detayı + katılımcılar |
| POST | `/programs` | SuperAdmin, ProgramYoneticisi | yeni hızlandırma programı oluşturur |
| PUT | `/programs/{id}` | SuperAdmin, ProgramYoneticisi | program bilgisi/durumunu günceller |
| POST | `/programs/{id}/basvuru` | StartupKullanicisi | kendi girişimiyle programa başvurur |
| POST | `/programs/{id}/katilimlar` | SuperAdmin, ProgramYoneticisi | bir girişimi manuel olarak programa ekler |
| PUT | `/programs/katilimlar/{katilimId}/durum` | SuperAdmin, ProgramYoneticisi | katılım durumunu günceller (Basvuru→KabulEdildi→DevamEdiyor→Mezun/Ayrildi) |

## Admin — Kullanıcılar (`api/admin/users`)
> Tüm uç noktalar `SuperAdmin` ile sınırlıdır.

| Metod | Yol | Açıklama |
|---|---|---|
| GET | `/admin/users` | sayfalanmış kullanıcı listesi (rol/arama filtreli) |
| POST | `/admin/users/invite` | e-posta ile yeni kullanıcı davet eder (rol + opsiyonel girişim ataması) |
| POST | `/admin/users/{id}/resend-invite` | davet e-postasını yeniden gönderir |
| POST | `/admin/users/{id}/disable` | kullanıcıyı devre dışı bırakır (kendi hesabı hariç) |
| POST | `/admin/users/{id}/enable` | kullanıcıyı yeniden aktifleştirir |

## Bildirimler (`api/bildirimler`)
> Tüm uç noktalar `auth` (kendi bildirimleri).

| Metod | Yol | Açıklama |
|---|---|---|
| GET | `/bildirimler` | sayfalanmış bildirim listesi (en yeni önce) |
| GET | `/bildirimler/okunmamis-sayisi` | okunmamış bildirim sayısı (bildirim çanı rozeti için) |
| POST | `/bildirimler/{id}/okundu` | bir bildirimi okundu işaretler |
| POST | `/bildirimler/tumunu-okundu-yap` | tüm bildirimleri okundu işaretler |

## Hesabım (`api/hesabim`) — KVKK self-servis
> Tüm uç noktalar `auth` (kendi hesabı).

| Metod | Yol | Açıklama |
|---|---|---|
| GET | `/hesabim/veri-ihracim` | kendi profilini ve (varsa) girişiminin tüm kayıtlarını JSON olarak dışa aktarır |
| GET | `/hesabim/silme-talebi` | kendi bekleyen/karara bağlanmış hesap silme talebinin durumu |
| POST | `/hesabim/silme-talebi` | hesap silme talebi oluşturur |

## Admin — Silme Talepleri (`api/admin/silme-talepleri`)
> Tüm uç noktalar `SuperAdmin` ile sınırlıdır.

| Metod | Yol | Açıklama |
|---|---|---|
| GET | `/admin/silme-talepleri` | bekleyen hesap silme taleplerinin listesi |
| POST | `/admin/silme-talepleri/{id}` | onay/ret kararı — onaylanırsa kullanıcı anonimleştirilir ve `Disabled` yapılır (hard-delete edilmez) |

---

## Dosya Servis Yolu
Yüklenen dosyalar (logo, doküman) `wwwroot/uploads` altına yazılır ve statik dosya middleware'i ile
`/uploads/<dosya>` yolundan servis edilir — ayrı bir dosya indirme uç noktası yoktur.

## Notlar
- Yazma işlemleri için ayrı bir audit-log tablosu/uç noktası yoktur; onay kararları ilgili kaydın
  kendi `ReviewedById`/`ReviewNotu` alanlarında tutulur.
- Excel/CSV dışa aktarımı sunucu tarafında bir uç nokta olarak değil, `client/src/pages/rapor` altında
  `xlsx` paketiyle **istemci tarafında** üretilir.
- `AuthController` ve `GirisimlerController`'ın bir kısmı `T3VentureOS.Tests` altında entegrasyon testleriyle
  kapsanıyor; kalan controller'lar (Bildirimler, Hesabim, Admin/SilmeTalepleri dahil) için henüz otomatik
  test yok — bkz. `docs/01-ARCHITECTURE.md` § 9 Test.
