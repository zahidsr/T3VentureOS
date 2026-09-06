using T3VentureOS.Domain;
using T3VentureOS.Domain.Entities;
using T3VentureOS.Infrastructure.Services;
using T3VentureOS.Tests.TestSupport;
using Microsoft.EntityFrameworkCore;

namespace T3VentureOS.Tests.Unit;

public class DonemGirisiServiceTests
{
    private static async Task<(Infrastructure.Data.AppDbContext Db, DonemGirisiService Servis, Girisim Girisim, User Temsilci)>
        KurAsync()
    {
        var db = TestDb.Create();
        var girisim = new Girisim { Ad = "Test", CreatedById = Guid.NewGuid() };
        db.Girisimler.Add(girisim);
        await db.SaveChangesAsync();

        var temsilci = new User
        {
            Email = "g@t3.local", FullName = "Temsilci", Role = UserRole.StartupKullanicisi,
            Status = UserStatus.Active, GirisimId = girisim.Id,
        };
        db.Users.Add(temsilci);
        await db.SaveChangesAsync();

        var servis = new DonemGirisiService(db, new GirisimSaglikService(db), new NotificationService(db));
        return (db, servis, girisim, temsilci);
    }

    [Theory]
    [InlineData("2026-09-06", "2026-Q2")]
    [InlineData("2026-01-15", "2025-Q4")]
    [InlineData("2026-04-01", "2026-Q1")]
    public void Son_kapanan_donem_icinde_bulunulan_ceyregin_oncesidir(string bugun, string beklenen)
    {
        // İçinde bulunulan çeyrek henüz bitmediği için verisi istenmez.
        Assert.Equal(beklenen, DonemGirisiService.SonKapananDonem(DateTime.Parse(bugun)));
    }

    [Fact]
    public async Task Eksik_donemler_veri_girilmis_ceyrekleri_atlar()
    {
        var (db, servis, girisim, temsilci) = await KurAsync();
        var simdi = new DateTime(2026, 9, 6);
        db.SatisKayitlari.Add(new SatisKaydi { GirisimId = girisim.Id, Donem = "2026-Q2", Ciro = 100, SubmittedById = temsilci.Id });
        db.IstihdamKayitlari.Add(new IstihdamKaydi { GirisimId = girisim.Id, Donem = "2026-Q2", CalisanSayisi = 5, SubmittedById = temsilci.Id });
        await db.SaveChangesAsync();

        var eksikler = await servis.EksikDonemlerAsync(girisim.Id, 2, simdi);

        Assert.DoesNotContain(eksikler, e => e.Donem == "2026-Q2");
        Assert.Contains(eksikler, e => e.Donem == "2026-Q1");
    }

    [Fact]
    public async Task Reddedilen_kayit_girilmis_sayilmaz()
    {
        var (db, servis, girisim, temsilci) = await KurAsync();
        var simdi = new DateTime(2026, 9, 6);
        db.SatisKayitlari.Add(new SatisKaydi
        {
            GirisimId = girisim.Id, Donem = "2026-Q2", Ciro = 100, SubmittedById = temsilci.Id,
            OnayDurumu = OnayDurumu.Reddedildi,
        });
        await db.SaveChangesAsync();

        var eksikler = await servis.EksikDonemlerAsync(girisim.Id, 1, simdi);

        // Reddedilen kaydın yeniden girilmesi beklenir.
        Assert.Contains(eksikler, e => e.Donem == "2026-Q2" && e.CiroEksik);
    }

    [Fact]
    public async Task Tek_cagri_uc_kaydi_birden_olusturur()
    {
        var (db, servis, girisim, temsilci) = await KurAsync();

        var (ok, sonuc, _) = await servis.KaydetAsync(
            girisim.Id, temsilci.Id, "2026-Q2", ciro: 500_000, ihracat: 90_000,
            calisanSayisi: 8, yeniIseAlim: 2,
            yatirimTuru: "Tohum", yatirimTutari: 3_000_000, yatirimTarihi: null, yatirimciAdi: "Fon");

        Assert.True(ok);
        Assert.Equal(3, sonuc!.EklenenKayitSayisi);
        Assert.Equal(1, await db.SatisKayitlari.CountAsync());
        Assert.Equal(1, await db.IstihdamKayitlari.CountAsync());
        Assert.Equal(1, await db.YatirimKayitlari.CountAsync());
    }

    [Fact]
    public async Task Bos_alanlar_kayit_olusturmaz()
    {
        var (db, servis, girisim, temsilci) = await KurAsync();

        var (ok, sonuc, _) = await servis.KaydetAsync(
            girisim.Id, temsilci.Id, "2026-Q2", ciro: 500_000, ihracat: null,
            calisanSayisi: null, yeniIseAlim: null, yatirimTuru: null, yatirimTutari: null,
            yatirimTarihi: null, yatirimciAdi: null);

        Assert.True(ok);
        Assert.Equal(1, sonuc!.EklenenKayitSayisi);
        Assert.Equal(0, await db.IstihdamKayitlari.CountAsync());
    }

    [Fact]
    public async Task Hicbir_alan_doldurulmazsa_reddedilir()
    {
        var (_, servis, girisim, temsilci) = await KurAsync();

        var (ok, _, hata) = await servis.KaydetAsync(
            girisim.Id, temsilci.Id, "2026-Q2", null, null, null, null, null, null, null, null);

        Assert.False(ok);
        Assert.Contains("En az bir alan", hata);
    }

    [Fact]
    public async Task Ayni_donem_icin_ikinci_ciro_kaydi_reddedilir()
    {
        var (_, servis, girisim, temsilci) = await KurAsync();
        await servis.KaydetAsync(girisim.Id, temsilci.Id, "2026-Q2", 100, null, null, null, null, null, null, null);

        var (ok, _, hata) = await servis.KaydetAsync(
            girisim.Id, temsilci.Id, "2026-Q2", 200, null, null, null, null, null, null, null);

        Assert.False(ok);
        Assert.Contains("zaten bir ciro kaydın var", hata);
    }

    [Fact]
    public async Task Hatirlatma_yalnizca_verisi_eksik_girisimlere_gider()
    {
        var (db, servis, girisim, temsilci) = await KurAsync();
        var simdi = new DateTime(2026, 9, 6);

        var (gonderilenOnce, donem) = await servis.HatirlatmaGonderAsync(simdi);
        Assert.Equal(1, gonderilenOnce);
        Assert.Equal("2026-Q2", donem);

        db.SatisKayitlari.Add(new SatisKaydi { GirisimId = girisim.Id, Donem = donem, Ciro = 100, SubmittedById = temsilci.Id });
        await db.SaveChangesAsync();

        var (gonderilenSonra, _) = await servis.HatirlatmaGonderAsync(simdi);
        Assert.Equal(0, gonderilenSonra);
    }

    [Fact]
    public async Task Temsilcisi_olmayan_girisime_hatirlatma_gonderilmez()
    {
        var (db, servis, _, temsilci) = await KurAsync();
        db.Users.Remove(temsilci);
        await db.SaveChangesAsync();

        var (gonderilen, _) = await servis.HatirlatmaGonderAsync(new DateTime(2026, 9, 6));

        Assert.Equal(0, gonderilen);
    }
}
