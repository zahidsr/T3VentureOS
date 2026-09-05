using T3VentureOS.Domain;
using T3VentureOS.Infrastructure.Services;

namespace T3VentureOS.Tests.Unit;

public class GirisimPuanTests
{
    private static (int Puan, List<SonrakiAdim> Adimlar) Puan(
        bool logo = false, bool tanim = false, bool iletisim = false, bool sunum = false,
        int satis = 0, int yatirim = 0, int basari = 0, int gelisim = 0) =>
        GirisimSaglikService.PuanHesapla(logo, tanim, iletisim, sunum, satis, yatirim, basari, gelisim);

    [Fact]
    public void Bos_profil_sifir_puan_alir()
    {
        var (puan, adimlar) = Puan();

        Assert.Equal(0, puan);
        Assert.NotEmpty(adimlar);
    }

    [Fact]
    public void Tam_doldurulmus_profil_100_puana_ulasir()
    {
        var (puan, adimlar) = Puan(logo: true, tanim: true, iletisim: true, sunum: true,
            satis: 4, yatirim: 2, basari: 2, gelisim: 5);

        Assert.Equal(100, puan);
        Assert.Empty(adimlar);
    }

    [Fact]
    public void Puan_100u_asamaz()
    {
        var (puan, _) = Puan(logo: true, tanim: true, iletisim: true, sunum: true,
            satis: 99, yatirim: 99, basari: 99, gelisim: 99);

        Assert.Equal(100, puan);
    }

    [Fact]
    public void Kayit_sayisi_azalan_getiriyle_sayilir()
    {
        var (dortKayit, _) = Puan(satis: 4);
        var (yirmiKayit, _) = Puan(satis: 20);

        // Aynı kaydı defalarca girmek puan kasmaya dönüşmemeli.
        Assert.Equal(dortKayit, yirmiKayit);
    }

    [Fact]
    public void Sonraki_adimlar_en_cok_puan_getirenden_baslar()
    {
        var (_, adimlar) = Puan();

        var puanlar = adimlar.Select(a => a.Puan).ToList();
        Assert.Equal(puanlar.OrderByDescending(p => p), puanlar);
    }

    [Fact]
    public void Tamamlanan_adim_sonraki_adimlar_listesinden_cikar()
    {
        var (_, once) = Puan();
        var (_, sonra) = Puan(iletisim: true);

        Assert.Contains(once, a => a.Aciklama.Contains("İletişim muhatabını"));
        Assert.DoesNotContain(sonra, a => a.Aciklama.Contains("İletişim muhatabını"));
    }

    [Theory]
    [InlineData(0, GirisimSeviyesi.Bronz)]
    [InlineData(39, GirisimSeviyesi.Bronz)]
    [InlineData(40, GirisimSeviyesi.Gumus)]
    [InlineData(64, GirisimSeviyesi.Gumus)]
    [InlineData(65, GirisimSeviyesi.Altin)]
    [InlineData(84, GirisimSeviyesi.Altin)]
    [InlineData(85, GirisimSeviyesi.Platin)]
    [InlineData(100, GirisimSeviyesi.Platin)]
    public void Seviye_esikleri(int puan, GirisimSeviyesi beklenen)
    {
        Assert.Equal(beklenen, GirisimSaglikService.SeviyeBelirle(puan));
    }

    [Fact]
    public void Veri_eklemek_puani_asla_dusurmez()
    {
        // Puanın tek yönlü olması ürün kararıdır: girişimcinin emeği geri alınmaz.
        var (once, _) = Puan(tanim: true, satis: 2);
        var (sonra, _) = Puan(tanim: true, satis: 2, gelisim: 1);

        Assert.True(sonra > once);
    }
}
