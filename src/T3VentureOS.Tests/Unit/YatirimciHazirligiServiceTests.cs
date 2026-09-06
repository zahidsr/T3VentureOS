using T3VentureOS.Domain;
using T3VentureOS.Domain.Entities;
using T3VentureOS.Infrastructure.Services;

namespace T3VentureOS.Tests.Unit;

public class YatirimciHazirligiServiceTests
{
    private static readonly DateTime Simdi = new(2026, 9, 1);

    private static Girisim TamGirisim()
    {
        var id = Guid.NewGuid();
        var g = new Girisim
        {
            Id = id, Ad = "Test", KisaTanim = "Tanım", Sektor = "Yapay Zekâ", KurulusYili = 2023,
            CreatedById = Guid.NewGuid(),
            Contact = new GirisimContact { GirisimId = id, AdSoyad = "Yetkili", Email = "a@b.local" },
        };
        g.SatisKayitlari.Add(new SatisKaydi { GirisimId = id, Donem = "2026-Q1", Ciro = 100, OnayDurumu = OnayDurumu.Onaylandi, SubmittedById = Guid.NewGuid(), CreatedAt = Simdi.AddDays(-10) });
        g.SatisKayitlari.Add(new SatisKaydi { GirisimId = id, Donem = "2026-Q2", Ciro = 300, OnayDurumu = OnayDurumu.Onaylandi, SubmittedById = Guid.NewGuid(), CreatedAt = Simdi.AddDays(-5) });
        g.IstihdamKayitlari.Add(new IstihdamKaydi { GirisimId = id, Donem = "2026-Q2", CalisanSayisi = 5, OnayDurumu = OnayDurumu.Onaylandi, SubmittedById = Guid.NewGuid(), CreatedAt = Simdi.AddDays(-5) });
        g.Basarilar.Add(new Basari { GirisimId = id, Baslik = "Ödül", Tarih = Simdi.AddMonths(-2), OnayDurumu = OnayDurumu.Onaylandi, SubmittedById = Guid.NewGuid() });
        return g;
    }

    private static bool Karsilandi(YatirimciHazirligi h, string anahtar) =>
        h.Kriterler.Single(k => k.Anahtar == anahtar).Karsilandi;

    [Fact]
    public void Eksiksiz_girisim_tam_hazir_sayilir()
    {
        var h = YatirimciHazirligiService.Degerlendir(TamGirisim(), sunumVar: true, Simdi);

        Assert.Equal(100, h.Yuzde);
        Assert.Equal("Hazır", h.Durum);
    }

    [Fact]
    public void Bos_girisim_hazirlik_baslamadi_sayilir()
    {
        var h = YatirimciHazirligiService.Degerlendir(
            new Girisim { Ad = "Boş", CreatedById = Guid.NewGuid() }, sunumVar: false, Simdi);

        Assert.Equal(0, h.Yuzde);
        Assert.Equal("Hazırlık başlamadı", h.Durum);
    }

    [Fact]
    public void Tek_donem_ciro_trend_saymaz()
    {
        var g = TamGirisim();
        g.SatisKayitlari.Remove(g.SatisKayitlari.Last());

        var h = YatirimciHazirligiService.Degerlendir(g, sunumVar: true, Simdi);

        // Tek bir rakam eğilim göstermez; hem geçmiş hem büyüme ölçütü karşılanmaz.
        Assert.False(Karsilandi(h, "finansal_gecmis"));
        Assert.False(Karsilandi(h, "buyume"));
    }

    [Fact]
    public void Ciro_dususte_ise_buyume_karsilanmaz()
    {
        var g = TamGirisim();
        g.SatisKayitlari.Last().Ciro = 50;

        var h = YatirimciHazirligiService.Degerlendir(g, sunumVar: true, Simdi);

        Assert.False(Karsilandi(h, "buyume"));
        Assert.True(Karsilandi(h, "finansal_gecmis"));
    }

    [Fact]
    public void Onay_bekleyen_kayit_dogrulanmis_olcutunu_dusurur()
    {
        var g = TamGirisim();
        g.YatirimKayitlari.Add(new YatirimKaydi
        {
            GirisimId = g.Id, Tur = YatirimTuru.Tohum, Tutar = 100, Tarih = Simdi,
            OnayDurumu = OnayDurumu.Beklemede, SubmittedById = Guid.NewGuid(),
        });

        var h = YatirimciHazirligiService.Degerlendir(g, sunumVar: true, Simdi);

        Assert.False(Karsilandi(h, "dogrulanmis"));
        Assert.Contains("1 kaydın onay bekliyor", h.Kriterler.Single(k => k.Anahtar == "dogrulanmis").Ipucu);
    }

    [Fact]
    public void Eski_veri_guncellik_olcutunu_dusurur()
    {
        var g = TamGirisim();
        foreach (var s in g.SatisKayitlari) s.CreatedAt = Simdi.AddDays(-(YatirimciHazirligiService.GuncellikEsigiGun + 30));
        foreach (var i in g.IstihdamKayitlari) i.CreatedAt = Simdi.AddDays(-(YatirimciHazirligiService.GuncellikEsigiGun + 30));

        var h = YatirimciHazirligiService.Degerlendir(g, sunumVar: true, Simdi);

        Assert.False(Karsilandi(h, "guncel"));
    }

    [Fact]
    public void Sunum_yoksa_olcut_karsilanmaz()
    {
        var h = YatirimciHazirligiService.Degerlendir(TamGirisim(), sunumVar: false, Simdi);

        Assert.False(Karsilandi(h, "sunum"));
        Assert.Equal("Neredeyse hazır", h.Durum);
    }

    [Fact]
    public void Iletisimde_ne_eposta_ne_telefon_varsa_karsilanmaz()
    {
        var g = TamGirisim();
        g.Contact!.Email = null;
        g.Contact.Telefon = null;

        var h = YatirimciHazirligiService.Degerlendir(g, sunumVar: true, Simdi);

        // Muhatabın adı tek başına yetmez; ulaşılabilir olması gerekir.
        Assert.False(Karsilandi(h, "iletisim"));
    }
}
