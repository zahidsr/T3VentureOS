using T3VentureOS.Domain;
using T3VentureOS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace T3VentureOS.Infrastructure.Services;

public record OnboardingDurumu(
    bool LogoEklendi, bool KisaTanimGirildi, bool IlkSatisKaydiGirildi, bool IlkGelisimAdimiEklendi, bool EmailDogrulandi,
    int TamamlananAdimSayisi, int ToplamAdimSayisi);

/// <summary>Girişim profilinin ne kadar tamamlandığını hesaplar — StartupKullanicisi'nin ilk girişinde gösterilen kontrol listesi.</summary>
public class OnboardingService
{
    private readonly AppDbContext _db;

    public OnboardingService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<OnboardingDurumu?> GetDurumAsync(Guid girisimId)
    {
        var girisim = await _db.Girisimler
            .Include(g => g.GelisimAdimlari)
            .Include(g => g.SatisKayitlari)
            .FirstOrDefaultAsync(g => g.Id == girisimId);
        if (girisim is null) return null;

        var temsilci = await _db.Users.FirstOrDefaultAsync(u => u.GirisimId == girisimId && u.Role == UserRole.StartupKullanicisi);

        var adimlar = new[]
        {
            !string.IsNullOrWhiteSpace(girisim.LogoUrl),
            !string.IsNullOrWhiteSpace(girisim.KisaTanim),
            girisim.SatisKayitlari.Count > 0,
            girisim.GelisimAdimlari.Count > 0,
            temsilci?.EmailVerified ?? false,
        };

        return new OnboardingDurumu(
            adimlar[0], adimlar[1], adimlar[2], adimlar[3], adimlar[4],
            TamamlananAdimSayisi: adimlar.Count(a => a),
            ToplamAdimSayisi: adimlar.Length);
    }
}
