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
}
