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
}
