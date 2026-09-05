using T3VentureOS.Domain;
using T3VentureOS.Domain.Entities;
using T3VentureOS.Infrastructure.Services;
using T3VentureOS.Tests.TestSupport;

namespace T3VentureOS.Tests.Unit;

public class EkosistemEtkiServiceTests
{
    private static Girisim Girisim(string ad) => new() { Ad = ad, CreatedById = Guid.NewGuid() };

    private static IstihdamKaydi Istihdam(Guid girisimId, string donem, int calisan) => new()
    {
        GirisimId = girisimId, Donem = donem, CalisanSayisi = calisan,
        OnayDurumu = OnayDurumu.Onaylandi, SubmittedById = Guid.NewGuid(),
    };

    private static SatisKaydi Satis(Guid girisimId, string donem, decimal ciro, decimal? ihracat = null) => new()
    {
        GirisimId = girisimId, Donem = donem, Ciro = ciro, Ihracat = ihracat,
        OnayDurumu = OnayDurumu.Onaylandi, SubmittedById = Guid.NewGuid(),
    };

    [Fact]
    public async Task Kayit_girilmeyen_donemde_istihdam_dusmez()
    {
        var db = TestDb.Create();
        var a = Girisim("A");
        var b = Girisim("B");
        db.Girisimler.AddRange(a, b);
        db.IstihdamKayitlari.AddRange(
            Istihdam(a.Id, "2026-Q1", 10),
            Istihdam(b.Id, "2026-Q1", 5),
            // B, Q2'de kayıt girmedi.
            Istihdam(a.Id, "2026-Q2", 12));
        await db.SaveChangesAsync();

        var etki = await new EkosistemEtkiService(db).GetAsync();

        // Düz toplam 12 verirdi ve ekosistem küçülmüş görünürdü; B'nin son bilinen sayısı taşınır.
        Assert.Equal(15, etki.Donemler.Single(d => d.Donem == "2026-Q1").Istihdam);
        Assert.Equal(17, etki.Donemler.Single(d => d.Donem == "2026-Q2").Istihdam);
    }

    [Fact]
    public async Task Onay_bekleyen_kayitlar_toplama_girmez()
    {
        var db = TestDb.Create();
        var g = Girisim("A");
        db.Girisimler.Add(g);
        db.SatisKayitlari.AddRange(
            Satis(g.Id, "2026-Q1", 1000, 200),
            new SatisKaydi
            {
                GirisimId = g.Id, Donem = "2026-Q2", Ciro = 999_999, SubmittedById = Guid.NewGuid(),
                OnayDurumu = OnayDurumu.Beklemede,
            });
        await db.SaveChangesAsync();

        var etki = await new EkosistemEtkiService(db).GetAsync();

        Assert.Equal(1000, etki.ToplamCiro);
        Assert.Equal(200, etki.ToplamIhracat);
    }

    [Fact]
    public async Task Yatirim_tarihi_ceyrege_cevrilir()
    {
        var db = TestDb.Create();
        var g = Girisim("A");
        db.Girisimler.Add(g);
        db.YatirimKayitlari.Add(new YatirimKaydi
        {
            GirisimId = g.Id, Tur = YatirimTuru.Tohum, Tutar = 500_000,
            Tarih = new DateTime(2026, 5, 15), OnayDurumu = OnayDurumu.Onaylandi, SubmittedById = Guid.NewGuid(),
        });
        await db.SaveChangesAsync();

        var etki = await new EkosistemEtkiService(db).GetAsync();

        Assert.Equal(500_000, etki.Donemler.Single(d => d.Donem == "2026-Q2").Yatirim);
    }

    [Theory]
    [InlineData(1, "2026-Q1")]
    [InlineData(3, "2026-Q1")]
    [InlineData(4, "2026-Q2")]
    [InlineData(9, "2026-Q3")]
    [InlineData(12, "2026-Q4")]
    public void Donem_etiketi_ay_sinirlarinda_dogru(int ay, string beklenen)
    {
        Assert.Equal(beklenen, EkosistemEtkiService.DonemEtiketi(new DateTime(2026, ay, 1)));
    }

    [Fact]
    public async Task Istihdam_artisi_ilk_ve_son_donem_farkidir()
    {
        var db = TestDb.Create();
        var g = Girisim("A");
        db.Girisimler.Add(g);
        db.IstihdamKayitlari.AddRange(
            Istihdam(g.Id, "2025-Q1", 3),
            Istihdam(g.Id, "2026-Q1", 11));
        await db.SaveChangesAsync();

        var etki = await new EkosistemEtkiService(db).GetAsync();

        Assert.Equal(11, etki.GuncelIstihdam);
        Assert.Equal(8, etki.IstihdamArtisi);
    }
}
