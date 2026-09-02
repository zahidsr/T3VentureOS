# T3VentureOS — Mimari Doküman

> Tek kurumlu (multi-tenant **değil**), T3 Vakfı'nın girişimcilik ekosistemini merkezi olarak
> yönetip raporladığı kurumsal platform. Girişim kartları, hızlandırma programları, satış/yatırım/
> başarı/doküman kayıtları ve onay akışlarını tek bir veritabanında toplar.

**Kod adı:** T3VentureOS
**Stack:** .NET 10 + ASP.NET Core Web API · Entity Framework Core · SQL Server (LocalDB'de geliştirme) · React + Vite + TypeScript + Tailwind CSS + shadcn/ui

---

## 1. Ürün Vizyonu

Girişimleri, hızlandırma programlarını ve girişimlerin satış/yatırım/başarı kayıtlarını merkezi bir
yerde toplayan, program yöneticileri ile karar vericiler için işbirlikçi bir yönetim/raporlama süreci
sunan tek-kiracılı bir kurumsal uygulama.

## 2. Roller ve Yetkiler (RBAC)

| Rol | Kapsam | Yetkiler |
|-----|--------|----------|
| **SuperAdmin** | Sistem geneli | Tüm girişim/program/kullanıcı yönetimi, tüm onaylar, kullanıcı davet/devre dışı bırakma |
| **ProgramYoneticisi** | Programlar + girişimler | Program oluşturur/düzenler, girişim ekler/düzenler, katılım yönetir, onay kuyruğunu işler |
| **KararVerici** | Salt okunur + AI analiz | Dashboard ve girişim detaylarını görüntüler, AI destekli ekosistem analizi ister |
| **StartupKullanicisi** | Yalnızca kendi girişimi | Kendi `Girisim` kaydına satış/yatırım/başarı/doküman/gelişim adımı ekler, profil güncelleme talebi gönderir, programlara başvurur |

> Yetkilendirme: JWT Bearer token (`ClaimTypes.Role`, `AppClaimTypes.GirisimId`) + merkezi ASP.NET Core
> authorization policy'leri (`AuthorizationPolicies` — `YoneticiErisimi`, `YonetimVeRaporErisimi`,
> `StartupErisimi`, `GirisimVeriGirisiErisimi`, `SistemYonetimiErisimi`), controller/aksiyon seviyesinde
> `[Authorize(Policy = ...)]` ile uygulanır. `StartupKullanicisi`'nin yalnızca kendi girişimine erişebilmesi
> kaynak bazlı bir authorization filter'la (`[GirisimErisim]`) garanti edilir — route'taki girişim id'si
> ile JWT'deki `GirisimId` claim'i karşılaştırılır; yeni bir girişim-scoped endpoint eklendiğinde bu
> kontrolün unutulması mümkün değildir. Veritabanı seviyesinde satır bazlı bir izolasyon (RLS) yoktur,
> çünkü tek kiracılı bir sistemdir.

## 3. Çekirdek Domain Akışı

```
SuperAdmin/ProgramYoneticisi ──> GirisimProgrami (hızlandırma programı) oluşturur
                              ──> Girisim (startup) kartı oluşturur/düzenler
                                       │
StartupKullanicisi           ──> Kendi Girisim'ine satış/yatırım/başarı/doküman/gelişim adımı ekler
                              ──> Programlara başvurur (ProgramKatilimi, Durum=Basvuru)
                              ──> Profil güncelleme talebi gönderir (GirisimGuncellemeTalebi)
                                       │
SuperAdmin/ProgramYoneticisi ──> Onay kuyruğunda (api/onaylar) bekleyen kayıtları görür
                              ──> Onaylar veya reddeder (ret için not zorunlu)
                              ──> Program katılım durumunu günceller (Basvuru→KabulEdildi→...→Mezun)
                                       │
StartupKullanicisi           ──> Reddedilen bir kayda itiraz eder (api/girisimler/{id}/itiraz)
SuperAdmin/ProgramYoneticisi ──> İtirazı karara bağlar (api/onaylar/itiraz/{id}) — kabul edilirse kayıt
                                  tekrar Onaylandi olur
                                       │
Her karar/güncelleme         ──> İlgili kullanıcıya uygulama içi bildirim düşer (api/bildirimler)
                                       │
KararVerici / SuperAdmin /   ──> Dashboard'da sektör dağılımı, aylık trend, yatırım türü dağılımı görür
ProgramYoneticisi             ──> AI destekli ekosistem analizi ister (Anthropic Claude API)
                              ──> CSV/Excel rapor dışa aktarır
```

## 4. Onay Akışı (Onay Durumu Deseni)

Girişimin kendi girdiği neredeyse her kayıt türü (`SatisKaydi`, `YatirimKaydi`, `Basari`, `Dokuman`,
`GirisimGuncellemeTalebi`) aynı ortak deseni izler:

- Kayıt oluşturulurken `OnayDurumu = Beklemede`, `SubmittedById` = giriş yapan kullanıcı.
- `SuperAdmin`/`ProgramYoneticisi` `api/onaylar` uç noktalarından `Onaylandi`/`Reddedildi` kararı verir;
  `ReviewedById` ve (varsa) `ReviewNotu` yazılır.
- Reddetme işleminde **not zorunludur** (`OnayController.ValidateKarar`) — girişimin ne düzeltmesi
  gerektiğini bilmesi için.
- `GirisimGuncellemeTalebi` onaylandığında talebin alanları asıl `Girisim` kaydına uygulanır
  (`OnayService.KararVerGuncellemeAsync`).

## 5. İtiraz, Bildirim, KVKK ve Onboarding

- **İtiraz (`Itiraz` entity, `ItirazService`, `api/girisimler/{id}/itiraz`, `api/onaylar/itiraz/{id}`):**
  reddedilmiş bir `SatisKaydi`/`YatirimKaydi`/`Basari`/`Dokuman` için StartupKullanicisi itiraz açabilir.
  İtiraz kabul edilirse hedef kaydın `OnayDurumu` tekrar `Onaylandi` olur; aynı kayıt için birden fazla
  bekleyen itiraz açılamaz.
- **Bildirimler (`Bildirim` entity, `NotificationService`, `api/bildirimler`):** onay/itiraz kararları ve
  program katılım güncellemeleri, ilgili kullanıcıya uygulama içi bir bildirim olarak düşer (okundu/okunmadı
  durumu, sayaç, tümünü okundu işaretleme). `OnayService` ve `ProgramService` karar/güncelleme sonrası
  `NotificationService.CreateAsync` çağırır.
- **KVKK/Gizlilik (`SilmeTalebi` entity, `PrivacyService`, `api/hesabim`, `api/admin/silme-talepleri`):**
  her kullanıcı `GET /api/hesabim/veri-ihracim` ile kendi verisini (profil + varsa girişiminin tüm kayıtları)
  JSON olarak dışa aktarabilir; `POST /api/hesabim/silme-talebi` ile hesap silme talebinde bulunabilir.
  SuperAdmin onayı, kullanıcıyı **hard-delete etmez** — e-posta/isim anonimleştirilir ve hesap `Disabled`
  yapılır, böylece geçmiş onay/itiraz kayıtlarındaki `SubmittedBy`/`ReviewedBy` referansları bozulmaz.
- **Onboarding (`OnboardingService`, `api/girisimler/{id}/onboarding-durumu`):** girişim profilinin ne
  kadar tamamlandığını (logo, kısa tanım, ilk satış kaydı, ilk gelişim adımı, e-posta doğrulama) hesaplayan,
  veritabanında ayrı bir tablo tutmayan, tamamen mevcut veriden türetilen bir kontrol listesi.

## 6. Güvenlik

- **Kimlik doğrulama:** JWT Bearer (access token, varsayılan 120 dakika, `Jwt:AccessTokenMinutes`).
  İmzalama anahtarı (`Jwt:Key`) hiçbir zaman `appsettings.json`'a commit edilmez; `dotnet user-secrets`
  veya `Jwt__Key` ortam değişkeni ile sağlanır — eksikse uygulama başlangıçta net bir hata ile durur.
- **Parola hash'leme:** ASP.NET Core Identity'nin varsayılan `PasswordHasher<User>`'ı
  (PBKDF2-HMAC-SHA256, salt'lı, sürüm damgalı format) — bkz. `PasswordHasherService`.
- **E-posta doğrulama & parola sıfırlama:** `VerificationToken` tablosu, hash'lenmiş tek kullanımlık
  token + `ExpiresAt`/`UsedAt` alanlarıyla.
- **Hesap kilitleme:** `User.FailedLoginAttempts` / `LockedUntil` alanları başarısız giriş denemelerini
  sınırlar.
- **CORS:** yalnızca `Cors:AllowedOrigins` içinde tanımlı origin'ler (geliştirmede `localhost:5173`).
- **Dosya yükleme:** logo için 5 MB, doküman için 20 MB `[RequestSizeLimit]` sınırı; dosyalar
  `FileStorageService` ile `wwwroot/uploads` altına yazılır ve `/uploads` altından servis edilir.
- **AI entegrasyonu:** `Anthropic:ApiKey` boşsa AI analiz uç noktası hata mesajıyla düzgünce başarısız
  olur; anahtar `user-secrets` ile sağlanır, koda hiçbir zaman gömülmez.

## 7. Ölçeklenebilirlik / Operasyon

- Tek proses, tek veritabanı (SQL Server) — çok kiracılı değildir, bu nedenle tenant izolasyonu,
  connection pooling stratejisi vb. kaygılar yoktur.
- Uygulama açılışında (`Program.cs`) `DbInitializer.SeedAsync` + `SeedDemoExtrasAsync` çalışır: geliştirme
  hesapları ve demo verisi idempotent şekilde oluşturulur.
- Dosyalar yerel disk (`wwwroot/uploads`) üzerinde tutulur — object storage (S3/MinIO) entegrasyonu yoktur.
- E-posta gönderimi `IEmailSender` arayüzü üzerinden soyutlanmış; varsayılan implementasyon
  (`LoggingEmailSender`) gerçek SMTP göndermez, log'a yazar.

## 8. Proje / Modül Yapısı

```
T3VentureOS/
├── src/
│   ├── T3VentureOS.Domain/           # Entity'ler (POCO) + Enums.cs — dış bağımlılığı yok
│   │   └── Entities/              # Girisim, GirisimProgrami, ProgramKatilimi, SatisKaydi,
│   │                               # YatirimKaydi, Basari, Dokuman, GelisimAdimi,
│   │                               # GirisimGuncellemeTalebi, User, VerificationToken,
│   │                               # Bildirim, Itiraz, SilmeTalebi
│   ├── T3VentureOS.Infrastructure/    # EF Core DbContext, migration'lar, servisler
│   │   ├── Data/                  # AppDbContext, DbInitializer (seed)
│   │   └── Services/              # AuthService, GirisimService, ProgramService, OnayService,
│   │                               # DashboardService, UserService, PasswordHasherService,
│   │                               # VerificationTokenService, FileStorageService, AnthropicService,
│   │                               # NotificationService, ItirazService, PrivacyService, OnboardingService
│   ├── T3VentureOS.Web/                # ASP.NET Core Web API (giriş noktası)
│   │   ├── Auth/                  # JwtTokenService, HttpCurrentUserService, AuthorizationPolicies,
│   │   │                          # GirisimErisimAttribute
│   │   ├── Controllers/           # Auth, Dashboard, Girisimler, Onay, Programs, Bildirimler, Hesabim,
│   │   │                          # Admin/Users, Admin/SilmeTalepleri
│   │   └── Dtos/                  # Request/response DTO'ları + entity→DTO mapping extension'ları
│   └── T3VentureOS.Tests/            # xUnit birim + entegrasyon testleri
└── client/                        # React + Vite + TS + Tailwind + shadcn/ui frontend
    └── src/
        ├── pages/                 # account, admin, auth, girisimim, girisimler, home, onaylar, programlar, rapor
        ├── components/            # layout, patterns, ui (shadcn), ErrorBoundary, ProtectedRoute
        └── lib/                   # api-client, auth-context, role-home, types
```

## 9. Test

- **Backend:** `src/T3VentureOS.Tests` (xUnit) — `PasswordHasherService`, `AuthService`, `OnayService`,
  `DashboardService` için EF Core InMemory tabanlı birim testleri; `AuthController` ve
  `GirisimlerController` için `WebApplicationFactory<Program>` tabanlı uçtan uca entegrasyon testleri
  (gerçek Program.cs pipeline'ı + seed verisi, izole bir InMemory veritabanına karşı çalışır) — kaynak
  bazlı yetkilendirmeyi (`[GirisimErisim]`) doğrudan doğrulayan bir regresyon testi dahil.
  Çalıştırmak için: `cd src/T3VentureOS.Tests && dotnet test`.
- **Frontend:** `client` altında Vitest + Testing Library — `role-home`, `use-debounced-value`,
  `cn` (utils) için birim testleri ve `ProtectedRoute` için bileşen testi. Çalıştırmak için:
  `cd client && npm test`.
- Kapsam şu an temel düzeyde (kritik servisler + birkaç uç nokta/bileşen); tüm controller'ları ve
  sayfaları kapsamıyor. Yeni eklenen bildirim/itiraz/gizlilik/onboarding servisleri için henüz ayrı
  birim testi yazılmadı.

## 10. Bilinen Eksikler / Yol Haritası

- SSO ve dış entegrasyonlar kapsamda değil.
- CI/CD pipeline'ı ve konteynerleştirme (Docker) henüz kurulmadı.
- Frontend tarafında itiraz gönderme/listeleme, bildirim çanı, KVKK sayfası ve onboarding kontrol listesi
  için backend uç noktaları hazır ama UI henüz eklenmedi.
