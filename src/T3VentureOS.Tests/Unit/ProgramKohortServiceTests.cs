using T3VentureOS.Domain;
using T3VentureOS.Domain.Entities;
using T3VentureOS.Infrastructure.Services;
using T3VentureOS.Tests.TestSupport;

namespace T3VentureOS.Tests.Unit;

public class ProgramKohortServiceTests
{
    private static ProgramKohortService Servis(Infrastructure.Data.AppDbContext db) =>
        new(db, new GirisimSaglikService(db));

    [Theory]
    [InlineData("2026-Q1", "2026-03-31")]
    [InlineData("2026-Q2", "2026-06-30")]
    [InlineData("2026-Q3", "2026-09-30")]
    [InlineData("2026-Q4", "2026-12-31")]
    public void Donem_bitisi_ceyregin_son_gunudur(string donem, string beklenen)
    {
        Assert.Equal(DateTime.Parse(beklenen), ProgramKohortService.DonemBitisi(donem));
    }

    [Theory]
    [InlineData("bozuk")]
    [InlineData("2026-Q5")]
    [InlineData("2026")]
    public void Gecersiz_donem_null_doner(string donem)
    {
        Assert.Null(ProgramKohortService.DonemBaslangici(donem));
    }

    [Fact]
    public async Task Programin_basladigi_ceyrek_program_suresine_dahildir()
    {
        var db = TestDb.Create();
        var girisim = new Girisim { Ad = "Test", CreatedById = Guid.NewGuid() };
        // Program çeyreğin ortasında başlıyor (5 Ağustos, Q3 içinde).
        var program = new GirisimProgrami { Name = "Program", BaslangicTarihi = new DateTime(2026, 8, 5), CreatedById = Guid.NewGuid() };
        db.Girisimler.Add(girisim);
        db.Programlar.Add(program);
        db.ProgramKatilimlari.Add(new ProgramKatilimi { GirisimId = girisim.Id, ProgramId = program.Id });
        db.SatisKayitlari.AddRange(
            new SatisKaydi { GirisimId = girisim.Id, Donem = "2026-Q2", Ciro = 100, OnayDurumu = OnayDurumu.Onaylandi, SubmittedById = Guid.NewGuid() },
            new SatisKaydi { GirisimId = girisim.Id, Donem = "2026-Q3", Ciro = 500, OnayDurumu = OnayDurumu.Onaylandi, SubmittedById = Guid.NewGuid() });
        await db.SaveChangesAsync();

        var kohort = await Servis(db).GetAsync(program.Id);

        // Çeyreğin başına bakılsaydı Q3 (1 Temmuz) "program öncesi" sayılır ve programın etkisi
        // sıfır görünürdü.
        var satir = Assert.Single(kohort!.Satirlar);
        Assert.Equal(100, satir.ProgramOncesiCiro);
        Assert.Equal(500, satir.ProgramSirasindaCiro);
    }

    [Fact]
    public async Task Istihdam_artisi_program_basi_ile_bugun_arasindaki_farktir()
    {
        var db = TestDb.Create();
        var girisim = new Girisim { Ad = "Test", CreatedById = Guid.NewGuid() };
        var program = new GirisimProgrami { Name = "Program", BaslangicTarihi = new DateTime(2026, 4, 1), CreatedById = Guid.NewGuid() };
        db.Girisimler.Add(girisim);
        db.Programlar.Add(program);
        db.ProgramKatilimlari.Add(new ProgramKatilimi { GirisimId = girisim.Id, ProgramId = program.Id });
        db.IstihdamKayitlari.AddRange(
            new IstihdamKaydi { GirisimId = girisim.Id, Donem = "2026-Q1", CalisanSayisi = 4, OnayDurumu = OnayDurumu.Onaylandi, SubmittedById = Guid.NewGuid() },
            new IstihdamKaydi { GirisimId = girisim.Id, Donem = "2026-Q3", CalisanSayisi = 11, OnayDurumu = OnayDurumu.Onaylandi, SubmittedById = Guid.NewGuid() });
        await db.SaveChangesAsync();

        var kohort = await Servis(db).GetAsync(program.Id);

        Assert.Equal(4, kohort!.Satirlar[0].ProgramBasindaCalisan);
        Assert.Equal(11, kohort.Satirlar[0].GuncelCalisan);
        Assert.Equal(7, kohort.ToplamIstihdamArtisi);
    }

    [Fact]
    public async Task Hic_veri_uretmeyen_girisimler_isaretlenir()
    {
        var db = TestDb.Create();
        var uretken = new Girisim { Ad = "Üretken", CreatedById = Guid.NewGuid() };
        var sessiz = new Girisim { Ad = "Sessiz", CreatedById = Guid.NewGuid() };
        var program = new GirisimProgrami { Name = "Program", BaslangicTarihi = new DateTime(2026, 1, 1), CreatedById = Guid.NewGuid() };
        db.Girisimler.AddRange(uretken, sessiz);
        db.Programlar.Add(program);
        db.ProgramKatilimlari.AddRange(
            new ProgramKatilimi { GirisimId = uretken.Id, ProgramId = program.Id },
            new ProgramKatilimi { GirisimId = sessiz.Id, ProgramId = program.Id });
        db.SatisKayitlari.Add(new SatisKaydi
        {
            GirisimId = uretken.Id, Donem = "2026-Q1", Ciro = 1000, OnayDurumu = OnayDurumu.Onaylandi, SubmittedById = Guid.NewGuid(),
        });
        await db.SaveChangesAsync();

        var kohort = await Servis(db).GetAsync(program.Id);

        Assert.Equal(1, kohort!.VeriGirmeyenGirisimSayisi);
    }

    [Fact]
    public async Task Bilinmeyen_program_null_doner()
    {
        var db = TestDb.Create();
        Assert.Null(await Servis(db).GetAsync(Guid.NewGuid()));
    }
}
