using T3VentureOS.Domain;
using T3VentureOS.Domain.Entities;
using T3VentureOS.Infrastructure.Services;
using T3VentureOS.Tests.TestSupport;

namespace T3VentureOS.Tests.Unit;

public class DashboardServiceTests
{
    [Fact]
    public async Task GetStatsAsync_counts_only_approved_yatirim_and_satis_totals()
    {
        var db = TestDb.Create();
        var girisim = new Girisim { Ad = "Test Girişim", Sektor = "Yazılım", CreatedById = Guid.NewGuid() };
        db.Girisimler.Add(girisim);
        db.SatisKayitlari.AddRange(
            new SatisKaydi { GirisimId = girisim.Id, Donem = "2026-Q1", Ciro = 1000, OnayDurumu = OnayDurumu.Onaylandi, SubmittedById = Guid.NewGuid() },
            new SatisKaydi { GirisimId = girisim.Id, Donem = "2026-Q2", Ciro = 5000, OnayDurumu = OnayDurumu.Beklemede, SubmittedById = Guid.NewGuid() });
        db.YatirimKayitlari.Add(new YatirimKaydi
        {
            GirisimId = girisim.Id, Tur = YatirimTuru.Tohum, Tutar = 20000,
            OnayDurumu = OnayDurumu.Onaylandi, SubmittedById = Guid.NewGuid(),
        });
        await db.SaveChangesAsync();

        var stats = await new DashboardService(db).GetStatsAsync();

        Assert.Equal(1, stats.ToplamGirisim);
        Assert.Equal(1000, stats.ToplamOnayliCiro);
        Assert.Equal(20000, stats.ToplamOnayliYatirim);
        Assert.Equal(1, stats.BekleyenOnaySayisi);
        Assert.Contains(stats.SektorDagilimi, s => s.Sektor == "Yazılım" && s.Sayi == 1);
    }

    [Fact]
    public void BuildAiPrompt_is_in_Turkish_and_includes_the_headline_figures()
    {
        var stats = new DashboardStats(
            ToplamGirisim: 3, AktifProgramSayisi: 1, BekleyenOnaySayisi: 2,
            ToplamOnayliYatirim: 500_000, ToplamOnayliCiro: 1_200_000,
            SektorDagilimi: new List<SektorSayisi> { new("Yazılım", 2) },
            YatirimTuruDagilimi: new List<YatirimTuruDagilimi> { new("Tohum", 500_000) },
            AylikTrend: new List<AylikTrend> { new("Oca 2026", 1_200_000, 500_000) });

        var prompt = DashboardService.BuildAiPrompt(stats);

        Assert.Contains("Toplam Girişim: 3", prompt);
        Assert.Contains("Bekleyen Onay: 2", prompt);
        Assert.Contains("Yazılım: 2", prompt);
    }

    [Fact]
    public async Task SaveAiAnalizAsync_persists_a_snapshot_the_actor_and_text()
    {
        var db = TestDb.Create();
        var karar = new User { Email = "karar@test.local", FullName = "Karar Verici", Role = UserRole.KararVerici };
        db.Users.Add(karar);
        await db.SaveChangesAsync();

        var dashboard = new DashboardService(db);
        var kayit = await dashboard.SaveAiAnalizAsync(karar.Id, "Ekosistem büyüme trendinde.");

        Assert.Equal(karar.Id, kayit.CreatedById);
        Assert.Equal("Karar Verici", kayit.CreatedByAdSoyad);
        Assert.Equal("Ekosistem büyüme trendinde.", kayit.Metin);
        Assert.Single(db.AiAnalizKayitlari);
    }

    [Fact]
    public async Task ListAiAnalizGecmisiAsync_returns_newest_first_and_respects_the_limit()
    {
        var db = TestDb.Create();
        var actorId = Guid.NewGuid();
        var dashboard = new DashboardService(db);

        var first = await dashboard.SaveAiAnalizAsync(actorId, "İlk analiz");
        first.CreatedAt = DateTime.UtcNow.AddMinutes(-10);
        var second = await dashboard.SaveAiAnalizAsync(actorId, "İkinci analiz");
        second.CreatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        var history = await dashboard.ListAiAnalizGecmisiAsync(limit: 1);

        Assert.Single(history);
        Assert.Equal("İkinci analiz", history[0].Metin);
    }
}
