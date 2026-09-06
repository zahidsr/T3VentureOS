using T3VentureOS.Domain;
using T3VentureOS.Domain.Entities;
using T3VentureOS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace T3VentureOS.Infrastructure.Services;

public record AsamaGecisiOzeti(
    Guid Id, GirisimAsamasi? OncekiAsama, GirisimAsamasi YeniAsama, DateTime Tarih,
    string? Aciklama, string DegistirenAdSoyad);

/// <summary>
/// Girişimin ürün olgunluk aşamasını ve aşama geçmişini yönetir.
///
/// Aşama değişimi yalnızca bir alanı güncellemek değildir: her değişim kayda geçer, çünkü bu
/// sistemin asıl sorusu "şu an ne durumda" değil "programdan önce neydi, sonra ne oldu".
/// </summary>
public class AsamaService
{
    private readonly AppDbContext _db;

    public AsamaService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<AsamaGecisiOzeti>> GecmisAsync(Guid girisimId)
    {
        var gecisler = await _db.AsamaGecisleri
            .Include(g => g.Degistiren)
            .Where(g => g.GirisimId == girisimId)
            .OrderByDescending(g => g.Tarih)
            .ToListAsync();

        return gecisler
            .Select(g => new AsamaGecisiOzeti(
                g.Id, g.OncekiAsama, g.YeniAsama, g.Tarih, g.Aciklama, g.Degistiren?.FullName ?? string.Empty))
            .ToList();
    }

    public async Task<(bool Success, string? Error)> AsamaDegistirAsync(
        Guid girisimId, GirisimAsamasi yeniAsama, DateTime? tarih, string? aciklama, Guid kullaniciId)
    {
        var girisim = await _db.Girisimler.FirstOrDefaultAsync(g => g.Id == girisimId);
        if (girisim is null) return (false, "Girişim bulunamadı.");

        var oncekiAsama = girisim.Asama;
        var hicGecisVar = await _db.AsamaGecisleri.AnyAsync(g => g.GirisimId == girisimId);

        // Aynı aşamayı yeniden seçmek geçmişi gereksiz kayıtla şişirmesin; ilk kayıt istisnadır
        // çünkü başlangıç aşamasının da bir tarihi olmalı.
        if (hicGecisVar && oncekiAsama == yeniAsama)
            return (false, "Girişim zaten bu aşamada.");

        var gecisTarihi = tarih ?? DateTime.UtcNow;
        if (gecisTarihi > DateTime.UtcNow.AddDays(1))
            return (false, "Geçiş tarihi gelecekte olamaz.");

        girisim.Asama = yeniAsama;
        girisim.UpdatedAt = DateTime.UtcNow;

        _db.AsamaGecisleri.Add(new AsamaGecisi
        {
            GirisimId = girisimId,
            OncekiAsama = hicGecisVar ? oncekiAsama : null,
            YeniAsama = yeniAsama,
            Tarih = gecisTarihi,
            Aciklama = string.IsNullOrWhiteSpace(aciklama) ? null : aciklama.Trim(),
            DegistirenId = kullaniciId,
        });

        await _db.SaveChangesAsync();
        return (true, null);
    }

    /// <summary>
    /// Bir girişimin verilen tarihteki aşaması. Program giriş/çıkış fotoğrafı alınırken ve
    /// geçmişe dönük raporlarda kullanılır.
    /// </summary>
    public static GirisimAsamasi? TarihtekiAsama(IEnumerable<AsamaGecisi> gecisler, DateTime tarih)
    {
        var oncekiler = gecisler.Where(g => g.Tarih <= tarih).OrderBy(g => g.Tarih).ToList();
        if (oncekiler.Count > 0) return oncekiler[^1].YeniAsama;

        // Tarihten önce hiç geçiş yoksa, bilinen ilk geçişin öncesindeki aşama geçerlidir.
        var ilk = gecisler.OrderBy(g => g.Tarih).FirstOrDefault();
        return ilk?.OncekiAsama;
    }
}
