using System.Security.Cryptography;
using T3VentureOS.Domain;
using T3VentureOS.Domain.Entities;
using T3VentureOS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace T3VentureOS.Infrastructure.Services;

/// <summary>Bağlantıyı açan kişinin gördüğü içerik — ciro/yatırım gibi finansal kayıtlar hiç dönmez.</summary>
public record PaylasilanCv(
    string GirisimAdi, string? Sektor, string? KisaTanim, string? Teknoloji, string? WebsiteUrl,
    string? LogoUrl, string? KapakGorseliUrl, int? KurulusYili, int? EkipBuyuklugu,
    string? IletisimAdSoyad, string? IletisimUnvan, string? IletisimEmail,
    List<ProgramKatilimi> ProgramKatilimlari, List<GelisimAdimi> GelisimAdimlari, List<Basari> Basarilar,
    DateTime GuncellemeTarihi);

/// <summary>
/// Girişimin "Şirket CV'si"nin sistem dışına açılması. Giriş yapmamış birine içerik gösterildiği
/// için erişim üç koşula bağlıdır: geçerli jeton, dolmamış süre, iptal edilmemiş bağlantı. Sunum
/// paylaşımından farklı olarak paylaşılacak bir taslağın önceden üretilmiş olması gerekmez — CV
/// doğrudan girişimin profilinden türetilir.
/// </summary>
public class GirisimCvPaylasimService
{
    /// <summary>Girişimcinin seçebileceği süreler; sınırsız bir seçenek bilinçli olarak yok.</summary>
    public static readonly int[] GecerliGunSecenekleri = [7, 30, 90];

    private readonly AppDbContext _db;

    public GirisimCvPaylasimService(AppDbContext db)
    {
        _db = db;
    }

    /// <summary>256 bitlik rastgelelik; URL'de güvenle taşınabilsin diye base64url.</summary>
    public static string JetonUret() =>
        Convert.ToBase64String(RandomNumberGenerator.GetBytes(32))
            .Replace('+', '-').Replace('/', '_').TrimEnd('=');

    public Task<List<GirisimCvPaylasimi>> ListeleAsync(Guid girisimId) =>
        _db.GirisimCvPaylasimlari
            .Where(p => p.GirisimId == girisimId)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync();

    public async Task<(bool Success, GirisimCvPaylasimi? Paylasim, string? Error)> OlusturAsync(
        Guid girisimId, Guid kullaniciId, int gecerlilikGun, string? etiket)
    {
        if (!GecerliGunSecenekleri.Contains(gecerlilikGun))
            return (false, null, "Geçersiz geçerlilik süresi.");

        var paylasim = new GirisimCvPaylasimi
        {
            GirisimId = girisimId,
            Jeton = JetonUret(),
            Etiket = string.IsNullOrWhiteSpace(etiket) ? null : etiket.Trim(),
            GecerlilikBitisi = DateTime.UtcNow.AddDays(gecerlilikGun),
            OlusturanId = kullaniciId,
        };
        _db.GirisimCvPaylasimlari.Add(paylasim);
        await _db.SaveChangesAsync();
        return (true, paylasim, null);
    }

    public async Task<bool> IptalEtAsync(Guid girisimId, Guid paylasimId)
    {
        var paylasim = await _db.GirisimCvPaylasimlari
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
    public async Task<PaylasilanCv?> GoruntuleAsync(string jeton)
    {
        var paylasim = await _db.GirisimCvPaylasimlari
            .Include(p => p.Girisim).ThenInclude(g => g!.Contact)
            .Include(p => p.Girisim).ThenInclude(g => g!.ProgramKatilimlari).ThenInclude(k => k.Program)
            .Include(p => p.Girisim).ThenInclude(g => g!.GelisimAdimlari)
            .Include(p => p.Girisim).ThenInclude(g => g!.Basarilar)
            .FirstOrDefaultAsync(p => p.Jeton == jeton);

        if (paylasim is null || !paylasim.Gecerli(DateTime.UtcNow)) return null;

        paylasim.GoruntulenmeSayisi += 1;
        paylasim.SonGoruntulenme = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        var girisim = paylasim.Girisim!;
        return new PaylasilanCv(
            girisim.Ad, girisim.Sektor, girisim.KisaTanim, girisim.Teknoloji, girisim.WebsiteUrl,
            girisim.LogoUrl, girisim.KapakGorseliUrl, girisim.KurulusYili, girisim.EkipBuyuklugu,
            girisim.Contact?.AdSoyad, girisim.Contact?.Unvan, girisim.Contact?.Email,
            girisim.ProgramKatilimlari.OrderByDescending(k => k.BaslangicTarihi).ToList(),
            girisim.GelisimAdimlari.OrderByDescending(a => a.Tarih).ToList(),
            girisim.Basarilar.Where(b => b.OnayDurumu == OnayDurumu.Onaylandi).OrderByDescending(b => b.Tarih).ToList(),
            girisim.UpdatedAt);
    }
}
