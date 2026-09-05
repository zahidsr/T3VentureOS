# T3VentureOS — Girişim Ekosistemi Değerlendirme Platformu

T3 Vakfı girişimcilik ekosistemi için kurumsal, çok kiracılı (multi-tenant) olmayan değerlendirme ve raporlama platformu. Girişimleri, hızlandırma programlarını, satış/yatırım/başarı kayıtlarını merkezi bir yerde toplar; program yöneticileri, karar vericiler ve girişim temsilcileri için işbirlikçi bir yönetim süreci sunar.

## Teknoloji Yığını

| Katman | Teknoloji |
|--------|-----------|
| Backend | .NET 10 + ASP.NET Core Web API + Entity Framework Core |
| Veritabanı | SQL Server (LocalDB üzerinde geliştirme) |
| Frontend | React + Vite + TypeScript + Tailwind CSS + shadcn/ui |
| Auth & Session | JWT (access) + HttpOnly cookie (refresh) + ASP.NET Core Identity `PasswordHasher` (PBKDF2-HMAC-SHA256) |
| Raporlama & AI | Recharts + Google Gemini API (`IAiService` ile sağlayıcı değiştirilebilir; Anthropic Claude de desteklenir) |
| Dışa Aktarım | CSV, Excel (XLSX) |

## Proje Yapısı

```
T3VentureOS/
├── src/
│   ├── T3VentureOS.Web/            # ASP.NET Core API
│   ├── T3VentureOS.Infrastructure/ # EF Core, servisler, dosya depolama
│   ├── T3VentureOS.Domain/         # Varlıklar ve enumlar
│   └── T3VentureOS.Tests/          # xUnit birim + entegrasyon testleri
├── client/                         # React frontend
├── docs/                           # Mimari, veritabanı şeması, API endpoint dokümanları
├── T3VentureOS.slnx
└── README.md
```

## Roller

- **SuperAdmin** — Sistem genelinde tüm girişim, program, kullanıcı yönetimi ve **tüm onay/red kararları**
- **ProgramYoneticisi** — Hızlandırma programları oluşturur, girişimleri programa ekler, onay kuyruğunu inceleyip öneri bırakır (karar yetkisi yoktur)
- **KararVerici** — Ekosistem raporlarını ve girişim detaylarını inceler, AI destekli analizleri görüntüler
- **StartupKullanicisi** — Kendi girişiminin profilini günceller, satış/yatırım/başarı/doküman kaydı girer

## Hızlı Başlangıç

### Backend

```bash
cd src/T3VentureOS.Web
dotnet restore
dotnet user-secrets set "Jwt:Key" "<en az 32 karakterlik rastgele bir gizli anahtar>"  # zorunlu
dotnet user-secrets set "Gemini:ApiKey" "<AIza...>"  # AI analizleri için (isteğe bağlı)
dotnet run --urls "http://localhost:5215"
```

`Jwt:Key` ayarlanmadan uygulama başlatılamaz (JWT imzalama anahtarı `appsettings.json`'a asla commit edilmez). Diğer ortamlarda `Jwt__Key` environment variable'ı olarak da verilebilir.

### Frontend

```bash
cd client
npm install
npm run dev
```

Uygulama http://localhost:5173 adresinde açılır, API'ye http://localhost:5215 üzerinden bağlanır (`client/.env` → `VITE_API_URL`).

### Test

```bash
cd src/T3VentureOS.Tests
dotnet test
```

```bash
cd client
npm test
```

## Geliştirme Hesapları

Tüm şifreler: `Passw0rd!`

| Rol | E-posta |
|-----|---------|
| SuperAdmin | superadmin@t3ventureos.local |
| Program Yöneticisi | program@t3vakfi.local |
| Karar Verici | karar@t3vakfi.local |
| Startup Temsilcisi | girisim@t3vakfi.local |

## Özellikler

- Girişim kartları ve detaylı profil yönetimi
- Girişim künyesi: yöneticiler girişim detayının üstünde durumu, iletişim muhatabını (tıklanabilir telefon/e-posta) ve sunumu tek bakışta görür
- Hızlandırma programları ve programa katılım süreçleri
- Onay akışlı satış, yatırım, başarı ve doküman kayıtları (karar SuperAdmin'de; ProgramYoneticisi onay/ret/çekince önerisi bırakır)
- İtiraz (appeal) akışı: reddedilen kayıtlara itiraz, itiraz onaylanırsa kayıt tekrar onaylı duruma döner
- Uygulama içi bildirimler: onay/itiraz kararları ve program güncellemeleri
- KVKK/GDPR self-servis: veri dışa aktarma ve hesap silme talebi (anonimleştirme)
- Girişim profili tamamlanma (onboarding) kontrol listesi
- Karar verici için interaktif dashboard: sektör dağılımı, aylık trend, yatırım türü dağılımı
- AI destekli ekosistem analizi ve rakip analizi (Google Gemini API)
- Girişimin verisinden Sequoia pitch deck şablonuna göre otomatik sunum üretimi; veri değiştiğinde sunum "güncel değil" olarak işaretlenir ve tek tıkla yenilenir, bölümler elle düzenlenebilir (düzenlenen bölüm yeniden üretimde korunur, AI metnine geri dönülebilir) ve onaylı ciro/yatırım grafikleriyle birlikte slayt başına bir sayfa PDF olarak indirilir
- CSV ve Excel rapor export
- T3 Vakfı kurumsal renkleriyle tutarlı UI/UX
