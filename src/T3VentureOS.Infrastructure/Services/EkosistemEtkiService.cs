using T3VentureOS.Domain;
using T3VentureOS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace T3VentureOS.Infrastructure.Services;

public record EtkiDonemi(string Donem, decimal Ciro, decimal Ihracat, decimal Yatirim, int Istihdam, int GirisimSayisi);

public record EkosistemEtkisi(
    decimal ToplamCiro,
    decimal ToplamIhracat,
    decimal ToplamYatirim,
    int GuncelIstihdam,
    int IstihdamArtisi,
    int VeriGirenGirisimSayisi,
    int ToplamGirisimSayisi,
    List<EtkiDonemi> Donemler);

/// <summary>
/// Ekosistemin toplam etkisi: girişimlerin tek tek girdiği sayısal veriler dönem bazında
/// birleştirilir. Amaç "T3 ekosistemi ne üretti" sorusunu tek ekranda cevaplamak.
/// </summary>
public class EkosistemEtkiService
{
    private readonly AppDbContext _db;

    public EkosistemEtkiService(AppDbContext db)
    {
        _db = db;
    }

    /// <summary>Yatırım tarihe bağlıdır; ciro/istihdam ise dönem etiketiyle gelir. Ortak eksene çevirir.</summary>
    public static string DonemEtiketi(DateTime tarih) => $"{tarih.Year}-Q{(tarih.Month - 1) / 3 + 1}";

    public async Task<EkosistemEtkisi> GetAsync()
    {
        var satislar = await _db.SatisKayitlari
            .Where(s => s.OnayDurumu == OnayDurumu.Onaylandi)
            .Select(s => new { s.GirisimId, s.Donem, s.Ciro, s.Ihracat })
            .ToListAsync();

        var yatirimlar = await _db.YatirimKayitlari
            .Where(y => y.OnayDurumu == OnayDurumu.Onaylandi)
            .Select(y => new { y.GirisimId, y.Tarih, y.Tutar })
            .ToListAsync();

        var istihdamlar = await _db.IstihdamKayitlari
            .Where(i => i.OnayDurumu == OnayDurumu.Onaylandi)
            .Select(i => new { i.GirisimId, i.Donem, i.CalisanSayisi })
            .ToListAsync();

        var toplamGirisim = await _db.Girisimler.CountAsync();

        var donemler = satislar.Select(s => s.Donem)
            .Concat(istihdamlar.Select(i => i.Donem))
            .Concat(yatirimlar.Select(y => DonemEtiketi(y.Tarih)))
            .Distinct()
            .OrderBy(d => d, StringComparer.Ordinal)
            .ToList();

        // İstihdamı dönem başına düz toplamak yanıltıcıdır: o dönem kayıt girmemiş bir girişimin
        // çalışanları toplamdan düşer ve ekosistem küçülmüş gibi görünür. Bunun yerine her girişim
        // için o döneme kadarki son bilinen çalışan sayısı taşınır.
        var girisimBazliIstihdam = istihdamlar
            .GroupBy(i => i.GirisimId)
            .ToDictionary(
                grup => grup.Key,
                grup => grup.OrderBy(x => x.Donem, StringComparer.Ordinal).ToList());

        var satirlar = new List<EtkiDonemi>();
        foreach (var donem in donemler)
        {
            var donemSatis = satislar.Where(s => s.Donem == donem).ToList();
            var donemYatirim = yatirimlar.Where(y => DonemEtiketi(y.Tarih) == donem).ToList();

            var istihdam = girisimBazliIstihdam.Values
                .Select(kayitlar => kayitlar
                    .Where(k => string.CompareOrdinal(k.Donem, donem) <= 0)
                    .Select(k => (int?)k.CalisanSayisi)
                    .LastOrDefault())
                .Where(sayi => sayi.HasValue)
                .Sum(sayi => sayi!.Value);

            var veriGiren = donemSatis.Select(s => s.GirisimId)
                .Concat(donemYatirim.Select(y => y.GirisimId))
                .Distinct()
                .Count();

            satirlar.Add(new EtkiDonemi(
                donem,
                donemSatis.Sum(s => s.Ciro),
                donemSatis.Sum(s => s.Ihracat ?? 0),
                donemYatirim.Sum(y => y.Tutar),
                istihdam,
                veriGiren));
        }

        var guncelIstihdam = satirlar.Count > 0 ? satirlar[^1].Istihdam : 0;
        var ilkIstihdam = satirlar.Count > 0 ? satirlar[0].Istihdam : 0;

        return new EkosistemEtkisi(
            ToplamCiro: satislar.Sum(s => s.Ciro),
            ToplamIhracat: satislar.Sum(s => s.Ihracat ?? 0),
            ToplamYatirim: yatirimlar.Sum(y => y.Tutar),
            GuncelIstihdam: guncelIstihdam,
            IstihdamArtisi: guncelIstihdam - ilkIstihdam,
            VeriGirenGirisimSayisi: satislar.Select(s => s.GirisimId)
                .Concat(yatirimlar.Select(y => y.GirisimId))
                .Concat(istihdamlar.Select(i => i.GirisimId))
                .Distinct()
                .Count(),
            ToplamGirisimSayisi: toplamGirisim,
            Donemler: satirlar);
    }
}
