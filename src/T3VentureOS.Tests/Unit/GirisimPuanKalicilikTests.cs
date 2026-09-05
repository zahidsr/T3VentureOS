using T3VentureOS.Domain;
using T3VentureOS.Domain.Entities;
using T3VentureOS.Tests.TestSupport;
using Microsoft.EntityFrameworkCore;

namespace T3VentureOS.Tests.Unit;

/// <summary>
/// Puan türetilmiş bir değer ama tabloda tutuluyor. Bu testler asıl riski hedefler: kaydedilen
/// puanın canlı veriyle uyumsuz kalması.
/// </summary>
public class GirisimPuanKalicilikTests
{
    [Fact]
    public async Task Girisim_olusturulunca_puan_hesaplanir()
    {
        var db = TestDb.Create();
        db.Girisimler.Add(new Girisim { Ad = "Test", KisaTanim = "Bir tanım", CreatedById = Guid.NewGuid() });
        await db.SaveChangesAsync();

        // Kısa tanım tek başına 15 puan.
        Assert.Equal(15, (await db.Girisimler.SingleAsync()).Puan);
    }

    [Fact]
    public async Task Gelisim_adimi_eklenince_puan_kendiliginden_tazelenir()
    {
        var db = TestDb.Create();
        var girisim = new Girisim { Ad = "Test", CreatedById = Guid.NewGuid() };
        db.Girisimler.Add(girisim);
        await db.SaveChangesAsync();
        var once = (await db.Girisimler.SingleAsync()).Puan;

        db.GelisimAdimlari.Add(new GelisimAdimi { GirisimId = girisim.Id, Baslik = "Adım", Tarih = DateTime.UtcNow });
        await db.SaveChangesAsync();

        // Servise ayrıca "puanı güncelle" çağrısı yapılmadı; kaydetmenin kendisi tazeledi.
        Assert.Equal(once + 2, (await db.Girisimler.SingleAsync()).Puan);
    }

    [Fact]
    public async Task Onay_bekleyen_kayit_puani_degistirmez_onaylaninca_degistirir()
    {
        var db = TestDb.Create();
        var girisim = new Girisim { Ad = "Test", CreatedById = Guid.NewGuid() };
        db.Girisimler.Add(girisim);
        var satis = new SatisKaydi
        {
            GirisimId = girisim.Id, Donem = "2026-Q1", Ciro = 1000, SubmittedById = Guid.NewGuid(),
            OnayDurumu = OnayDurumu.Beklemede,
        };
        db.SatisKayitlari.Add(satis);
        await db.SaveChangesAsync();
        var bekleyenkenPuan = (await db.Girisimler.SingleAsync()).Puan;

        satis.OnayDurumu = OnayDurumu.Onaylandi;
        await db.SaveChangesAsync();

        Assert.Equal(0, bekleyenkenPuan);
        Assert.Equal(5, (await db.Girisimler.SingleAsync()).Puan);
    }

    [Fact]
    public async Task Iletisim_kisisi_eklenince_puan_artar()
    {
        var db = TestDb.Create();
        var girisim = new Girisim { Ad = "Test", CreatedById = Guid.NewGuid() };
        db.Girisimler.Add(girisim);
        await db.SaveChangesAsync();

        db.GirisimContactlar.Add(new GirisimContact { GirisimId = girisim.Id, AdSoyad = "Yetkili" });
        await db.SaveChangesAsync();

        Assert.Equal(15, (await db.Girisimler.SingleAsync()).Puan);
    }

    [Fact]
    public async Task Ilgisiz_bir_kayit_puan_tazelemesini_tetiklemez()
    {
        var db = TestDb.Create();
        var girisim = new Girisim { Ad = "Test", KisaTanim = "Tanım", CreatedById = Guid.NewGuid() };
        db.Girisimler.Add(girisim);
        await db.SaveChangesAsync();

        db.Users.Add(new User { Email = "a@b.local", FullName = "Biri", Role = UserRole.SuperAdmin });
        await db.SaveChangesAsync();

        Assert.Equal(15, (await db.Girisimler.SingleAsync()).Puan);
    }
}
