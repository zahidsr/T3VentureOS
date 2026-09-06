using T3VentureOS.Domain;
using T3VentureOS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace T3VentureOS.Infrastructure.Services;

public record KohortSatiri(
    Guid GirisimId,
    string Ad,
    string? Sektor,
    string KatilimDurumu,
    DateTime KatilimBaslangici,
    decimal ProgramOncesiCiro,
    decimal ProgramSirasindaCiro,
    int ProgramBasindaCalisan,
    int GuncelCalisan,
    decimal ProgramSirasindaYatirim,
    GirisimAsamasi? GirisAsamasi,
    GirisimAsamasi CikisAsamasi,
    int AsamaFarki,
    int Puan,
    GirisimSeviyesi Seviye,
    int? GuncellemeUzerindenGecenGun);

public record ProgramKohortu(
    Guid ProgramId,
    string ProgramAdi,
    DateTime? BaslangicTarihi,
    DateTime? BitisTarihi,
    int GirisimSayisi,
    decimal ToplamProgramSirasindaCiro,
    decimal ToplamProgramSirasindaYatirim,
    int ToplamIstihdamArtisi,
    int VeriGirmeyenGirisimSayisi,
    int AsamaAtlayanGirisimSayisi,
    List<KohortSatiri> Satirlar);

/// <summary>
/// Bir programın kohortu: programa katılan girişimlerin program başlangıcından bugüne değişimi.
/// Program yöneticisinin "bu program ne yaptı" sorusunu tek ekranda cevaplar ve fon raporlarına
/// dayanak oluşturur.
/// </summary>
public class ProgramKohortService
{
    /// <summary>Ciro/istihdam kayıtları "2026-Q1" biçiminde; program tarihiyle kıyaslamak için çeyreğin ilk gününe çevrilir.</summary>
    public static DateTime? DonemBaslangici(string donem)
    {
        var parcalar = donem.Split('-');
        if (parcalar.Length != 2 || !int.TryParse(parcalar[0], out var yil)) return null;

        var ceyrek = parcalar[1].TrimStart('Q', 'q');
        if (!int.TryParse(ceyrek, out var q) || q is < 1 or > 4) return null;

        return new DateTime(yil, (q - 1) * 3 + 1, 1);
    }

    /// <summary>
    /// Çeyreğin son günü. Bir dönemin programa mı yoksa öncesine mi sayılacağına çeyreğin bitişine
    /// bakarak karar veririz: program çeyreğin ortasında başladıysa (örn. 5 Ağustos, Q3 içinde) o
    /// çeyreğin tamamını "program öncesi" saymak programın etkisini görünmez kılardı.
    /// </summary>
    public static DateTime? DonemBitisi(string donem)
    {
        var baslangic = DonemBaslangici(donem);
        return baslangic?.AddMonths(3).AddDays(-1);
    }

    private readonly AppDbContext _db;
    private readonly GirisimSaglikService _saglik;

    public ProgramKohortService(AppDbContext db, GirisimSaglikService saglik)
    {
        _db = db;
        _saglik = saglik;
    }

    public async Task<ProgramKohortu?> GetAsync(Guid programId)
    {
        var program = await _db.Programlar.FirstOrDefaultAsync(p => p.Id == programId);
        if (program is null) return null;

        var katilimlar = await _db.ProgramKatilimlari
            .Include(k => k.Girisim)
            .Where(k => k.ProgramId == programId)
            .ToListAsync();

        var girisimIdler = katilimlar.Select(k => k.GirisimId).Distinct().ToList();
        if (girisimIdler.Count == 0)
        {
            return new ProgramKohortu(program.Id, program.Name, program.BaslangicTarihi, program.BitisTarihi,
                0, 0, 0, 0, 0, 0, []);
        }

        var satislar = await _db.SatisKayitlari
            .Where(s => girisimIdler.Contains(s.GirisimId) && s.OnayDurumu == OnayDurumu.Onaylandi)
            .Select(s => new { s.GirisimId, s.Donem, s.Ciro })
            .ToListAsync();

        var yatirimlar = await _db.YatirimKayitlari
            .Where(y => girisimIdler.Contains(y.GirisimId) && y.OnayDurumu == OnayDurumu.Onaylandi)
            .Select(y => new { y.GirisimId, y.Tarih, y.Tutar })
            .ToListAsync();

        var istihdamlar = await _db.IstihdamKayitlari
            .Where(i => girisimIdler.Contains(i.GirisimId) && i.OnayDurumu == OnayDurumu.Onaylandi)
            .Select(i => new { i.GirisimId, i.Donem, i.CalisanSayisi })
            .ToListAsync();

        var saglikMap = (await _saglik.GetTumSaglikAsync(girisimIdler)).ToDictionary(s => s.GirisimId);

        var satirlar = new List<KohortSatiri>();
        foreach (var katilim in katilimlar.OrderBy(k => k.Girisim?.Ad))
        {
            // Programın kendi başlangıcı yoksa girişimin katılım tarihi eşik alınır.
            var esik = program.BaslangicTarihi ?? katilim.BaslangicTarihi;

            var girisimSatislari = satislar.Where(s => s.GirisimId == katilim.GirisimId).ToList();
            var oncesi = girisimSatislari.Where(s => DonemBitisi(s.Donem) is { } d && d < esik).Sum(s => s.Ciro);
            var sirasinda = girisimSatislari.Where(s => DonemBitisi(s.Donem) is { } d && d >= esik).Sum(s => s.Ciro);

            var girisimIstihdam = istihdamlar
                .Where(i => i.GirisimId == katilim.GirisimId)
                .OrderBy(i => i.Donem, StringComparer.Ordinal)
                .ToList();

            var basindaCalisan = girisimIstihdam
                .Where(i => DonemBitisi(i.Donem) is { } d && d < esik)
                .Select(i => i.CalisanSayisi)
                .LastOrDefault();
            var guncelCalisan = girisimIstihdam.Select(i => i.CalisanSayisi).LastOrDefault();

            var saglik = saglikMap.GetValueOrDefault(katilim.GirisimId);

            // Giriş aşaması katılımda dondurulur; henüz bitmemiş katılımlarda "çıkış" bugünkü aşamadır.
            var girisAsamasi = katilim.BaslangictakiAsama;
            var cikisAsamasi = katilim.BitistekiAsama ?? katilim.Girisim?.Asama ?? GirisimAsamasi.Fikir;
            var asamaFarki = girisAsamasi is null ? 0 : (int)cikisAsamasi - (int)girisAsamasi;

            satirlar.Add(new KohortSatiri(
                katilim.GirisimId,
                katilim.Girisim?.Ad ?? string.Empty,
                katilim.Girisim?.Sektor,
                katilim.Durum.ToString(),
                katilim.BaslangicTarihi,
                oncesi,
                sirasinda,
                basindaCalisan,
                guncelCalisan,
                yatirimlar.Where(y => y.GirisimId == katilim.GirisimId && y.Tarih >= esik).Sum(y => y.Tutar),
                girisAsamasi,
                cikisAsamasi,
                asamaFarki,
                saglik?.Puan ?? 0,
                saglik?.Seviye ?? GirisimSeviyesi.Bronz,
                saglik is null || saglik.GuncellemeUzerindenGecenGun == int.MaxValue
                    ? null
                    : saglik.GuncellemeUzerindenGecenGun));
        }

        return new ProgramKohortu(
            program.Id,
            program.Name,
            program.BaslangicTarihi,
            program.BitisTarihi,
            satirlar.Count,
            satirlar.Sum(s => s.ProgramSirasindaCiro),
            satirlar.Sum(s => s.ProgramSirasindaYatirim),
            satirlar.Sum(s => s.GuncelCalisan - s.ProgramBasindaCalisan),
            // Programa girdiğinden beri hiç veri girmemiş girişimler: yöneticinin peşine düşeceği liste.
            satirlar.Count(s => s.ProgramSirasindaCiro == 0 && s.ProgramSirasindaYatirim == 0
                                && s.GuncelCalisan == s.ProgramBasindaCalisan),
            satirlar.Count(s => s.AsamaFarki > 0),
            satirlar);
    }
}
