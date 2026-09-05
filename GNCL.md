1. Navigasyon: Sidebar'a geçiş
Mevcut üst Navbar (Navbar.tsx) kaldırılıp yerine sol sabit sidebar (AppShell içine entegre) getirilecek.
Sidebar daraltılabilir (collapse/expand) olacak, ikon + etiket şeklinde, aktif route vurgulanacak.
Üstte sadece: logo (küçük), kullanıcı bilgisi/avatar, tema değiştirici, çıkış butonu kalacak (ince bir topbar).
Mobilde sidebar Sheet (mevcut ui/sheet bileşeni) ile açılır/kapanır drawer'a dönüşecek.
Sidebar menü öğeleri role göre dinamik render edilecek (bkz. Madde 3).
2. Görsel dil: sade "flat" dashboard
Gölge/gradient/gereksiz dekorasyon minimuma indirilecek; düz renkler, ince border'lar, bol boşluk (whitespace) kullanılacak.
Kart bileşenleri sade: başlık + tek metrik/grafik, aşırı süsleme yok.
Tipografi ve renk paleti tek bir tasarım tokenına (mevcut Tailwind teması, t3-blue vb.) bağlı kalacak; yeni renk eklenmeyecek.
Tüm sayfalar aynı grid/layout iskeletini (sidebar + içerik alanı + sayfa başlığı) paylaşacak.
3. Rol sadeleştirme (4 → 3 rol)
Mevcut roller: SuperAdmin, ProgramYoneticisi, KararVerici, StartupKullanicisi.
Hedef: 3 role indirmek, tüm "karar verme" (onay/red) yetkisi SuperAdmin'de toplanacak.
Önerilen yeni model:
SuperAdmin — tüm yönetim + tüm onay/red kararları (satış, yatırım, başarı, doküman, güncelleme talebi, itiraz onayları dahil).
ProgramYoneticisi — operasyonel yönetim (girişim/program oluşturma, düzenleme, izleme, raporlama) ama onaylama yetkisi yok, sadece "onaya gönder/öner".
StartupKullanicisi (Girişimci) — kendi şirket profilini yönetir, veri/kayıt girer, kendi rapor/analizini görür.
KararVerici rolü kaldırılacak; bu rolün salt-okunur rapor görme yetkisi SuperAdmin'e devredilecek (gerekirse SuperAdmin altında "salt görüntüleme" alt-yetkisi/flag olarak tutulabilir, ayrı rol olmayacak).
Backend tarafında: UserRole enum'ı, ProtectedRoute roles={[...]} tanımları, [Authorize(Roles=...)] attribute'ları ve OnayKararRequest işleyen endpoint'lerin yetki kontrolleri bu 3 role göre güncellenecek.
Mevcut KararVerici kullanıcıların migration'ı: DB'de rol güncelleme script'i hazırlanacak (var olan kullanıcılar SuperAdmin ya da yeni salt-okunur flag'e taşınacak — karar verilmesi gereken nokta, onaylanacak).
4. Özelliklerin sidebar'a taşınması
Şu an route bazlı erişilen tüm özellikler (Girişimler, Programlar, Onaylar, Kullanıcılar, İşlem Geçmişi, Girişimim, Rapor) sidebar menü öğesi olacak, role göre filtrelenecek liste (mevcut navItemsForRole mantığı sidebar'a taşınacak ve 3 rol yapısına göre yeniden yazılacak).
Yeni eklenecek özellikler de (Madde 5-11) sidebar'da kendi bölümlerinde yer alacak, gerektiğinde alt-menü (nested item) desteği eklenecek (ör. "Raporlama" ana başlığı altında "Genel Bakış", "Sektörel Analiz", "Rakip Karşılaştırma").
5. Admin tarafı analiz & raporlama
SuperAdmin paneline özel genişletilmiş bir Analiz & Raporlama modülü:
Genel KPI'lar (toplam girişim, aktif program, bekleyen onay, toplam ciro/yatırım — mevcut DashboardStatsDto genişletilecek).
Sektörel dağılım, yatırım türü dağılımı, aylık ciro/yatırım trendleri (mevcut alanlar, sidebar altında ayrı bir sayfa olarak).
Filtrelenebilir raporlar: tarih aralığı, sektör, program, girişim bazında.
Dışa aktarma: PDF/Excel export butonu.
Mevcut AI analiz metni (AiAnalizDto/AiAnalizKaydiDto) bu modülün içine entegre edilecek, geçmiş analizler listelenecek.
6. Girişimci tarafı kendi analiz & raporlama alanı
StartupKullanicisi rolü için "Girişimim" sayfası altına kendi analiz/rapor sekmesi eklenecek:
Kendi ciro/yatırım trend grafiği (zaman serisi, mevcut SatisKaydiDto/YatirimKaydiDto verilerinden).
Program katılım geçmişi özeti.
Onay durumu takibi (bekleyen/onaylı/reddedilen kayıtlar).
Girişimci kendi rapor görünümünü özelleştirebilecek (gösterilecek metrikleri seçme, tarih aralığı filtreleme).
7. Şirket tanıtım sunumu + iletişim profili
Girişim detay sayfasına (GirisimDetails) yeni bir bölüm:
Şirket tanıtım sunumu yükleme/görüntüleme (PDF/PPT dosya, mevcut DokumanDto yapısı genişletilerek "Sunum" tipi doküman kategorisi eklenecek).
SuperAdmin ve ProgramYöneticisi bu sunumu görüntüleyebilecek/indirebilecek (hatırlatma amaçlı, ör. yatırımcı görüşmesi öncesi hızlı bakış).
Muhatap/iletişim bilgisi kartı: yetkili kişi adı, unvanı, telefon, e-posta, (opsiyonel) LinkedIn — yeni bir GirisimContact alt-varlığı (backend: yeni entity/tablo, DTO: GirisimContactDto, CRUD endpoint'leri girişimci tarafından güncellenebilir).
8. Sektörel rakip kıyaslama (filtrelenebilir)
Girişim detay/rapor sayfasında "Rakip Karşılaştırma" paneli:
Kullanıcı (SuperAdmin/ProgramYöneticisi/çalışan) filtre seçebilecek: sektör, kuruluş yılı aralığı, ekip büyüklüğü, ciro aralığı, yatırım aralığı gibi kriterlerle karşılaştırılacak girişim setini seçer.
Seçilen girişimler yan yana tablo/grafikte kıyaslanır (ciro, yatırım, ekip büyüklüğü, büyüme trendi vb. metrikler — mevcut GirisimSummaryDto/GirisimDetailDto alanları temel alınacak).
Kullanıcı hangi metrikleri göstereceğini seçebilecek (dinamik kolon seçimi).
9. "T3 KYS ile Giriş Yap" butonu
Login sayfasına (Login.tsx) T3 KYS kurumsal kimlik doğrulama sistemiyle giriş yapmayı simgeleyen bir buton eklenecek.
İlk aşamada bu bir UI placeholder/entegrasyon noktası olacak (gerçek SSO entegrasyonu ayrı bir teknik görüşme/protokol netleşmeden yapılamaz — OAuth2/SAML gibi hangi protokolün kullanılacağı T3 KYS tarafından netleştirilmeli).
Buton, mevcut e-posta/şifre formunun üstünde veya "veya" ayracıyla ayrı bir seçenek olarak gösterilecek; tıklanınca ileride gerçek SSO redirect flow'una bağlanacak bir handler'a sahip olacak.
10. Şirket "CV"si — otomatik profil çıktısı
Girişimci kendi profilini güncel tuttukça, tek tıkla PDF "Şirket CV"si oluşturabilecek:
İçerik: şirket özeti, sektör, kuruluş yılı, ekip büyüklüğü, iletişim/muhatap bilgisi, gelişim adımları (GelisimAdimiDto), onaylı satış/yatırım özetleri, başarılar, program katılım geçmişi.
"Girişimim" sayfasına "CV'yi İndir (PDF)" butonu eklenecek; backend'de bir rapor render servisi (ör. HTML→PDF, örn. mevcut stack'te kullanılan bir kütüphane araştırılacak) gerekecek.
11. Detaylı rakip analizi
Madde 8'deki temel kıyaslamanın ötesinde, SuperAdmin/ProgramYöneticisi için derinlemesine rakip analiz raporu:
Seçilen girişim + rakip seti için SWOT benzeri karşılaştırma, pazar payı tahmini (varsa veri), büyüme oranı karşılaştırması, yatırım/ciro trend grafiklerinin üst üste bindirilmesi.
Mümkünse AI destekli otomatik özet (mevcut AiAnalizDto altyapısı bu senaryo için genişletilebilir: "rakip analizi" promptu ile ayrı bir AI analiz türü).
Rapor PDF olarak dışa aktarılabilir olacak.