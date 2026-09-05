using T3VentureOS.Domain;
using T3VentureOS.Domain.Entities;
using T3VentureOS.Infrastructure.Services;

namespace T3VentureOS.Tests.Unit;

public class PitchDeckServiceTests
{
    private static Girisim OrnekGirisim() => new()
    {
        Ad = "Test Girişim",
        Sektor = "Yapay Zekâ",
        KisaTanim = "Kalite kontrol otomasyonu.",
        KurulusYili = 2023,
        EkipBuyuklugu = 6,
        CreatedById = Guid.NewGuid(),
    };

    [Fact]
    public void Ayristir_kod_blogu_icindeki_json_u_cozer()
    {
        var yanit = """
        İşte sunumunuz:
        ```json
        [{"anahtar":"amac","icerik":"Tek cümlelik amaç."},
         {"anahtar":"problem","icerik":"Problem tanımı."}]
        ```
        """;

        var bolumler = PitchDeckService.Ayristir(yanit);

        Assert.Equal(PitchDeckService.Sablon.Length, bolumler.Count);
        Assert.Equal("Tek cümlelik amaç.", bolumler.Single(b => b.Anahtar == "amac").Icerik);
        Assert.Equal("Problem tanımı.", bolumler.Single(b => b.Anahtar == "problem").Icerik);
    }

    [Fact]
    public void Ayristir_eksik_bolumleri_sablona_gore_tamamlar()
    {
        var bolumler = PitchDeckService.Ayristir("""[{"anahtar":"amac","icerik":"Sadece amaç."}]""");

        // Model bölüm atlarsa sunum iskeleti bozulmamalı; eksikler açıkça işaretlenir.
        Assert.Equal(PitchDeckService.Sablon.Length, bolumler.Count);
        Assert.All(bolumler, b => Assert.False(string.IsNullOrWhiteSpace(b.Icerik)));
        Assert.Contains("yeterli veri yok", bolumler.Single(b => b.Anahtar == "finansal").Icerik);
    }

    [Fact]
    public void Ayristir_sablonda_olmayan_anahtari_yok_sayar()
    {
        var bolumler = PitchDeckService.Ayristir("""[{"anahtar":"uydurma_bolum","icerik":"Şablonda yok."}]""");

        Assert.Equal(PitchDeckService.Sablon.Length, bolumler.Count);
        Assert.DoesNotContain(bolumler, b => b.Anahtar == "uydurma_bolum");
    }

    [Theory]
    [InlineData("json degil")]
    [InlineData("[bozuk json")]
    [InlineData("")]
    public void Ayristir_cozumlenemeyen_yanitta_bos_doner(string yanit)
    {
        Assert.Empty(PitchDeckService.Ayristir(yanit));
    }

    [Fact]
    public void Parmak_izi_ayni_veride_degismez()
    {
        var a = PitchDeckService.VeriParmakIziHesapla(OrnekGirisim());
        var b = PitchDeckService.VeriParmakIziHesapla(OrnekGirisim());

        Assert.Equal(a, b);
    }

    [Fact]
    public void Parmak_izi_onayli_yatirim_eklenince_degisir()
    {
        var girisim = OrnekGirisim();
        var once = PitchDeckService.VeriParmakIziHesapla(girisim);

        girisim.YatirimKayitlari.Add(new YatirimKaydi
        {
            GirisimId = girisim.Id, Tur = YatirimTuru.Tohum, Tutar = 5_000_000, Tarih = DateTime.UtcNow,
            SubmittedById = Guid.NewGuid(), OnayDurumu = OnayDurumu.Onaylandi,
        });

        Assert.NotEqual(once, PitchDeckService.VeriParmakIziHesapla(girisim));
    }

    [Fact]
    public void Parmak_izi_onay_bekleyen_kayittan_etkilenmez()
    {
        var girisim = OrnekGirisim();
        var once = PitchDeckService.VeriParmakIziHesapla(girisim);

        girisim.SatisKayitlari.Add(new SatisKaydi
        {
            GirisimId = girisim.Id, Donem = "2026-Q3", Ciro = 100_000, SubmittedById = Guid.NewGuid(),
            OnayDurumu = OnayDurumu.Beklemede,
        });

        // Sunum yalnızca onaylı veriye dayanır; onaylanmamış kayıt sunumu "eskimiş" saymamalı.
        Assert.Equal(once, PitchDeckService.VeriParmakIziHesapla(girisim));
    }

    [Fact]
    public void Prompt_onaysiz_kayitlari_disarida_birakir()
    {
        var girisim = OrnekGirisim();
        girisim.SatisKayitlari.Add(new SatisKaydi
        {
            GirisimId = girisim.Id, Donem = "2026-Q3", Ciro = 999_999, SubmittedById = Guid.NewGuid(),
            OnayDurumu = OnayDurumu.Beklemede,
        });

        var prompt = PitchDeckService.PromptOlustur(girisim);

        Assert.DoesNotContain("999.999", prompt);
        Assert.Contains("Test Girişim", prompt);
        Assert.Contains("UYDURMA", prompt);
    }
}
