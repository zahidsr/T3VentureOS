# T3VentureOS — Girişim Ekosistemi Değerlendirme Platformu

T3 Vakfı girişimcilik ekosistemi için kurumsal, çok kiracılı (multi-tenant) olmayan değerlendirme ve raporlama platformu. Girişimleri, hızlandırma programlarını, satış/yatırım/başarı kayıtlarını merkezi bir yerde toplar; program yöneticileri, karar vericiler ve girişim temsilcileri için işbirlikçi bir yönetim süreci sunar.

## Teknoloji Yığını

| Katman | Teknoloji |
|--------|-----------|
| Backend | .NET 10 + ASP.NET Core Web API + Entity Framework Core |
| Veritabanı | SQL Server (LocalDB üzerinde geliştirme) |
| Frontend | React + Vite + TypeScript + Tailwind CSS + shadcn/ui |
| Auth & Session | JWT access token (istemcide `localStorage`) + ASP.NET Core Identity `PasswordHasher` (PBKDF2-HMAC-SHA256). Çerez kullanılmaz. |
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

Sıfırdan kurulum: aşağıdaki adımlar yeni klonlanmış bir kopyayı çalışır hâle getirir.
Veritabanı şeması ve demo verisi API ilk açılışta otomatik oluşturulur; elle migration
çalıştırmak gerekmez.

**Gereksinimler:** .NET 10 SDK, Node.js 20+, bir SQL Server örneği.

### 1. Veritabanı

`appsettings.json` içindeki varsayılan bağlantı LocalDB'yi işaret eder ve yalnızca
Windows'ta çalışır. macOS/Linux'ta SQL Server'ı Docker ile ayağa kaldırın:

```bash
docker run -d --name t3-sql \
  -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=<güçlü bir parola>" \
  -p 1433:1433 mcr.microsoft.com/mssql/server:2022-latest
```

Sonra bağlantıyı user-secrets'a yazın (bir sonraki adımda):

```
Server=localhost,1433;Database=T3VentureOS;User Id=sa;Password=<parola>;TrustServerCertificate=True
```

### 2. Backend

```bash
cd src/T3VentureOS.Web
dotnet restore
dotnet user-secrets set "Jwt:Key" "<en az 32 karakterlik rastgele bir gizli anahtar>"   # zorunlu
dotnet user-secrets set "ConnectionStrings:Default" "<yukarıdaki bağlantı dizesi>"       # LocalDB kullanmıyorsanız zorunlu
dotnet user-secrets set "Gemini:ApiKey" "<AIza...>"                                      # AI analizleri için
dotnet run --urls "http://localhost:5215"
```

`Jwt:Key` ayarlanmadan uygulama başlatılamaz (JWT imzalama anahtarı `appsettings.json`'a
asla commit edilmez). Diğer ortamlarda `Jwt__Key` environment variable'ı olarak da verilebilir.

`Gemini:ApiKey` girilmezse uygulama çalışır ama AI analizi üreten ekranlar hata döner;
sistemin geri kalanı bundan etkilenmez. Anahtar user-secrets'ta tutulur, repoya girmez —
projeyi yeni klonlayan herkesin kendi anahtarını girmesi gerekir.

### 3. Frontend

```bash
cd client
npm install
npm run dev
```

Uygulama http://localhost:5173 adresinde açılır ve API'ye http://localhost:5215/api
üzerinden bağlanır. API'yi farklı bir portta çalıştırıyorsanız `client/.env.local`
oluşturup `VITE_API_URL` verin (bkz. `client/.env.example`) ve API tarafında da o adrese
CORS izni tanımlayın (`Cors__AllowedOrigins__1` environment variable'ı).

### Test

```bash
dotnet test T3VentureOS.slnx     # backend
cd client && npm test            # frontend
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
- Girişim aşaması (Fikir → Prototip → MVP → İlk Müşteri → Ölçekleme → Büyüme) ve aşama geçiş geçmişi; programa giriş/çıkış aşaması katılım anında dondurulur
- Girişim yolculuğu zaman çizelgesi: aşama geçişleri, program katılımları, yatırım turları, başarılar ve gelişim adımları tek eksende
- Girişim künyesi: yöneticiler girişim detayının üstünde durumu, iletişim muhatabını (tıklanabilir telefon/e-posta) ve sunumu tek bakışta görür
- Hızlandırma programları ve programa katılım süreçleri
- Program etkisi (kohort) panosu: bir programa katılan girişimlerin program başlangıcından bugüne ürettiği ciro, çektiği yatırım ve yarattığı istihdam
- Onay akışlı satış, yatırım, istihdam, başarı ve doküman kayıtları (karar SuperAdmin'de; ProgramYoneticisi onay/ret/çekince önerisi bırakır)
- İtiraz (appeal) akışı: reddedilen kayıtlara itiraz, itiraz onaylanırsa kayıt tekrar onaylı duruma döner
- Uygulama içi bildirimler: onay/itiraz kararları ve program güncellemeleri
- KVKK/GDPR self-servis: veri dışa aktarma ve hesap silme talebi (anonimleştirme)
- Girişim profili tamamlanma (onboarding) kontrol listesi
- Girişim puanı (0-100) ve seviye rozeti (Bronz/Gümüş/Altın/Platin): profil tamlığı ve girilen kayıt derinliğinden hesaplanır, yalnızca artar; güncellik ayrı bir işaret olarak taşınır
- Puanın karşılığı görünürlük: yönetici panelinde "Öne Çıkan Girişimler" vitrini ve puana/güncelliğe göre sıralanabilir girişim listesi
- Çeyreklik tek ekran veri girişi: ciro, ihracat, çalışan sayısı ve yatırım tek formda, tek gönderimde
- Verisi eksik dönemlerin girişimciye gösterilmesi ve yöneticinin tek tıkla toplu hatırlatma göndermesi
- Girişimciye "puanını yükseltmek için" somut adımlar, en çok puan getirenden başlayarak
- "Yatırımcıya hazır mıyım?" değerlendirmesi: profil puanından farklı olarak verinin varlığını değil, bir yatırımcı görüşmesine dayanıp dayanmadığını ölçer (trend, süreklilik, güncellik, onay durumu)
- Girişimin her sayısal verisi (ciro, ihracat, yatırım, istihdam) kendi grafiğinde: farklı birimler tek eksende ezilmesin ve eksik kalan veri boş grafiğinden görülsün
- Karar verici için interaktif dashboard: sektör dağılımı, aylık trend, yatırım türü dağılımı
- Her grafiğin altında kural tabanlı otomatik okuma (trendin yönü, yoğunlaşma riski, veri girişindeki boşluklar); aynı okumalar indirilen PDF raporuna da yazılır
- Ekosistem Etkisi panosu: tüm girişimlerin ürettiği ciro, ihracat, çekilen yatırım ve yaratılan istihdamın dönem bazında toplamı
- AI destekli ekosistem analizi ve rakip analizi (Google Gemini API)
- Girişim bazlı AI analizi: girişimciye "verilerim ne diyor" ve "nasıl geliştirebilirim", yöneticiye tekil girişim durum okuması
- Program etkisi analizi: aşama yolculuğu ile programa giriş/çıkış aşaması AI'a beslenerek "bu girişim programdan beri ne yaptı" okuması üretilir; zamanlama örtüşmesi nedensellik sayılmaz, veri yoksa bu açıkça söylenir
- Sunumu sistem dışına açan süre sınırlı, iptal edilebilir paylaşım bağlantısı (yatırımcıya gönderilebilir; yalnızca sunum ve künye görünür)
- Girişimin verisinden Sequoia pitch deck şablonuna göre otomatik sunum üretimi; veri değiştiğinde sunum "güncel değil" olarak işaretlenir ve tek tıkla yenilenir, bölümler elle düzenlenebilir (düzenlenen bölüm yeniden üretimde korunur, AI metnine geri dönülebilir) ve onaylı ciro/yatırım grafikleriyle birlikte slayt başına bir sayfa PDF olarak indirilir
- CSV ve Excel rapor export
- T3 Vakfı kurumsal renkleriyle tutarlı UI/UX
- KVKK aydınlatma metni ve gizlilik politikası sayfaları (giriş ekranı ve alt bilgiden erişilebilir)

## Dallar ve Sürümler

| Ref | Ne |
|-----|-----|
| `main` | Değişikliklerimizden önceki hâl; dokunulmadı |
| `arif-son-surum` (etiket) | `main`'in o günkü commit'ini sabitler, geri dönüş noktası |
| `feat/gemini-ai-ve-onay-onerisi` | Gemini entegrasyonu, onay önerisi akışı, aşama takibi, program etkisi analizi ve UI yenilemesi |

Projeyi devralmak için:

```bash
git clone https://github.com/zahidsr/T3VentureOS.git
cd T3VentureOS
git checkout feat/gemini-ai-ve-onay-onerisi
```

Ardından yukarıdaki **Hızlı Başlangıç** adımlarını izleyin.

Önceki sürüme dönmek gerekirse `git checkout main` yeterlidir; tek tek dosya geri almak
için `git checkout arif-son-surum -- <yol>` kullanılabilir.

## Bilinen Eksikler

- KVKK aydınlatma metni ve gizlilik politikasında hukuk tarafının dolduracağı yer
  tutucular var: `[T3 Vakfı — tam ticari unvan]`, `[kurum adresi]`, `[kvkk@kurum.org]`.
  Canlıya çıkmadan önce doldurulmalı.
- Demo verisi ve demo hesapları (`Passw0rd!`) `DbInitializer` tarafından her açılışta
  oluşturulur; üretim ortamına alınmadan önce devre dışı bırakılmalı.
