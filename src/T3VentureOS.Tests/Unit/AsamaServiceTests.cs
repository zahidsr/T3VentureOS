using T3VentureOS.Domain;
using T3VentureOS.Domain.Entities;
using T3VentureOS.Infrastructure.Services;
using T3VentureOS.Tests.TestSupport;
using Microsoft.EntityFrameworkCore;

namespace T3VentureOS.Tests.Unit;

public class AsamaServiceTests
{
    private static async Task<(Infrastructure.Data.AppDbContext Db, AsamaService Servis, Girisim Girisim, Guid KullaniciId)>
        KurAsync()
    {
        var db = TestDb.Create();
        var kullanici = new User { Email = "a@t3.local", FullName = "Kullanıcı", Role = UserRole.StartupKullanicisi };
        var girisim = new Girisim { Ad = "Test", CreatedById = kullanici.Id };
        db.Users.Add(kullanici);
        db.Girisimler.Add(girisim);
        await db.SaveChangesAsync();
        return (db, new AsamaService(db), girisim, kullanici.Id);
    }

    [Fact]
    public async Task Ilk_asama_kaydinda_onceki_asama_bos_kalir()
    {
        var (db, servis, girisim, kullaniciId) = await KurAsync();

        var (ok, _) = await servis.AsamaDegistirAsync(girisim.Id, GirisimAsamasi.Prototip, null, null, kullaniciId);

        Assert.True(ok);
        var gecis = await db.AsamaGecisleri.SingleAsync();
        Assert.Null(gecis.OncekiAsama);
        Assert.Equal(GirisimAsamasi.Prototip, gecis.YeniAsama);
        Assert.Equal(GirisimAsamasi.Prototip, (await db.Girisimler.SingleAsync()).Asama);
    }

    [Fact]
    public async Task Sonraki_gecislerde_onceki_asama_kaydedilir()
    {
        var (db, servis, girisim, kullaniciId) = await KurAsync();
        await servis.AsamaDegistirAsync(girisim.Id, GirisimAsamasi.Prototip, null, null, kullaniciId);

        await servis.AsamaDegistirAsync(girisim.Id, GirisimAsamasi.MVP, null, null, kullaniciId);

        var son = await db.AsamaGecisleri.OrderByDescending(g => g.CreatedAt).FirstAsync();
        Assert.Equal(GirisimAsamasi.Prototip, son.OncekiAsama);
        Assert.Equal(GirisimAsamasi.MVP, son.YeniAsama);
    }

    [Fact]
    public async Task Ayni_asama_tekrar_secilirse_gecmis_sisirilmez()
    {
        var (db, servis, girisim, kullaniciId) = await KurAsync();
        await servis.AsamaDegistirAsync(girisim.Id, GirisimAsamasi.MVP, null, null, kullaniciId);

        var (ok, hata) = await servis.AsamaDegistirAsync(girisim.Id, GirisimAsamasi.MVP, null, null, kullaniciId);

        Assert.False(ok);
        Assert.Contains("zaten bu aşamada", hata);
        Assert.Equal(1, await db.AsamaGecisleri.CountAsync());
    }

    [Fact]
    public async Task Gelecek_tarihli_gecis_reddedilir()
    {
        var (_, servis, girisim, kullaniciId) = await KurAsync();

        var (ok, hata) = await servis.AsamaDegistirAsync(
            girisim.Id, GirisimAsamasi.MVP, DateTime.UtcNow.AddMonths(2), null, kullaniciId);

        Assert.False(ok);
        Assert.Contains("gelecekte olamaz", hata);
    }

    [Fact]
    public async Task Gecmise_donuk_tarih_kabul_edilir()
    {
        var (db, servis, girisim, kullaniciId) = await KurAsync();
        var gecmisTarih = new DateTime(2025, 3, 10);

        await servis.AsamaDegistirAsync(girisim.Id, GirisimAsamasi.IlkMusteri, gecmisTarih, "İlk müşteri", kullaniciId);

        // Girişimci olayı haftalar sonra girebilir; takibin doğruluğu gerçek tarihe bağlı.
        Assert.Equal(gecmisTarih, (await db.AsamaGecisleri.SingleAsync()).Tarih);
    }

    private static AsamaGecisi Gecis(GirisimAsamasi? onceki, GirisimAsamasi yeni, string tarih) =>
        new() { OncekiAsama = onceki, YeniAsama = yeni, Tarih = DateTime.Parse(tarih) };

    [Fact]
    public void Tarihteki_asama_o_tarihe_kadarki_son_gecisi_verir()
    {
        var gecisler = new[]
        {
            Gecis(null, GirisimAsamasi.Fikir, "2024-01-01"),
            Gecis(GirisimAsamasi.Fikir, GirisimAsamasi.Prototip, "2025-01-01"),
            Gecis(GirisimAsamasi.Prototip, GirisimAsamasi.MVP, "2026-01-01"),
        };

        Assert.Equal(GirisimAsamasi.Prototip, AsamaService.TarihtekiAsama(gecisler, DateTime.Parse("2025-06-01")));
        Assert.Equal(GirisimAsamasi.MVP, AsamaService.TarihtekiAsama(gecisler, DateTime.Parse("2026-06-01")));
    }

    [Fact]
    public void Ilk_gecisten_onceki_bir_tarihte_baslangic_asamasi_verilir()
    {
        var gecisler = new[] { Gecis(GirisimAsamasi.Fikir, GirisimAsamasi.Prototip, "2025-01-01") };

        // Programa katılım, aşama kaydından önceye düşebilir; o an bilinen aşama geçişin öncesidir.
        Assert.Equal(GirisimAsamasi.Fikir, AsamaService.TarihtekiAsama(gecisler, DateTime.Parse("2024-01-01")));
    }

    [Fact]
    public void Hic_gecis_yoksa_tarihteki_asama_bilinmez()
    {
        Assert.Null(AsamaService.TarihtekiAsama([], DateTime.UtcNow));
    }
}
