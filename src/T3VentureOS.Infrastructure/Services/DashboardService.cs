using T3VentureOS.Domain;
using T3VentureOS.Domain.Entities;
using T3VentureOS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace T3VentureOS.Infrastructure.Services;

public record SektorSayisi(string Sektor, int Sayi);
public record YatirimTuruDagilimi(string Tur, decimal ToplamTutar);
public record AylikTrend(string Ay, decimal Ciro, decimal Yatirim);

public record DashboardStats(
    int ToplamGirisim,
    int AktifProgramSayisi,
    int BekleyenOnaySayisi,
    decimal ToplamOnayliYatirim,
    decimal ToplamOnayliCiro,
    List<SektorSayisi> SektorDagilimi,
    List<YatirimTuruDagilimi> YatirimTuruDagilimi,
    List<AylikTrend> AylikTrend);

/// <summary>Aggregate figures for the Karar Verici (decision maker) read-only dashboard.</summary>
public class DashboardService
{
    private readonly AppDbContext _db;

    public DashboardService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<DashboardStats> GetStatsAsync()
    {
        var toplamGirisim = await _db.Girisimler.CountAsync();
        var aktifProgram = await _db.Programlar.CountAsync(p => p.Durum == ProgramDurumu.Aktif);

        var bekleyenSatis = await _db.SatisKayitlari.CountAsync(s => s.OnayDurumu == OnayDurumu.Beklemede);
        var bekleyenYatirim = await _db.YatirimKayitlari.CountAsync(y => y.OnayDurumu == OnayDurumu.Beklemede);
        var bekleyenBasari = await _db.Basarilar.CountAsync(b => b.OnayDurumu == OnayDurumu.Beklemede);
        var bekleyenDokuman = await _db.Dokumanlar.CountAsync(d => d.OnayDurumu == OnayDurumu.Beklemede);
        var bekleyenGuncelleme = await _db.GirisimGuncellemeTalepleri.CountAsync(t => t.OnayDurumu == OnayDurumu.Beklemede);

        var toplamYatirim = await _db.YatirimKayitlari
            .Where(y => y.OnayDurumu == OnayDurumu.Onaylandi)
            .SumAsync(y => (decimal?)y.Tutar) ?? 0;

        var toplamCiro = await _db.SatisKayitlari
            .Where(s => s.OnayDurumu == OnayDurumu.Onaylandi)
            .SumAsync(s => (decimal?)s.Ciro) ?? 0;

        var sektorGruplari = await _db.Girisimler
            .Where(g => g.Sektor != null && g.Sektor != "")
            .GroupBy(g => g.Sektor!)
            .Select(g => new { Sektor = g.Key, Sayi = g.Count() })
            .OrderByDescending(x => x.Sayi)
            .ToListAsync();
        var sektorDagilimi = sektorGruplari.Select(x => new SektorSayisi(x.Sektor, x.Sayi)).ToList();

        var yatirimTuruGruplari = await _db.YatirimKayitlari
            .Where(y => y.OnayDurumu == OnayDurumu.Onaylandi)
            .GroupBy(y => y.Tur)
            .Select(g => new { Tur = g.Key, Toplam = g.Sum(y => y.Tutar) })
            .OrderByDescending(x => x.Toplam)
            .ToListAsync();
        var yatirimTuruDagilimi = yatirimTuruGruplari.Select(x => new YatirimTuruDagilimi(x.Tur.ToString(), x.Toplam)).ToList();

        var aylikTrend = await GetAylikTrendAsync();

        return new DashboardStats(
            toplamGirisim,
            aktifProgram,
            bekleyenSatis + bekleyenYatirim + bekleyenBasari + bekleyenDokuman + bekleyenGuncelleme,
            toplamYatirim,
            toplamCiro,
            sektorDagilimi,
            yatirimTuruDagilimi,
            aylikTrend);
    }

    public static string BuildAiPrompt(DashboardStats s)
    {
        var sektorText = s.SektorDagilimi.Count == 0
            ? "veri yok"
            : string.Join(", ", s.SektorDagilimi.Select(x => $"{x.Sektor}: {x.Sayi}"));
        var yatirimTuruText = s.YatirimTuruDagilimi.Count == 0
            ? "veri yok"
            : string.Join(", ", s.YatirimTuruDagilimi.Select(x => $"{x.Tur}: {x.ToplamTutar:N0} TRY"));
        var trendText = string.Join(" | ", s.AylikTrend.Select(x => $"{x.Ay} → Ciro: {x.Ciro:N0} TRY, Yatırım: {x.Yatirim:N0} TRY"));

        return
            $"""
            Sen T3 Vakfı Girişim Ekosistemi Yönetim Sistemi için bir karar destek asistanısın. Aşağıdaki platform
            verilerine dayanarak Türkçe, kısa ve öz (madde işaretli, 4-6 madde) bir analiz yaz. Trendleri yorumla,
            dikkat çekici noktaları vurgula ve karar vericiye somut 1-2 öneri sun. Süslü giriş/kapanış cümlesi yazma,
            doğrudan maddelerle başla. Veri azsa (örn. tek girişim, kısa geçmiş) bunu doğal karşıla, abartılı yorum
            yapma.

            Toplam Girişim: {s.ToplamGirisim}
            Aktif Program: {s.AktifProgramSayisi}
            Bekleyen Onay: {s.BekleyenOnaySayisi}
            Toplam Onaylı Yatırım: {s.ToplamOnayliYatirim:N0} TRY
            Toplam Onaylı Ciro: {s.ToplamOnayliCiro:N0} TRY
            Sektör Dağılımı: {sektorText}
            Yatırım Türü Dağılımı: {yatirimTuruText}
            Aylık Trend (son 6 ay): {trendText}
            """;
    }

    /// <summary>Persists a generated AI analysis so it survives past the current browser session.</summary>
    public async Task<AiAnalizKaydi> SaveAiAnalizAsync(Guid userId, string metin)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);
        var kayit = new AiAnalizKaydi
        {
            CreatedById = userId,
            CreatedByAdSoyad = user?.FullName ?? string.Empty,
            Metin = metin,
        };
        _db.AiAnalizKayitlari.Add(kayit);
        await _db.SaveChangesAsync();
        return kayit;
    }

    public Task<List<AiAnalizKaydi>> ListAiAnalizGecmisiAsync(int limit = 10) =>
        _db.AiAnalizKayitlari.OrderByDescending(a => a.CreatedAt).Take(limit).ToListAsync();

    private static readonly string[] AyKisaltmalari =
        { "Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara" };

    /// <summary>Son 6 ay için onaylı ciro/yatırım toplamı — kayıtların gönderildiği (CreatedAt) aya göre gruplanır.</summary>
    private async Task<List<AylikTrend>> GetAylikTrendAsync()
    {
        var windowStart = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1).AddMonths(-5);

        var satisAylik = await _db.SatisKayitlari
            .Where(s => s.OnayDurumu == OnayDurumu.Onaylandi && s.CreatedAt >= windowStart)
            .GroupBy(s => new { s.CreatedAt.Year, s.CreatedAt.Month })
            .Select(g => new { g.Key.Year, g.Key.Month, Toplam = g.Sum(s => s.Ciro) })
            .ToListAsync();

        var yatirimAylik = await _db.YatirimKayitlari
            .Where(y => y.OnayDurumu == OnayDurumu.Onaylandi && y.CreatedAt >= windowStart)
            .GroupBy(y => new { y.CreatedAt.Year, y.CreatedAt.Month })
            .Select(g => new { g.Key.Year, g.Key.Month, Toplam = g.Sum(y => y.Tutar) })
            .ToListAsync();

        var result = new List<AylikTrend>();
        for (var i = 0; i < 6; i++)
        {
            var d = windowStart.AddMonths(i);
            var ciro = satisAylik.FirstOrDefault(x => x.Year == d.Year && x.Month == d.Month)?.Toplam ?? 0;
            var yatirim = yatirimAylik.FirstOrDefault(x => x.Year == d.Year && x.Month == d.Month)?.Toplam ?? 0;
            result.Add(new AylikTrend($"{AyKisaltmalari[d.Month - 1]} {d.Year}", ciro, yatirim));
        }
        return result;
    }
}
