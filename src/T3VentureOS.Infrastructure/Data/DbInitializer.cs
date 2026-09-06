using T3VentureOS.Domain;
using T3VentureOS.Domain.Entities;
using T3VentureOS.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;

namespace T3VentureOS.Infrastructure.Data;

/// <summary>Seeds one user per role plus a sample program/startup so the app is usable right after first run.</summary>
public static class DbInitializer
{
    public const string SuperAdminEmail = "superadmin@t3ventureos.local";
    public const string ProgramYoneticisiEmail = "program@t3vakfi.local";
    public const string SecondSuperAdminEmail = "karar@t3vakfi.local";
    public const string StartupEmail = "girisim@t3vakfi.local";
    public const string DemoPassword = "Passw0rd!";

    /// <summary>
    /// Puan alanı sonradan eklendiği için mevcut girişimlerin puanı sıfır kalmıştı; açılışta bir
    /// kez tazelenir. Boş bir kaydetme, AppDbContext'teki puan tazeleme kancasını tetikler.
    /// </summary>
    public static async Task PuanlariTazeleAsync(AppDbContext db)
    {
        var girisimler = await db.Girisimler.ToListAsync();
        if (girisimler.Count == 0) return;

        foreach (var g in girisimler) db.Entry(g).Property(x => x.UpdatedAt).IsModified = true;
        await db.SaveChangesAsync();
    }

    /// <summary>
    /// İstihdam kayıtları sonradan eklendi; mevcut girişimlerin ciro geçmişinden tutarlı bir
    /// istihdam hikâyesi üretilir. Çalışan sayısı bugünkü ekip büyüklüğüne doğru büyür ve en çok
    /// artışı cironun en çok sıçradığı dönemde yapar — grafikte ciro ile istihdam birlikte okunsun.
    /// </summary>
    public static async Task SeedIstihdamAsync(AppDbContext db)
    {
        var girisimler = await db.Girisimler
            .Include(g => g.SatisKayitlari.Where(x => x.OnayDurumu == OnayDurumu.Onaylandi))
            .Where(g => !db.IstihdamKayitlari.Any(i => i.GirisimId == g.Id))
            .ToListAsync();
        if (girisimler.Count == 0) return;

        var pmId = await db.Users.Where(u => u.Role == UserRole.ProgramYoneticisi).Select(u => u.Id).FirstOrDefaultAsync();
        if (pmId == Guid.Empty) return;

        foreach (var girisim in girisimler)
        {
            var donemler = girisim.SatisKayitlari.OrderBy(s => s.Donem).ToList();
            if (donemler.Count == 0) continue;

            var bugunkuEkip = girisim.EkipBuyuklugu ?? 6;
            // Başlangıç kadrosu: bugünkü ekibin yaklaşık yarısı, en az iki kişi.
            var baslangic = Math.Max(2, bugunkuEkip / 2);
            var buyume = bugunkuEkip - baslangic;

            // Ciro artışlarının payına göre işe alım dağıt: en çok büyüyen dönem en çok alım yapar.
            var artislar = donemler
                .Select((d, i) => Math.Max(0m, d.Ciro - (i == 0 ? 0 : donemler[i - 1].Ciro)))
                .ToList();
            var toplamArtis = artislar.Sum();

            var calisan = baslangic;
            for (var i = 0; i < donemler.Count; i++)
            {
                var pay = toplamArtis > 0 ? (int)Math.Round(buyume * (artislar[i] / toplamArtis)) : 0;
                var yeniAlim = i == 0 ? 0 : pay;
                calisan += yeniAlim;

                db.IstihdamKayitlari.Add(new IstihdamKaydi
                {
                    GirisimId = girisim.Id,
                    Donem = donemler[i].Donem,
                    CalisanSayisi = calisan,
                    YeniIseAlim = yeniAlim > 0 ? yeniAlim : null,
                    OnayDurumu = OnayDurumu.Onaylandi,
                    SubmittedById = pmId,
                    ReviewedById = pmId,
                    CreatedAt = donemler[i].CreatedAt,
                });
            }
        }

        await db.SaveChangesAsync();
    }

    /// <summary>
    /// Aşama geçişleri sonradan eklendi; mevcut girişimler için ciro ve program geçmişinden
    /// tutarlı bir yolculuk üretilir. Amaç demo verisinin bir hikâye anlatması: girişim programa
    /// erken aşamada girer, program sırasında ilerler, ilk müşterisini/ölçeklenmesini o dönemde
    /// kaydeder.
    /// </summary>
    public static async Task SeedAsamaGecisleriAsync(AppDbContext db)
    {
        var pmId = await db.Users.Where(u => u.Role == UserRole.ProgramYoneticisi).Select(u => u.Id).FirstOrDefaultAsync();
        if (pmId == Guid.Empty) return;

        var girisimler = await db.Girisimler
            .Include(g => g.SatisKayitlari.Where(x => x.OnayDurumu == OnayDurumu.Onaylandi))
            .Include(g => g.YatirimKayitlari.Where(x => x.OnayDurumu == OnayDurumu.Onaylandi))
            .Include(g => g.ProgramKatilimlari)
            .Where(g => !db.AsamaGecisleri.Any(a => a.GirisimId == g.Id))
            .ToListAsync();
        if (girisimler.Count == 0) return;

        foreach (var girisim in girisimler)
        {
            var kurulus = new DateTime(girisim.KurulusYili ?? DateTime.UtcNow.Year - 2, 1, 15);
            var satislar = girisim.SatisKayitlari.OrderBy(s => s.Donem).ToList();
            var ilkKatilim = girisim.ProgramKatilimlari.OrderBy(k => k.BaslangicTarihi).FirstOrDefault();

            var yolculuk = new List<(GirisimAsamasi Asama, DateTime Tarih, string Aciklama)>
            {
                (GirisimAsamasi.Fikir, kurulus, "Girişim kuruldu."),
                (GirisimAsamasi.Prototip, kurulus.AddMonths(5), "İlk çalışan prototip tamamlandı."),
            };

            // Programa katılım, MVP eşiğinin hemen öncesine denk getirilir: program etkisi görünsün.
            if (ilkKatilim is not null)
                yolculuk.Add((GirisimAsamasi.MVP, ilkKatilim.BaslangicTarihi.AddDays(20), "Program sürecinde MVP yayına alındı."));

            // İlk onaylı ciro = ilk müşteri.
            if (satislar.Count > 0 && ProgramKohortService.DonemBaslangici(satislar[0].Donem) is { } ilkCiroTarihi)
                yolculuk.Add((GirisimAsamasi.IlkMusteri, ilkCiroTarihi.AddDays(25), "İlk ticari müşteri kazanıldı."));

            // Üç dönemden fazla ciro geçmişi olan girişimler ölçeklenmeye geçmiş sayılır.
            if (satislar.Count >= 3 && ProgramKohortService.DonemBaslangici(satislar[2].Donem) is { } olceklemeTarihi)
                yolculuk.Add((GirisimAsamasi.Olcekleme, olceklemeTarihi.AddDays(15), "Düzenli gelir akışı ve ekip büyümesi."));

            // Seri A ve sonrası yatırım almışsa büyüme aşaması.
            var buyumeTuru = girisim.YatirimKayitlari
                .Where(y => y.Tur is YatirimTuru.SeriA or YatirimTuru.SeriB or YatirimTuru.SeriSonrasi)
                .OrderBy(y => y.Tarih)
                .FirstOrDefault();
            if (buyumeTuru is not null)
                yolculuk.Add((GirisimAsamasi.Buyume, buyumeTuru.Tarih.AddDays(10), $"{buyumeTuru.Tur} turu tamamlandı."));

            // Tarihe göre sıralamak yetmez: olgunluk ekseninde geriye giden adımlar elenir, yoksa
            // programa geç katılan olgun bir girişim "Büyüme'den MVP'ye düştü" gibi görünür.
            yolculuk = yolculuk
                .OrderBy(x => x.Tarih)
                .Aggregate(new List<(GirisimAsamasi Asama, DateTime Tarih, string Aciklama)>(), (liste, adim) =>
                {
                    if (liste.Count == 0 || adim.Asama > liste[^1].Asama) liste.Add(adim);
                    return liste;
                });

            GirisimAsamasi? onceki = null;
            foreach (var adim in yolculuk)
            {
                db.AsamaGecisleri.Add(new AsamaGecisi
                {
                    GirisimId = girisim.Id,
                    OncekiAsama = onceki,
                    YeniAsama = adim.Asama,
                    Tarih = adim.Tarih,
                    Aciklama = adim.Aciklama,
                    DegistirenId = pmId,
                    CreatedAt = adim.Tarih,
                });
                onceki = adim.Asama;
            }

            girisim.Asama = yolculuk[^1].Asama;

            // Program giriş/çıkış fotoğrafları geçmişe göre doldurulur.
            foreach (var katilim in girisim.ProgramKatilimlari)
            {
                var gecisler = yolculuk
                    .Select(a => new AsamaGecisi { Tarih = a.Tarih, YeniAsama = a.Asama })
                    .ToList();
                katilim.BaslangictakiAsama ??= AsamaService.TarihtekiAsama(gecisler, katilim.BaslangicTarihi);
                if (katilim.Durum is KatilimDurumu.Mezun or KatilimDurumu.Ayrildi && katilim.BitisTarihi is { } bitis)
                    katilim.BitistekiAsama ??= AsamaService.TarihtekiAsama(gecisler, bitis);
            }
        }

        await db.SaveChangesAsync();
    }

    public static async Task SeedAsync(AppDbContext db)
    {
        if (db.Database.IsRelational())
            await db.Database.MigrateAsync();

        if (await db.Users.AnyAsync()) return;

        var hasher = new PasswordHasherService();

        var superAdmin = MakeUser(SuperAdminEmail, "Süper Admin", UserRole.SuperAdmin, hasher);
        var programYoneticisi = MakeUser(ProgramYoneticisiEmail, "Program Yöneticisi", UserRole.ProgramYoneticisi, hasher);
        var secondSuperAdmin = MakeUser(SecondSuperAdminEmail, "Süper Admin (İkincil)", UserRole.SuperAdmin, hasher);
        db.Users.AddRange(superAdmin, programYoneticisi, secondSuperAdmin);

        var program = new GirisimProgrami
        {
            Name = "T3 Girişim Hızlandırma Programı 2026",
            Description = "Erken aşama teknoloji girişimlerini yatırıma hazırlayan T3 Vakfı hızlandırma programı.",
            Durum = ProgramDurumu.Aktif,
            BaslangicTarihi = DateTime.UtcNow.AddMonths(-3),
            BitisTarihi = DateTime.UtcNow.AddMonths(3),
            CreatedById = programYoneticisi.Id,
        };
        db.Programlar.Add(program);

        var girisim = new Girisim
        {
            Ad = "Örnek Teknoloji A.Ş.",
            Sektor = "Yapay Zekâ",
            KisaTanim = "Endüstriyel üretim hatları için görüntü işleme tabanlı kalite kontrol çözümü geliştiren bir derin teknoloji girişimi.",
            Teknoloji = "Bilgisayarlı Görü, Edge AI",
            WebsiteUrl = "https://ornek-teknoloji.example",
            KurulusYili = 2023,
            EkipBuyuklugu = 6,
            CreatedById = programYoneticisi.Id,
        };
        db.Girisimler.Add(girisim);

        var startupKullanicisi = MakeUser(StartupEmail, "Girişim Temsilcisi", UserRole.StartupKullanicisi, hasher);
        startupKullanicisi.GirisimId = girisim.Id;
        db.Users.Add(startupKullanicisi);

        db.ProgramKatilimlari.Add(new ProgramKatilimi
        {
            GirisimId = girisim.Id,
            ProgramId = program.Id,
            Donem = "2026 Bahar Dönemi",
            Durum = KatilimDurumu.DevamEdiyor,
            BaslangicTarihi = DateTime.UtcNow.AddMonths(-2),
        });

        db.GelisimAdimlari.AddRange(
            new GelisimAdimi { GirisimId = girisim.Id, Tarih = DateTime.UtcNow.AddMonths(-2), Baslik = "Programa kabul edildi", CreatedById = programYoneticisi.Id },
            new GelisimAdimi { GirisimId = girisim.Id, Tarih = DateTime.UtcNow.AddMonths(-1), Baslik = "İlk pilot müşteri anlaşması imzalandı", CreatedById = programYoneticisi.Id });

        db.SatisKayitlari.Add(new SatisKaydi
        {
            GirisimId = girisim.Id,
            Donem = "2026-Q1",
            Ciro = 450000,
            Ihracat = 0,
            OnayDurumu = OnayDurumu.Onaylandi,
            SubmittedById = startupKullanicisi.Id,
            ReviewedById = programYoneticisi.Id,
        });

        db.YatirimKayitlari.Add(new YatirimKaydi
        {
            GirisimId = girisim.Id,
            Tur = YatirimTuru.OnTohum,
            Tutar = 2000000,
            ParaBirimi = "TRY",
            Tarih = DateTime.UtcNow.AddMonths(-4),
            YatirimciAdi = "Örnek Melek Yatırımcı Ağı",
            OnayDurumu = OnayDurumu.Onaylandi,
            SubmittedById = startupKullanicisi.Id,
            ReviewedById = programYoneticisi.Id,
        });

        db.Basarilar.Add(new Basari
        {
            GirisimId = girisim.Id,
            Tur = BasariTuru.Hibe,
            Baslik = "TÜBİTAK 1512 BiGG Hibe Desteği",
            Aciklama = "Erken aşama girişimcilik hibe programından destek alındı.",
            Tarih = DateTime.UtcNow.AddMonths(-3),
            OnayDurumu = OnayDurumu.Onaylandi,
            SubmittedById = startupKullanicisi.Id,
            ReviewedById = programYoneticisi.Id,
        });

        await db.SaveChangesAsync();
    }

    private static User MakeUser(string email, string fullName, UserRole role, PasswordHasherService hasher)
    {
        var user = new User { Email = email, FullName = fullName, Role = role, Status = UserStatus.Active, EmailVerified = true };
        user.PasswordHash = hasher.Hash(user, DemoPassword);
        return user;
    }

    /// <summary>
    /// Adds realistic demo girişimler and programs so dashboards/reports look meaningful.
    /// Idempotent — skips if there are already 5+ girişimler in the database.
    /// </summary>
    public static async Task SeedDemoExtrasAsync(AppDbContext db)
    {
        if (await db.Girisimler.CountAsync() >= 5) return;

        var adminId = await db.Users
            .Where(u => u.Role == UserRole.SuperAdmin)
            .Select(u => u.Id)
            .FirstOrDefaultAsync();

        var pmId = await db.Users
            .Where(u => u.Role == UserRole.ProgramYoneticisi)
            .Select(u => u.Id)
            .FirstOrDefaultAsync();

        if (adminId == Guid.Empty || pmId == Guid.Empty) return;

        // ─── Ek Programlar ──────────────────────────────────────────
        var cleantech = new GirisimProgrami
        {
            Name = "T3 CleanTech Hızlandırma 2025",
            Description = "Sürdürülebilir enerji ve çevre teknolojileri alanındaki erken aşama girişimlere yönelik hızlandırma programı.",
            Durum = ProgramDurumu.Tamamlandi,
            BaslangicTarihi = DateTime.UtcNow.AddMonths(-12),
            BitisTarihi = DateTime.UtcNow.AddMonths(-3),
            CreatedById = pmId,
        };

        var fintech = new GirisimProgrami
        {
            Name = "T3 FinTech Yatırıma Hazırlık Programı",
            Description = "Fintech girişimlerini seri A yatırım turuna hazırlayan 4 aylık yoğun mentörlük programı.",
            Durum = ProgramDurumu.Aktif,
            BaslangicTarihi = DateTime.UtcNow.AddMonths(-1),
            BitisTarihi = DateTime.UtcNow.AddMonths(3),
            CreatedById = pmId,
        };
        db.Programlar.AddRange(cleantech, fintech);

        // ─── Girişim 2: EkoFlow ──────────────────────────────────────
        var ekoflow = new Girisim
        {
            Ad = "EkoFlow Enerji Teknolojileri",
            Sektor = "Yeşil Enerji",
            KisaTanim = "Yapay zekâ destekli akıllı bina enerji yönetim sistemi geliştiren iklim teknolojisi girişimi.",
            Teknoloji = "IoT, Makine Öğrenmesi, Edge Computing",
            WebsiteUrl = "https://ekoflow.example",
            KurulusYili = 2022,
            EkipBuyuklugu = 11,
            CreatedById = pmId,
        };
        db.Girisimler.Add(ekoflow);

        // ─── Girişim 3: MediTrack ────────────────────────────────────
        var meditrack = new Girisim
        {
            Ad = "MediTrack Sağlık Sistemleri",
            Sektor = "Sağlık Teknolojisi",
            KisaTanim = "Hastane ve eczaneler için bulut tabanlı ilaç takip ve hasta yönetim platformu.",
            Teknoloji = "React Native, .NET, Azure",
            WebsiteUrl = "https://meditrack.example",
            KurulusYili = 2021,
            EkipBuyuklugu = 18,
            CreatedById = pmId,
        };
        db.Girisimler.Add(meditrack);

        // ─── Girişim 4: AgriSense ────────────────────────────────────
        var agrisense = new Girisim
        {
            Ad = "AgriSense Tarım Teknolojileri",
            Sektor = "AgriTech",
            KisaTanim = "Toprak nem, sıcaklık ve bitki sağlığını izleyen kablosuz sensör ağı ve analitik platformu.",
            Teknoloji = "LoRaWAN, IoT, Python, React",
            WebsiteUrl = "https://agrisense.example",
            KurulusYili = 2023,
            EkipBuyuklugu = 8,
            CreatedById = pmId,
        };
        db.Girisimler.Add(agrisense);

        // ─── Girişim 5: CyberShield ──────────────────────────────────
        var cybershield = new Girisim
        {
            Ad = "CyberShield Güvenlik",
            Sektor = "Siber Güvenlik",
            KisaTanim = "KOBİ'lere yönelik yapay zekâ destekli tehdit algılama ve önleme SaaS platformu.",
            Teknoloji = "Python, Kafka, Elasticsearch, React",
            WebsiteUrl = "https://cybershield.example",
            KurulusYili = 2022,
            EkipBuyuklugu = 14,
            CreatedById = adminId,
        };
        db.Girisimler.Add(cybershield);

        // ─── Girişim 6: LogiOptim ────────────────────────────────────
        var logioptim = new Girisim
        {
            Ad = "LogiOptim Lojistik Çözümleri",
            Sektor = "Lojistik Tech",
            KisaTanim = "Filo yönetimi ve gerçek zamanlı rota optimizasyonu sağlayan B2B SaaS lojistik platformu.",
            Teknoloji = "TypeScript, Go, PostgreSQL, Google Maps API",
            WebsiteUrl = "https://logioptim.example",
            KurulusYili = 2020,
            EkipBuyuklugu = 22,
            CreatedById = adminId,
        };
        db.Girisimler.Add(logioptim);

        // SaveChanges so IDs are assigned before we create related records
        await db.SaveChangesAsync();

        // ─── Program Katılımları ─────────────────────────────────────
        db.ProgramKatilimlari.AddRange(
            new ProgramKatilimi
            {
                GirisimId = ekoflow.Id, ProgramId = cleantech.Id,
                Donem = "2025 Güz Dönemi", Durum = KatilimDurumu.Mezun,
                BaslangicTarihi = cleantech.BaslangicTarihi!.Value,
                BitisTarihi = cleantech.BitisTarihi,
            },
            new ProgramKatilimi
            {
                GirisimId = meditrack.Id, ProgramId = cleantech.Id,
                Donem = "2025 Güz Dönemi", Durum = KatilimDurumu.Mezun,
                BaslangicTarihi = cleantech.BaslangicTarihi!.Value,
                BitisTarihi = cleantech.BitisTarihi,
            },
            new ProgramKatilimi
            {
                GirisimId = cybershield.Id, ProgramId = fintech.Id,
                Donem = "2026 Bahar Dönemi", Durum = KatilimDurumu.DevamEdiyor,
                BaslangicTarihi = fintech.BaslangicTarihi!.Value,
            },
            new ProgramKatilimi
            {
                GirisimId = logioptim.Id, ProgramId = fintech.Id,
                Donem = "2026 Bahar Dönemi", Durum = KatilimDurumu.DevamEdiyor,
                BaslangicTarihi = fintech.BaslangicTarihi!.Value,
            },
            new ProgramKatilimi
            {
                GirisimId = agrisense.Id, ProgramId = fintech.Id,
                Donem = "2026 Bahar Dönemi", Durum = KatilimDurumu.Basvuru,
                BaslangicTarihi = DateTime.UtcNow.AddDays(-5),
            });

        // ─── Gelişim Adımları ────────────────────────────────────────
        db.GelisimAdimlari.AddRange(
            new GelisimAdimi { GirisimId = ekoflow.Id, Tarih = DateTime.UtcNow.AddMonths(-10), Baslik = "MVP lansmanı gerçekleştirildi", CreatedById = pmId },
            new GelisimAdimi { GirisimId = ekoflow.Id, Tarih = DateTime.UtcNow.AddMonths(-6), Baslik = "İlk kurumsal müşteri sözleşmesi (AVM zinciri)", CreatedById = pmId },
            new GelisimAdimi { GirisimId = ekoflow.Id, Tarih = DateTime.UtcNow.AddMonths(-2), Baslik = "AB Horizon hibesi başvurusu yapıldı", CreatedById = pmId },

            new GelisimAdimi { GirisimId = meditrack.Id, Tarih = DateTime.UtcNow.AddMonths(-14), Baslik = "Sağlık Bakanlığı entegrasyon sertifikası alındı", CreatedById = pmId },
            new GelisimAdimi { GirisimId = meditrack.Id, Tarih = DateTime.UtcNow.AddMonths(-8), Baslik = "50. hastane müşterisine ulaşıldı", CreatedById = pmId },
            new GelisimAdimi { GirisimId = meditrack.Id, Tarih = DateTime.UtcNow.AddMonths(-3), Baslik = "Azerbaycan pazarına açılım anlaşması imzalandı", CreatedById = pmId },

            new GelisimAdimi { GirisimId = cybershield.Id, Tarih = DateTime.UtcNow.AddMonths(-5), Baslik = "SOC 2 Tip II sertifikası alındı", CreatedById = adminId },
            new GelisimAdimi { GirisimId = cybershield.Id, Tarih = DateTime.UtcNow.AddMonths(-2), Baslik = "KOSGEB Ar-Ge desteği kazanıldı", CreatedById = adminId },

            new GelisimAdimi { GirisimId = logioptim.Id, Tarih = DateTime.UtcNow.AddMonths(-18), Baslik = "100. kurumsal müşteriye ulaşıldı", CreatedById = adminId },
            new GelisimAdimi { GirisimId = logioptim.Id, Tarih = DateTime.UtcNow.AddMonths(-7), Baslik = "Almanya pazarına açıldı", CreatedById = adminId },
            new GelisimAdimi { GirisimId = logioptim.Id, Tarih = DateTime.UtcNow.AddMonths(-1), Baslik = "Seri A hazırlık süreci başlatıldı", CreatedById = adminId },

            new GelisimAdimi { GirisimId = agrisense.Id, Tarih = DateTime.UtcNow.AddMonths(-4), Baslik = "Pilot tarım alanı tamamlandı (500 dönüm)", CreatedById = pmId });

        // ─── Satış Kayıtları ─────────────────────────────────────────
        var now = DateTime.UtcNow;
        db.SatisKayitlari.AddRange(
            // EkoFlow
            new SatisKaydi { GirisimId = ekoflow.Id, Donem = "2025-Q3", Ciro = 820000, Ihracat = 0, OnayDurumu = OnayDurumu.Onaylandi, SubmittedById = pmId, ReviewedById = pmId, CreatedAt = now.AddMonths(-9) },
            new SatisKaydi { GirisimId = ekoflow.Id, Donem = "2025-Q4", Ciro = 1150000, Ihracat = 0, OnayDurumu = OnayDurumu.Onaylandi, SubmittedById = pmId, ReviewedById = pmId, CreatedAt = now.AddMonths(-6) },
            new SatisKaydi { GirisimId = ekoflow.Id, Donem = "2026-Q1", Ciro = 1480000, Ihracat = 220000, OnayDurumu = OnayDurumu.Onaylandi, SubmittedById = pmId, ReviewedById = pmId, CreatedAt = now.AddMonths(-3) },
            new SatisKaydi { GirisimId = ekoflow.Id, Donem = "2026-Q2", Ciro = 950000, Ihracat = 150000, OnayDurumu = OnayDurumu.Beklemede, SubmittedById = pmId, CreatedAt = now.AddDays(-10) },

            // MediTrack
            new SatisKaydi { GirisimId = meditrack.Id, Donem = "2025-Q2", Ciro = 2100000, Ihracat = 0, OnayDurumu = OnayDurumu.Onaylandi, SubmittedById = pmId, ReviewedById = pmId, CreatedAt = now.AddMonths(-12) },
            new SatisKaydi { GirisimId = meditrack.Id, Donem = "2025-Q3", Ciro = 2650000, Ihracat = 0, OnayDurumu = OnayDurumu.Onaylandi, SubmittedById = pmId, ReviewedById = pmId, CreatedAt = now.AddMonths(-9) },
            new SatisKaydi { GirisimId = meditrack.Id, Donem = "2025-Q4", Ciro = 3200000, Ihracat = 480000, OnayDurumu = OnayDurumu.Onaylandi, SubmittedById = pmId, ReviewedById = pmId, CreatedAt = now.AddMonths(-6) },
            new SatisKaydi { GirisimId = meditrack.Id, Donem = "2026-Q1", Ciro = 3750000, Ihracat = 640000, OnayDurumu = OnayDurumu.Onaylandi, SubmittedById = pmId, ReviewedById = pmId, CreatedAt = now.AddMonths(-3) },
            new SatisKaydi { GirisimId = meditrack.Id, Donem = "2026-Q2", Ciro = 1900000, Ihracat = 320000, OnayDurumu = OnayDurumu.Beklemede, SubmittedById = pmId, CreatedAt = now.AddDays(-7) },

            // CyberShield
            new SatisKaydi { GirisimId = cybershield.Id, Donem = "2025-Q4", Ciro = 960000, Ihracat = 0, OnayDurumu = OnayDurumu.Onaylandi, SubmittedById = adminId, ReviewedById = pmId, CreatedAt = now.AddMonths(-6) },
            new SatisKaydi { GirisimId = cybershield.Id, Donem = "2026-Q1", Ciro = 1320000, Ihracat = 0, OnayDurumu = OnayDurumu.Onaylandi, SubmittedById = adminId, ReviewedById = pmId, CreatedAt = now.AddMonths(-3) },
            new SatisKaydi { GirisimId = cybershield.Id, Donem = "2026-Q2", Ciro = 780000, Ihracat = 0, OnayDurumu = OnayDurumu.Beklemede, SubmittedById = adminId, CreatedAt = now.AddDays(-14) },

            // LogiOptim
            new SatisKaydi { GirisimId = logioptim.Id, Donem = "2025-Q1", Ciro = 4500000, Ihracat = 1200000, OnayDurumu = OnayDurumu.Onaylandi, SubmittedById = adminId, ReviewedById = pmId, CreatedAt = now.AddMonths(-15) },
            new SatisKaydi { GirisimId = logioptim.Id, Donem = "2025-Q2", Ciro = 5200000, Ihracat = 1650000, OnayDurumu = OnayDurumu.Onaylandi, SubmittedById = adminId, ReviewedById = pmId, CreatedAt = now.AddMonths(-12) },
            new SatisKaydi { GirisimId = logioptim.Id, Donem = "2025-Q3", Ciro = 6100000, Ihracat = 2100000, OnayDurumu = OnayDurumu.Onaylandi, SubmittedById = adminId, ReviewedById = pmId, CreatedAt = now.AddMonths(-9) },
            new SatisKaydi { GirisimId = logioptim.Id, Donem = "2025-Q4", Ciro = 7300000, Ihracat = 2800000, OnayDurumu = OnayDurumu.Onaylandi, SubmittedById = adminId, ReviewedById = pmId, CreatedAt = now.AddMonths(-6) },
            new SatisKaydi { GirisimId = logioptim.Id, Donem = "2026-Q1", Ciro = 8100000, Ihracat = 3200000, OnayDurumu = OnayDurumu.Onaylandi, SubmittedById = adminId, ReviewedById = pmId, CreatedAt = now.AddMonths(-3) },

            // AgriSense
            new SatisKaydi { GirisimId = agrisense.Id, Donem = "2026-Q1", Ciro = 280000, Ihracat = 0, OnayDurumu = OnayDurumu.Beklemede, SubmittedById = pmId, CreatedAt = now.AddDays(-20) });

        // ─── Yatırım Kayıtları ───────────────────────────────────────
        db.YatirimKayitlari.AddRange(
            // EkoFlow — Tohum turu
            new YatirimKaydi
            {
                GirisimId = ekoflow.Id, Tur = YatirimTuru.Tohum, Tutar = 5000000, ParaBirimi = "TRY",
                Tarih = now.AddMonths(-8), YatirimciAdi = "Boğaziçi Girişim Fonu",
                OnayDurumu = OnayDurumu.Onaylandi, SubmittedById = pmId, ReviewedById = pmId, CreatedAt = now.AddMonths(-8),
            },
            // MediTrack — Seri A
            new YatirimKaydi
            {
                GirisimId = meditrack.Id, Tur = YatirimTuru.SeriA, Tutar = 25000000, ParaBirimi = "TRY",
                Tarih = now.AddMonths(-10), YatirimciAdi = "Delta Ventures",
                OnayDurumu = OnayDurumu.Onaylandi, SubmittedById = pmId, ReviewedById = pmId, CreatedAt = now.AddMonths(-10),
            },
            new YatirimKaydi
            {
                GirisimId = meditrack.Id, Tur = YatirimTuru.Hibe, Tutar = 2500000, ParaBirimi = "TRY",
                Tarih = now.AddMonths(-5), YatirimciAdi = "TÜBİTAK TEYDEB",
                OnayDurumu = OnayDurumu.Onaylandi, SubmittedById = pmId, ReviewedById = pmId, CreatedAt = now.AddMonths(-5),
            },
            // CyberShield — Ön Tohum
            new YatirimKaydi
            {
                GirisimId = cybershield.Id, Tur = YatirimTuru.OnTohum, Tutar = 1500000, ParaBirimi = "TRY",
                Tarih = now.AddMonths(-7), YatirimciAdi = "Teknoloji Melek Ağı",
                OnayDurumu = OnayDurumu.Onaylandi, SubmittedById = adminId, ReviewedById = pmId, CreatedAt = now.AddMonths(-7),
            },
            new YatirimKaydi
            {
                GirisimId = cybershield.Id, Tur = YatirimTuru.Tohum, Tutar = 8000000, ParaBirimi = "TRY",
                Tarih = now.AddMonths(-2), YatirimciAdi = "Güvenlik Odaklı Fon II",
                OnayDurumu = OnayDurumu.Beklemede, SubmittedById = adminId, CreatedAt = now.AddDays(-12),
            },
            // LogiOptim — Seri B
            new YatirimKaydi
            {
                GirisimId = logioptim.Id, Tur = YatirimTuru.SeriB, Tutar = 80000000, ParaBirimi = "TRY",
                Tarih = now.AddMonths(-9), YatirimciAdi = "Lojistik Büyüme Fonu & Co-investors",
                OnayDurumu = OnayDurumu.Onaylandi, SubmittedById = adminId, ReviewedById = pmId, CreatedAt = now.AddMonths(-9),
            },
            // AgriSense — Hibe (beklemede)
            new YatirimKaydi
            {
                GirisimId = agrisense.Id, Tur = YatirimTuru.Hibe, Tutar = 750000, ParaBirimi = "TRY",
                Tarih = now.AddMonths(-1), YatirimciAdi = "Tarım ve Orman Bakanlığı Destek Programı",
                OnayDurumu = OnayDurumu.Beklemede, SubmittedById = pmId, CreatedAt = now.AddDays(-18),
            });

        // ─── Başarılar ───────────────────────────────────────────────
        db.Basarilar.AddRange(
            new Basari { GirisimId = ekoflow.Id, Tur = BasariTuru.Odul, Baslik = "Cleantech Open Türkiye 2025 Birincisi", Tarih = now.AddMonths(-7), OnayDurumu = OnayDurumu.Onaylandi, SubmittedById = pmId, ReviewedById = pmId, CreatedAt = now.AddMonths(-7) },
            new Basari { GirisimId = ekoflow.Id, Tur = BasariTuru.Hibe, Baslik = "EBRD Yeşil Ekonomi Finansman Aracı", Tarih = now.AddMonths(-4), OnayDurumu = OnayDurumu.Onaylandi, SubmittedById = pmId, ReviewedById = pmId, CreatedAt = now.AddMonths(-4) },

            new Basari { GirisimId = meditrack.Id, Tur = BasariTuru.Sertifika, Baslik = "ISO 27001 Bilgi Güvenliği Sertifikası", Tarih = now.AddMonths(-11), OnayDurumu = OnayDurumu.Onaylandi, SubmittedById = pmId, ReviewedById = pmId, CreatedAt = now.AddMonths(-11) },
            new Basari { GirisimId = meditrack.Id, Tur = BasariTuru.Odul, Baslik = "Sağlık Girişimciliği Zirvesi En İyi Ürün Ödülü", Tarih = now.AddMonths(-6), OnayDurumu = OnayDurumu.Onaylandi, SubmittedById = pmId, ReviewedById = pmId, CreatedAt = now.AddMonths(-6) },

            new Basari { GirisimId = cybershield.Id, Tur = BasariTuru.Sertifika, Baslik = "SOC 2 Tip II Uyumluluk Sertifikası", Tarih = now.AddMonths(-5), OnayDurumu = OnayDurumu.Onaylandi, SubmittedById = adminId, ReviewedById = pmId, CreatedAt = now.AddMonths(-5) },

            new Basari { GirisimId = logioptim.Id, Tur = BasariTuru.Odul, Baslik = "Deloitte Technology Fast 50 Türkiye", Tarih = now.AddMonths(-8), OnayDurumu = OnayDurumu.Onaylandi, SubmittedById = adminId, ReviewedById = pmId, CreatedAt = now.AddMonths(-8) },
            new Basari { GirisimId = logioptim.Id, Tur = BasariTuru.Hibe, Baslik = "Türkiye-Almanya Yenilik Köprüsü Hibesi", Tarih = now.AddMonths(-4), OnayDurumu = OnayDurumu.Onaylandi, SubmittedById = adminId, ReviewedById = pmId, CreatedAt = now.AddMonths(-4) },

            new Basari { GirisimId = agrisense.Id, Tur = BasariTuru.Hibe, Baslik = "KALKINMA AJANSI Tarım Dijitalleşme Hibesi", Tarih = now.AddMonths(-2), OnayDurumu = OnayDurumu.Beklemede, SubmittedById = pmId, CreatedAt = now.AddDays(-15) });

        await db.SaveChangesAsync();
    }

    /// <summary>
    /// Adds a second girişim to each sector already seeded by <see cref="SeedDemoExtrasAsync"/>,
    /// so every sector has at least two örnekler for karşılaştırma/rapor ekranları. Idempotent —
    /// keyed on one of the new girişim adları rather than a count, so it survives future seed
    /// additions elsewhere.
    /// </summary>
    public static async Task SeedDemoExtras2Async(AppDbContext db)
    {
        if (await db.Girisimler.AnyAsync(g => g.Ad == "NeuraVize Yapay Zekâ Çözümleri")) return;

        var adminId = await db.Users
            .Where(u => u.Role == UserRole.SuperAdmin)
            .Select(u => u.Id)
            .FirstOrDefaultAsync();

        var pmId = await db.Users
            .Where(u => u.Role == UserRole.ProgramYoneticisi)
            .Select(u => u.Id)
            .FirstOrDefaultAsync();

        if (adminId == Guid.Empty || pmId == Guid.Empty) return;

        var cleantechId = await db.Programlar
            .Where(p => p.Name == "T3 CleanTech Hızlandırma 2025")
            .Select(p => (Guid?)p.Id)
            .FirstOrDefaultAsync();

        // ─── Girişim 7: NeuraVize (Yapay Zekâ) ─────────────────────────
        var neuravize = new Girisim
        {
            Ad = "NeuraVize Yapay Zekâ Çözümleri",
            Sektor = "Yapay Zekâ",
            KisaTanim = "Doğal dil işleme tabanlı çağrı merkezi otomasyonu ve müşteri hizmetleri asistanı geliştiren girişim.",
            Teknoloji = "NLP, LLM Entegrasyonu, Python",
            WebsiteUrl = "https://neuravize.example",
            KurulusYili = 2023,
            EkipBuyuklugu = 9,
            CreatedById = pmId,
        };

        // ─── Girişim 8: GünEnerji (Yeşil Enerji) ───────────────────────
        var gunenerji = new Girisim
        {
            Ad = "GünEnerji Güneş Teknolojileri",
            Sektor = "Yeşil Enerji",
            KisaTanim = "Güneş enerjisi santralleri için verimlilik izleme ve arıza tahmini yapan enerji teknolojisi girişimi.",
            Teknoloji = "IoT Sensörler, Tahminsel Bakım, Bulut Analitik",
            WebsiteUrl = "https://gunenerji.example",
            KurulusYili = 2021,
            EkipBuyuklugu = 13,
            CreatedById = adminId,
        };

        // ─── Girişim 9: TeleSağlık (Sağlık Teknolojisi) ────────────────
        var telesaglik = new Girisim
        {
            Ad = "TeleSağlık Dijital Klinik",
            Sektor = "Sağlık Teknolojisi",
            KisaTanim = "Kronik hastalık takibi için uzaktan hasta izleme ve telemedicine platformu geliştiren sağlık teknolojisi girişimi.",
            Teknoloji = "Telemedicine, React, .NET, HL7 FHIR",
            WebsiteUrl = "https://telesaglik.example",
            KurulusYili = 2022,
            EkipBuyuklugu = 15,
            CreatedById = pmId,
        };

        // ─── Girişim 10: TarımVeri (AgriTech) ──────────────────────────
        var tarimveri = new Girisim
        {
            Ad = "TarımVeri Analitik",
            Sektor = "AgriTech",
            KisaTanim = "Drone görüntülerinden mahsul sağlığı ve verim tahmini çıkaran tarım teknolojisi girişimi.",
            Teknoloji = "Drone Görüntüleme, Bilgisayarlı Görü, Python",
            WebsiteUrl = "https://tarimveri.example",
            KurulusYili = 2023,
            EkipBuyuklugu = 7,
            CreatedById = adminId,
        };

        // ─── Girişim 11: VeriKalkan (Siber Güvenlik) ───────────────────
        var verikalkan = new Girisim
        {
            Ad = "VeriKalkan Güvenlik Teknolojileri",
            Sektor = "Siber Güvenlik",
            KisaTanim = "KOBİ'lere yönelik veri sızıntısı önleme (DLP) ve uç nokta güvenliği sağlayan SaaS platformu.",
            Teknoloji = "Endpoint Security, Rust, Kubernetes",
            WebsiteUrl = "https://verikalkan.example",
            KurulusYili = 2022,
            EkipBuyuklugu = 10,
            CreatedById = pmId,
        };

        // ─── Girişim 12: RotaAkıllı (Lojistik Tech) ────────────────────
        var rotaakilli = new Girisim
        {
            Ad = "RotaAkıllı Filo Yönetimi",
            Sektor = "Lojistik Tech",
            KisaTanim = "Son mil teslimat operasyonları için gerçek zamanlı rota optimizasyonu ve filo takip platformu.",
            Teknoloji = "Route Optimization, Go, React Native",
            WebsiteUrl = "https://rotaakilli.example",
            KurulusYili = 2020,
            EkipBuyuklugu = 19,
            CreatedById = adminId,
        };

        db.Girisimler.AddRange(neuravize, gunenerji, telesaglik, tarimveri, verikalkan, rotaakilli);

        // SaveChanges so IDs are assigned before we create related records
        await db.SaveChangesAsync();

        // ─── Program Katılımları ─────────────────────────────────────
        if (cleantechId is { } cleantech)
        {
            db.ProgramKatilimlari.Add(new ProgramKatilimi
            {
                GirisimId = gunenerji.Id, ProgramId = cleantech,
                Donem = "2025 Güz Dönemi", Durum = KatilimDurumu.Mezun,
                BaslangicTarihi = DateTime.UtcNow.AddMonths(-12),
                BitisTarihi = DateTime.UtcNow.AddMonths(-3),
            });
        }

        // ─── Gelişim Adımları ────────────────────────────────────────
        var now = DateTime.UtcNow;
        db.GelisimAdimlari.AddRange(
            new GelisimAdimi { GirisimId = neuravize.Id, Tarih = now.AddMonths(-4), Baslik = "İlk kurumsal pilot anlaşması imzalandı", CreatedById = pmId },
            new GelisimAdimi { GirisimId = gunenerji.Id, Tarih = now.AddMonths(-6), Baslik = "500. güneş santrali izlemeye alındı", CreatedById = adminId },
            new GelisimAdimi { GirisimId = telesaglik.Id, Tarih = now.AddMonths(-3), Baslik = "10.000 aktif hasta kaydına ulaşıldı", CreatedById = pmId },
            new GelisimAdimi { GirisimId = tarimveri.Id, Tarih = now.AddMonths(-5), Baslik = "İlk pilot çiftlik anlaşması imzalandı", CreatedById = adminId },
            new GelisimAdimi { GirisimId = verikalkan.Id, Tarih = now.AddMonths(-3), Baslik = "İlk 20 kurumsal müşteriye ulaşıldı", CreatedById = pmId },
            new GelisimAdimi { GirisimId = rotaakilli.Id, Tarih = now.AddMonths(-2), Baslik = "200. filo operatörü müşterisine ulaşıldı", CreatedById = adminId });

        // ─── Satış Kayıtları ─────────────────────────────────────────
        db.SatisKayitlari.AddRange(
            // NeuraVize
            new SatisKaydi { GirisimId = neuravize.Id, Donem = "2025-Q4", Ciro = 320000, Ihracat = 0, OnayDurumu = OnayDurumu.Onaylandi, SubmittedById = pmId, ReviewedById = pmId, CreatedAt = now.AddMonths(-6) },
            new SatisKaydi { GirisimId = neuravize.Id, Donem = "2026-Q1", Ciro = 510000, Ihracat = 0, OnayDurumu = OnayDurumu.Onaylandi, SubmittedById = pmId, ReviewedById = pmId, CreatedAt = now.AddMonths(-3) },
            new SatisKaydi { GirisimId = neuravize.Id, Donem = "2026-Q2", Ciro = 680000, Ihracat = 0, OnayDurumu = OnayDurumu.Beklemede, SubmittedById = pmId, CreatedAt = now.AddDays(-9) },

            // GünEnerji
            new SatisKaydi { GirisimId = gunenerji.Id, Donem = "2025-Q2", Ciro = 610000, Ihracat = 0, OnayDurumu = OnayDurumu.Onaylandi, SubmittedById = adminId, ReviewedById = pmId, CreatedAt = now.AddMonths(-12) },
            new SatisKaydi { GirisimId = gunenerji.Id, Donem = "2025-Q3", Ciro = 890000, Ihracat = 0, OnayDurumu = OnayDurumu.Onaylandi, SubmittedById = adminId, ReviewedById = pmId, CreatedAt = now.AddMonths(-9) },
            new SatisKaydi { GirisimId = gunenerji.Id, Donem = "2025-Q4", Ciro = 1240000, Ihracat = 180000, OnayDurumu = OnayDurumu.Onaylandi, SubmittedById = adminId, ReviewedById = pmId, CreatedAt = now.AddMonths(-6) },
            new SatisKaydi { GirisimId = gunenerji.Id, Donem = "2026-Q1", Ciro = 1050000, Ihracat = 140000, OnayDurumu = OnayDurumu.Beklemede, SubmittedById = adminId, CreatedAt = now.AddDays(-16) },

            // TeleSağlık
            new SatisKaydi { GirisimId = telesaglik.Id, Donem = "2025-Q3", Ciro = 1400000, Ihracat = 0, OnayDurumu = OnayDurumu.Onaylandi, SubmittedById = pmId, ReviewedById = pmId, CreatedAt = now.AddMonths(-9) },
            new SatisKaydi { GirisimId = telesaglik.Id, Donem = "2025-Q4", Ciro = 1850000, Ihracat = 0, OnayDurumu = OnayDurumu.Onaylandi, SubmittedById = pmId, ReviewedById = pmId, CreatedAt = now.AddMonths(-6) },
            new SatisKaydi { GirisimId = telesaglik.Id, Donem = "2026-Q1", Ciro = 2300000, Ihracat = 260000, OnayDurumu = OnayDurumu.Onaylandi, SubmittedById = pmId, ReviewedById = pmId, CreatedAt = now.AddMonths(-3) },
            new SatisKaydi { GirisimId = telesaglik.Id, Donem = "2026-Q2", Ciro = 1100000, Ihracat = 90000, OnayDurumu = OnayDurumu.Beklemede, SubmittedById = pmId, CreatedAt = now.AddDays(-8) },

            // TarımVeri
            new SatisKaydi { GirisimId = tarimveri.Id, Donem = "2026-Q1", Ciro = 190000, Ihracat = 0, OnayDurumu = OnayDurumu.Beklemede, SubmittedById = adminId, CreatedAt = now.AddDays(-21) },

            // VeriKalkan
            new SatisKaydi { GirisimId = verikalkan.Id, Donem = "2025-Q4", Ciro = 540000, Ihracat = 0, OnayDurumu = OnayDurumu.Onaylandi, SubmittedById = pmId, ReviewedById = pmId, CreatedAt = now.AddMonths(-6) },
            new SatisKaydi { GirisimId = verikalkan.Id, Donem = "2026-Q1", Ciro = 790000, Ihracat = 0, OnayDurumu = OnayDurumu.Onaylandi, SubmittedById = pmId, ReviewedById = pmId, CreatedAt = now.AddMonths(-3) },
            new SatisKaydi { GirisimId = verikalkan.Id, Donem = "2026-Q2", Ciro = 430000, Ihracat = 0, OnayDurumu = OnayDurumu.Beklemede, SubmittedById = pmId, CreatedAt = now.AddDays(-11) },

            // RotaAkıllı
            new SatisKaydi { GirisimId = rotaakilli.Id, Donem = "2025-Q1", Ciro = 2100000, Ihracat = 0, OnayDurumu = OnayDurumu.Onaylandi, SubmittedById = adminId, ReviewedById = pmId, CreatedAt = now.AddMonths(-15) },
            new SatisKaydi { GirisimId = rotaakilli.Id, Donem = "2025-Q2", Ciro = 2650000, Ihracat = 0, OnayDurumu = OnayDurumu.Onaylandi, SubmittedById = adminId, ReviewedById = pmId, CreatedAt = now.AddMonths(-12) },
            new SatisKaydi { GirisimId = rotaakilli.Id, Donem = "2025-Q3", Ciro = 3400000, Ihracat = 0, OnayDurumu = OnayDurumu.Onaylandi, SubmittedById = adminId, ReviewedById = pmId, CreatedAt = now.AddMonths(-9) },
            new SatisKaydi { GirisimId = rotaakilli.Id, Donem = "2025-Q4", Ciro = 4200000, Ihracat = 0, OnayDurumu = OnayDurumu.Onaylandi, SubmittedById = adminId, ReviewedById = pmId, CreatedAt = now.AddMonths(-6) },
            new SatisKaydi { GirisimId = rotaakilli.Id, Donem = "2026-Q1", Ciro = 4900000, Ihracat = 0, OnayDurumu = OnayDurumu.Onaylandi, SubmittedById = adminId, ReviewedById = pmId, CreatedAt = now.AddMonths(-3) });

        // ─── Yatırım Kayıtları ───────────────────────────────────────
        db.YatirimKayitlari.AddRange(
            new YatirimKaydi
            {
                GirisimId = neuravize.Id, Tur = YatirimTuru.OnTohum, Tutar = 3000000, ParaBirimi = "TRY",
                Tarih = now.AddMonths(-6), YatirimciAdi = "Ankara Teknoloji Melekleri",
                OnayDurumu = OnayDurumu.Onaylandi, SubmittedById = pmId, ReviewedById = pmId, CreatedAt = now.AddMonths(-6),
            },
            new YatirimKaydi
            {
                GirisimId = gunenerji.Id, Tur = YatirimTuru.Tohum, Tutar = 6500000, ParaBirimi = "TRY",
                Tarih = now.AddMonths(-9), YatirimciAdi = "Yeşil Dönüşüm Fonu",
                OnayDurumu = OnayDurumu.Onaylandi, SubmittedById = adminId, ReviewedById = pmId, CreatedAt = now.AddMonths(-9),
            },
            new YatirimKaydi
            {
                GirisimId = telesaglik.Id, Tur = YatirimTuru.SeriA, Tutar = 18000000, ParaBirimi = "TRY",
                Tarih = now.AddMonths(-7), YatirimciAdi = "Anadolu Sağlık Girişim Sermayesi",
                OnayDurumu = OnayDurumu.Onaylandi, SubmittedById = pmId, ReviewedById = pmId, CreatedAt = now.AddMonths(-7),
            },
            new YatirimKaydi
            {
                GirisimId = tarimveri.Id, Tur = YatirimTuru.Hibe, Tutar = 600000, ParaBirimi = "TRY",
                Tarih = now.AddMonths(-2), YatirimciAdi = "Tarımsal İnovasyon Destek Programı",
                OnayDurumu = OnayDurumu.Beklemede, SubmittedById = adminId, CreatedAt = now.AddDays(-19),
            },
            new YatirimKaydi
            {
                GirisimId = verikalkan.Id, Tur = YatirimTuru.OnTohum, Tutar = 2200000, ParaBirimi = "TRY",
                Tarih = now.AddMonths(-5), YatirimciAdi = "Siber Güvenlik Yatırım Ağı",
                OnayDurumu = OnayDurumu.Onaylandi, SubmittedById = pmId, ReviewedById = pmId, CreatedAt = now.AddMonths(-5),
            },
            new YatirimKaydi
            {
                GirisimId = rotaakilli.Id, Tur = YatirimTuru.SeriA, Tutar = 30000000, ParaBirimi = "TRY",
                Tarih = now.AddMonths(-6), YatirimciAdi = "Lojistik Büyüme Ortaklığı",
                OnayDurumu = OnayDurumu.Onaylandi, SubmittedById = adminId, ReviewedById = pmId, CreatedAt = now.AddMonths(-6),
            });

        // ─── Başarılar ───────────────────────────────────────────────
        db.Basarilar.AddRange(
            new Basari { GirisimId = neuravize.Id, Tur = BasariTuru.Odul, Baslik = "Teknofest Yapay Zeka Yarışması Finalisti", Tarih = now.AddMonths(-3), OnayDurumu = OnayDurumu.Onaylandi, SubmittedById = pmId, ReviewedById = pmId, CreatedAt = now.AddMonths(-3) },
            new Basari { GirisimId = gunenerji.Id, Tur = BasariTuru.Hibe, Baslik = "Enerji Verimliliği Ar-Ge Desteği", Tarih = now.AddMonths(-5), OnayDurumu = OnayDurumu.Onaylandi, SubmittedById = adminId, ReviewedById = pmId, CreatedAt = now.AddMonths(-5) },
            new Basari { GirisimId = telesaglik.Id, Tur = BasariTuru.Sertifika, Baslik = "KVKK ve HIPAA Uyum Sertifikasyonu", Tarih = now.AddMonths(-4), OnayDurumu = OnayDurumu.Onaylandi, SubmittedById = pmId, ReviewedById = pmId, CreatedAt = now.AddMonths(-4) },
            new Basari { GirisimId = tarimveri.Id, Tur = BasariTuru.Odul, Baslik = "AgriTech İnovasyon Yarışması İkincisi", Tarih = now.AddMonths(-3), OnayDurumu = OnayDurumu.Onaylandi, SubmittedById = adminId, ReviewedById = pmId, CreatedAt = now.AddMonths(-3) },
            new Basari { GirisimId = verikalkan.Id, Tur = BasariTuru.Sertifika, Baslik = "ISO 27001 Sertifikasyonu", Tarih = now.AddMonths(-2), OnayDurumu = OnayDurumu.Onaylandi, SubmittedById = pmId, ReviewedById = pmId, CreatedAt = now.AddMonths(-2) },
            new Basari { GirisimId = rotaakilli.Id, Tur = BasariTuru.Odul, Baslik = "Lojistik İnovasyon Ödülleri Birincisi", Tarih = now.AddMonths(-3), OnayDurumu = OnayDurumu.Onaylandi, SubmittedById = adminId, ReviewedById = pmId, CreatedAt = now.AddMonths(-3) });

        await db.SaveChangesAsync();
    }

    /// <summary>
    /// Örnek girişimler için markaları taklit eden, baş harflerden oluşan basit birer SVG rozet
    /// üretir (aynı sektördeki iki girişim aynı renk ailesini paylaşır). Gerçek bir logo dosyası
    /// olmadığından listeleme/detay ekranları boş kalmasın diye demo verisine özel üretilir;
    /// kullanıcı yüklemesi gibi <see cref="FileStorageService"/> üzerinden değil, doğrudan
    /// wwwroot/uploads altına yazılır. Idempotent — LogoUrl'i zaten dolu olan girişimlere dokunmaz.
    /// </summary>
    public static async Task SeedGirisimLogolariAsync(AppDbContext db, string uploadsRoot)
    {
        var logolar = new Dictionary<string, (string Bg, string Fg, string Kisaltma, string DosyaAdi)>
        {
            ["Örnek Teknoloji A.Ş."] = ("#ede9fe", "#6d28d9", "ÖT", "ornek-teknoloji"),
            ["NeuraVize Yapay Zekâ Çözümleri"] = ("#ede9fe", "#6d28d9", "NV", "neuravize"),
            ["EkoFlow Enerji Teknolojileri"] = ("#d1fae5", "#047857", "EF", "ekoflow"),
            ["GünEnerji Güneş Teknolojileri"] = ("#d1fae5", "#047857", "GE", "gunenerji"),
            ["MediTrack Sağlık Sistemleri"] = ("#ffe4e6", "#be123c", "MT", "meditrack"),
            ["TeleSağlık Dijital Klinik"] = ("#ffe4e6", "#be123c", "TS", "telesaglik"),
            ["AgriSense Tarım Teknolojileri"] = ("#fef3c7", "#b45309", "AS", "agrisense"),
            ["TarımVeri Analitik"] = ("#fef3c7", "#b45309", "TV", "tarimveri"),
            ["CyberShield Güvenlik"] = ("#e0e7ff", "#4338ca", "CS", "cybershield"),
            ["VeriKalkan Güvenlik Teknolojileri"] = ("#e0e7ff", "#4338ca", "VK", "verikalkan"),
            ["LogiOptim Lojistik Çözümleri"] = ("#cffafe", "#0e7490", "LO", "logioptim"),
            ["RotaAkıllı Filo Yönetimi"] = ("#cffafe", "#0e7490", "RA", "rotaakilli"),
        };

        var girisimler = await db.Girisimler
            .Where(g => g.LogoUrl == null || g.LogoUrl == "")
            .ToListAsync();
        if (girisimler.Count == 0) return;

        Directory.CreateDirectory(uploadsRoot);

        foreach (var girisim in girisimler)
        {
            if (!logolar.TryGetValue(girisim.Ad, out var stil)) continue;

            var dosyaAdi = $"logo-{stil.DosyaAdi}.svg";
            var svg = $"""
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 88 88">
                <rect width="88" height="88" rx="20" fill="{stil.Bg}"/>
                <text x="44" y="46" text-anchor="middle" dominant-baseline="central" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="800" fill="{stil.Fg}">{stil.Kisaltma}</text>
                </svg>
                """;
            await File.WriteAllTextAsync(Path.Combine(uploadsRoot, dosyaAdi), svg);
            girisim.LogoUrl = $"/uploads/{dosyaAdi}";
        }

        await db.SaveChangesAsync();
    }
}
