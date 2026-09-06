using System.Security.Cryptography;
using T3VentureOS.Domain.Entities;
using T3VentureOS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace T3VentureOS.Infrastructure.Services;

public record PaylasimOzeti(
    Guid Id, string Jeton, string? Etiket, DateTime GecerlilikBitisi, bool IptalEdildi,
    bool Gecerli, int GoruntulenmeSayisi, DateTime? SonGoruntulenme, DateTime CreatedAt);

/// <summary>Bağlantıyı açan kişinin gördüğü içerik — yalnızca künye ve sunum bölümleri.</summary>
public record PaylasilanSunum(
    string GirisimAdi, string? Sektor, string? KisaTanim, string? LogoUrl, int? KurulusYili,
    string? IletisimAdSoyad, string? IletisimUnvan, string? IletisimEmail,
    List<PitchDeckBolumu> Bolumler, DateTime SunumTarihi);

/// <summary>
/// Sunumun sistem dışına açılması. Giriş yapmamış birine içerik gösterildiği için erişim üç
/// koşula bağlıdır: geçerli jeton, dolmamış süre, iptal edilmemiş bağlantı.
/// </summary>
public class SunumPaylasimService
{
    /// <summary>Girişimcinin seçebileceği süreler; sınırsız bir seçenek bilinçli olarak yok.</summary>
    public static readonly int[] GecerliGunSecenekleri = [7, 30, 90];

    private readonly AppDbContext _db;

    public SunumPaylasimService(AppDbContext db)
    {
        _db = db;
    }

    /// <summary>256 bitlik rastgelelik; URL'de güvenle taşınabilsin diye base64url.</summary>
    public static string JetonUret() =>
        Convert.ToBase64String(RandomNumberGenerator.GetBytes(32))
            .Replace('+', '-').Replace('/', '_').TrimEnd('=');

    public Task<List<SunumPaylasimi>> ListeleAsync(Guid girisimId) =>
        _db.SunumPaylasimlari
            .Where(p => p.GirisimId == girisimId)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync();

    public async Task<(bool Success, SunumPaylasimi? Paylasim, string? Error)> OlusturAsync(
        Guid girisimId, Guid kullaniciId, int gecerlilikGun, string? etiket)
    {
        if (!GecerliGunSecenekleri.Contains(gecerlilikGun))
            return (false, null, "Geçersiz geçerlilik süresi.");

        // Paylaşacak bir sunum yoksa bağlantı üretmek boş bir sayfa paylaşmak olur.
        var sunumVar = await _db.SunumTaslaklari.AnyAsync(t => t.GirisimId == girisimId);
        if (!sunumVar) return (false, null, "Önce sunum taslağını oluşturmalısın.");

        var paylasim = new SunumPaylasimi
        {
            GirisimId = girisimId,
            Jeton = JetonUret(),
            Etiket = string.IsNullOrWhiteSpace(etiket) ? null : etiket.Trim(),
            GecerlilikBitisi = DateTime.UtcNow.AddDays(gecerlilikGun),
            OlusturanId = kullaniciId,
        };
        _db.SunumPaylasimlari.Add(paylasim);
        await _db.SaveChangesAsync();
        return (true, paylasim, null);
    }

    public async Task<bool> IptalEtAsync(Guid girisimId, Guid paylasimId)
    {
        var paylasim = await _db.SunumPaylasimlari
            .FirstOrDefaultAsync(p => p.Id == paylasimId && p.GirisimId == girisimId);
        if (paylasim is null) return false;

        paylasim.IptalEdildi = true;
        await _db.SaveChangesAsync();
        return true;
    }

    /// <summary>
    /// Bağlantıyı açan ziyaretçiye dönen içerik. Geçersiz jeton, dolmuş süre ve iptal edilmiş
    /// bağlantı aynı sonucu verir (null): dışarıdan bakan biri bir bağlantının hiç var olmadığını
    /// mı yoksa iptal mi edildiğini ayırt edemesin.
    /// </summary>
    public async Task<PaylasilanSunum?> GoruntuleAsync(string jeton)
    {
        var paylasim = await _db.SunumPaylasimlari
            .Include(p => p.Girisim).ThenInclude(g => g!.Contact)
            .FirstOrDefaultAsync(p => p.Jeton == jeton);

        if (paylasim is null || !paylasim.Gecerli(DateTime.UtcNow)) return null;

        var taslak = await _db.SunumTaslaklari.FirstOrDefaultAsync(t => t.GirisimId == paylasim.GirisimId);
        if (taslak is null) return null;

        paylasim.GoruntulenmeSayisi += 1;
        paylasim.SonGoruntulenme = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        var girisim = paylasim.Girisim!;
        return new PaylasilanSunum(
            girisim.Ad, girisim.Sektor, girisim.KisaTanim, girisim.LogoUrl, girisim.KurulusYili,
            girisim.Contact?.AdSoyad, girisim.Contact?.Unvan, girisim.Contact?.Email,
            PitchDeckService.BolumleriOku(taslak.IcerikJson), taslak.UpdatedAt);
    }
}
