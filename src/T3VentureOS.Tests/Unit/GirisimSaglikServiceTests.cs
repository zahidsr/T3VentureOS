using T3VentureOS.Domain;
using T3VentureOS.Domain.Entities;
using T3VentureOS.Infrastructure.Services;
using T3VentureOS.Tests.TestSupport;

namespace T3VentureOS.Tests.Unit;

public class GirisimSaglikServiceTests
{
    private static Girisim YeniGirisim(string ad = "Test Girişim") =>
        new() { Ad = ad, CreatedById = Guid.NewGuid(), UpdatedAt = DateTime.UtcNow };

    [Fact]
    public async Task Bos_bir_girisimin_profil_taml_gi_dusuktur()
    {
        var db = TestDb.Create();
        db.Girisimler.Add(YeniGirisim());
        await db.SaveChangesAsync();

        var saglik = Assert.Single(await new GirisimSaglikService(db).GetTumSaglikAsync());

        Assert.Equal(0, saglik.TamamlananAdim);
        Assert.Equal(6, saglik.ToplamAdim);
        Assert.False(saglik.IletisimVar);
        Assert.False(saglik.SunumVar);
    }

    [Fact]
    public async Task Iletisim_ve_sunum_eklendikce_taml_k_artar()
    {
        var db = TestDb.Create();
        var girisim = YeniGirisim();
        girisim.LogoUrl = "/uploads/logo.png";
        girisim.KisaTanim = "Kısa tanım";
        db.Girisimler.Add(girisim);
        db.GirisimContactlar.Add(new GirisimContact { GirisimId = girisim.Id, AdSoyad = "Yetkili" });
        db.Dokumanlar.Add(new Dokuman
        {
            GirisimId = girisim.Id, Baslik = "Sunum", DosyaAdi = "s.pdf", DosyaUrl = "/uploads/s.pdf",
            Tur = DokumanTuru.Sunum, SubmittedById = Guid.NewGuid(),
        });
        await db.SaveChangesAsync();

        var saglik = Assert.Single(await new GirisimSaglikService(db).GetTumSaglikAsync());

        Assert.True(saglik.IletisimVar);
        Assert.True(saglik.SunumVar);
        Assert.Equal(4, saglik.TamamlananAdim); // logo + tanım + iletişim + sunum
    }

    [Fact]
    public async Task Genel_dokuman_sunum_sayilmaz()
    {
        var db = TestDb.Create();
        var girisim = YeniGirisim();
        db.Girisimler.Add(girisim);
        db.Dokumanlar.Add(new Dokuman
        {
            GirisimId = girisim.Id, Baslik = "Sözleşme", DosyaAdi = "s.pdf", DosyaUrl = "/uploads/s.pdf",
            Tur = DokumanTuru.Genel, SubmittedById = Guid.NewGuid(),
        });
        await db.SaveChangesAsync();

        var saglik = Assert.Single(await new GirisimSaglikService(db).GetTumSaglikAsync());

        Assert.False(saglik.SunumVar);
    }

    [Fact]
    public async Task Uretilmis_sunum_taslagi_da_sunum_sayilir()
    {
        var db = TestDb.Create();
        var girisim = YeniGirisim();
        db.Girisimler.Add(girisim);
        // Dosya yüklenmemiş ama sistemde üretilmiş bir sunum taslağı var.
        db.SunumTaslaklari.Add(new SunumTaslagi { GirisimId = girisim.Id, OlusturanId = Guid.NewGuid() });
        await db.SaveChangesAsync();

        var saglik = Assert.Single(await new GirisimSaglikService(db).GetTumSaglikAsync());

        Assert.True(saglik.SunumVar);
    }

    [Fact]
    public async Task GetAsync_yalnizca_istenen_girisimi_doner()
    {
        var db = TestDb.Create();
        var hedef = YeniGirisim("Hedef");
        db.Girisimler.AddRange(hedef, YeniGirisim("Diğer"));
        await db.SaveChangesAsync();

        var saglik = await new GirisimSaglikService(db).GetAsync(hedef.Id);

        Assert.NotNull(saglik);
        Assert.Equal("Hedef", saglik!.Ad);
    }

    [Fact]
    public async Task Son_veri_girisi_en_yeni_kayittan_hesaplanir()
    {
        var db = TestDb.Create();
        var girisim = YeniGirisim();
        girisim.UpdatedAt = DateTime.UtcNow.AddDays(-90);
        db.Girisimler.Add(girisim);
        db.SatisKayitlari.Add(new SatisKaydi
        {
            GirisimId = girisim.Id, Donem = "2026-Q1", Ciro = 100, SubmittedById = Guid.NewGuid(),
            CreatedAt = DateTime.UtcNow.AddDays(-3),
        });
        await db.SaveChangesAsync();

        var saglik = Assert.Single(await new GirisimSaglikService(db).GetTumSaglikAsync());

        // Profil 90 gün önce güncellenmiş olsa da girişimci 3 gün önce satış kaydı girmiş.
        Assert.Equal(3, saglik.GuncellemeUzerindenGecenGun);
    }

    [Fact]
    public async Task Bekleyen_kayitlar_turler_arasinda_toplanir()
    {
        var db = TestDb.Create();
        var girisim = YeniGirisim();
        db.Girisimler.Add(girisim);
        db.SatisKayitlari.Add(new SatisKaydi { GirisimId = girisim.Id, Donem = "2026-Q1", Ciro = 1, SubmittedById = Guid.NewGuid() });
        db.YatirimKayitlari.Add(new YatirimKaydi { GirisimId = girisim.Id, Tutar = 1, Tarih = DateTime.UtcNow, SubmittedById = Guid.NewGuid() });
        db.Basarilar.Add(new Basari
        {
            GirisimId = girisim.Id, Baslik = "Ödül", Tarih = DateTime.UtcNow, SubmittedById = Guid.NewGuid(),
            OnayDurumu = OnayDurumu.Onaylandi,
        });
        await db.SaveChangesAsync();

        var saglik = Assert.Single(await new GirisimSaglikService(db).GetTumSaglikAsync());

        // Onaylanmış başarı sayılmaz; yalnızca bekleyen satış + yatırım.
        Assert.Equal(2, saglik.BekleyenKayitSayisi);
    }

    [Fact]
    public async Task Panel_ozeti_bayat_ve_eksik_girisimleri_ayirir()
    {
        var db = TestDb.Create();
        var bayat = YeniGirisim("Bayat Girişim");
        bayat.UpdatedAt = DateTime.UtcNow.AddDays(-GirisimSaglikService.BayatlikEsigiGun - 5);
        var guncel = YeniGirisim("Güncel Girişim");
        db.Girisimler.AddRange(bayat, guncel);
        await db.SaveChangesAsync();

        var ozet = await new GirisimSaglikService(db).GetPanelOzetiAsync();

        Assert.Equal(2, ozet.ToplamGirisim);
        Assert.Equal("Bayat Girişim", Assert.Single(ozet.UzunSuredirGuncellenmeyenler).Ad);
        Assert.Equal(2, ozet.ProfiliEksikOlanlar.Count);
        Assert.Equal(2, ozet.IletisimsizGirisimSayisi);
    }
}
