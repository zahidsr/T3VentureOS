using T3VentureOS.Domain;
using T3VentureOS.Domain.Entities;
using T3VentureOS.Infrastructure.Services;
using T3VentureOS.Tests.TestSupport;

namespace T3VentureOS.Tests.Unit;

public class SunumPaylasimServiceTests
{
    private static async Task<(Infrastructure.Data.AppDbContext Db, SunumPaylasimService Servis, Girisim Girisim, Guid KullaniciId)>
        KurAsync(bool sunumVar = true)
    {
        var db = TestDb.Create();
        var kullanici = new User { Email = "g@t3.local", FullName = "Girişimci", Role = UserRole.StartupKullanicisi };
        var girisim = new Girisim { Ad = "Test Girişim", CreatedById = kullanici.Id };
        db.Users.Add(kullanici);
        db.Girisimler.Add(girisim);
        if (sunumVar)
        {
            db.SunumTaslaklari.Add(new SunumTaslagi
            {
                GirisimId = girisim.Id, OlusturanId = kullanici.Id,
                IcerikJson = """[{"Anahtar":"amac","Baslik":"Şirketin Amacı","Icerik":"Metin."}]""",
            });
        }
        await db.SaveChangesAsync();
        return (db, new SunumPaylasimService(db), girisim, kullanici.Id);
    }

    [Fact]
    public void Jeton_tahmin_edilemeyecek_uzunlukta_ve_her_seferinde_farkli()
    {
        var jetonlar = Enumerable.Range(0, 50).Select(_ => SunumPaylasimService.JetonUret()).ToList();

        Assert.All(jetonlar, j => Assert.True(j.Length >= 40));
        Assert.Equal(jetonlar.Count, jetonlar.Distinct().Count());
        // URL'de sorun çıkaracak karakter olmamalı.
        Assert.All(jetonlar, j => Assert.DoesNotContain(j, c => c is '+' or '/' or '='));
    }

    [Fact]
    public async Task Sunum_yoksa_baglanti_olusturulamaz()
    {
        var (_, servis, girisim, kullaniciId) = await KurAsync(sunumVar: false);

        var (ok, _, hata) = await servis.OlusturAsync(girisim.Id, kullaniciId, 30, null);

        Assert.False(ok);
        Assert.Contains("sunum taslağını", hata);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(1)]
    [InlineData(365)]
    [InlineData(-30)]
    public async Task Listede_olmayan_sure_reddedilir(int gun)
    {
        var (_, servis, girisim, kullaniciId) = await KurAsync();

        var (ok, _, _) = await servis.OlusturAsync(girisim.Id, kullaniciId, gun, null);

        // Süresiz ya da keyfi uzunlukta bağlantı üretilememeli.
        Assert.False(ok);
    }

    [Fact]
    public async Task Gecerli_baglanti_sunumu_dondurur_ve_sayaci_artirir()
    {
        var (db, servis, girisim, kullaniciId) = await KurAsync();
        var (_, paylasim, _) = await servis.OlusturAsync(girisim.Id, kullaniciId, 30, "Yatırımcı");

        var ilk = await servis.GoruntuleAsync(paylasim!.Jeton);
        var ikinci = await servis.GoruntuleAsync(paylasim.Jeton);

        Assert.NotNull(ilk);
        Assert.NotNull(ikinci);
        Assert.Equal("Test Girişim", ilk!.GirisimAdi);
        Assert.Single(ilk.Bolumler);
        Assert.Equal(2, db.SunumPaylasimlari.Single().GoruntulenmeSayisi);
    }

    [Fact]
    public async Task Iptal_edilen_baglanti_acilamaz()
    {
        var (_, servis, girisim, kullaniciId) = await KurAsync();
        var (_, paylasim, _) = await servis.OlusturAsync(girisim.Id, kullaniciId, 30, null);

        await servis.IptalEtAsync(girisim.Id, paylasim!.Id);

        Assert.Null(await servis.GoruntuleAsync(paylasim.Jeton));
    }

    [Fact]
    public async Task Suresi_dolan_baglanti_acilamaz()
    {
        var (db, servis, girisim, kullaniciId) = await KurAsync();
        var (_, paylasim, _) = await servis.OlusturAsync(girisim.Id, kullaniciId, 7, null);

        paylasim!.GecerlilikBitisi = DateTime.UtcNow.AddDays(-1);
        await db.SaveChangesAsync();

        Assert.Null(await servis.GoruntuleAsync(paylasim.Jeton));
    }

    [Fact]
    public async Task Bilinmeyen_jeton_null_doner()
    {
        var (_, servis, _, _) = await KurAsync();

        Assert.Null(await servis.GoruntuleAsync("uydurma-jeton"));
    }

    [Fact]
    public async Task Baska_girisimin_baglantisi_iptal_edilemez()
    {
        var (db, servis, girisim, kullaniciId) = await KurAsync();
        var (_, paylasim, _) = await servis.OlusturAsync(girisim.Id, kullaniciId, 30, null);
        var baskaGirisim = new Girisim { Ad = "Başkası", CreatedById = Guid.NewGuid() };
        db.Girisimler.Add(baskaGirisim);
        await db.SaveChangesAsync();

        var ok = await servis.IptalEtAsync(baskaGirisim.Id, paylasim!.Id);

        Assert.False(ok);
        Assert.NotNull(await servis.GoruntuleAsync(paylasim.Jeton));
    }
}
