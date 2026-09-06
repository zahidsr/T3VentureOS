using T3VentureOS.Domain;
using T3VentureOS.Domain.Entities;
using T3VentureOS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace T3VentureOS.Infrastructure.Services;

public record VeriIhraciDto(
    Guid KullaniciId, string Email, string FullName, string Role, DateTime HesapOlusturmaTarihi,
    object? Girisim);

/// <summary>KVKK/GDPR self-servis: kendi verini dışa aktarma (veri taşınabilirliği) ve hesap silme talebi.</summary>
public class PrivacyService
{
    private readonly AppDbContext _db;

    public PrivacyService(AppDbContext db)
    {
        _db = db;
    }

    /// <summary>Returns everything the platform holds about this user — their profile, and if they're a
    /// StartupKullanicisi, their Girisim's full submitted record history.</summary>
    public async Task<VeriIhraciDto?> ExportUserDataAsync(Guid userId)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null) return null;

        object? girisimData = null;
        if (user.GirisimId is Guid girisimId)
        {
            var girisim = await _db.Girisimler
                .Include(g => g.GelisimAdimlari)
                .Include(g => g.SatisKayitlari)
                .Include(g => g.YatirimKayitlari)
                .Include(g => g.Basarilar)
                .Include(g => g.Dokumanlar)
                .Include(g => g.ProgramKatilimlari).ThenInclude(k => k.Program)
                .FirstOrDefaultAsync(g => g.Id == girisimId);

            if (girisim is not null)
            {
                girisimData = new
                {
                    girisim.Ad,
                    girisim.Sektor,
                    girisim.KisaTanim,
                    girisim.CreatedAt,
                    NakitPlani = await _db.NakitPlanlari.AsNoTracking().SingleOrDefaultAsync(x => x.GirisimId == girisimId),
                    HaftalikHedefler = await _db.HaftalikHedefler.AsNoTracking().Where(x => x.GirisimId == girisimId).OrderByDescending(x => x.HaftaBaslangici).ToListAsync(),
                    GelisimAdimlari = girisim.GelisimAdimlari.Select(a => new { a.Tarih, a.Baslik, a.Aciklama }),
                    SatisKayitlari = girisim.SatisKayitlari.Select(s => new { s.Donem, s.Ciro, s.Ihracat, OnayDurumu = s.OnayDurumu.ToString() }),
                    YatirimKayitlari = girisim.YatirimKayitlari.Select(y => new { Tur = y.Tur.ToString(), y.Tutar, y.ParaBirimi, y.Tarih, OnayDurumu = y.OnayDurumu.ToString() }),
                    Basarilar = girisim.Basarilar.Select(b => new { Tur = b.Tur.ToString(), b.Baslik, b.Tarih, OnayDurumu = b.OnayDurumu.ToString() }),
                    Dokumanlar = girisim.Dokumanlar.Select(d => new { d.Baslik, d.DosyaAdi, OnayDurumu = d.OnayDurumu.ToString() }),
                    ProgramKatilimlari = girisim.ProgramKatilimlari.Select(k => new { ProgramAdi = k.Program?.Name, k.Donem, Durum = k.Durum.ToString() }),
                };
            }
        }

        return new VeriIhraciDto(user.Id, user.Email, user.FullName, user.Role.ToString(), user.CreatedAt, girisimData);
    }

    public async Task<(bool Success, string? Error)> RequestDeletionAsync(Guid userId, string? sebep)
    {
        var alreadyPending = await _db.SilmeTalepleri.AnyAsync(t => t.UserId == userId && t.Durum == OnayDurumu.Beklemede);
        if (alreadyPending) return (false, "Zaten bekleyen bir hesap silme talebiniz var.");

        _db.SilmeTalepleri.Add(new SilmeTalebi { UserId = userId, Sebep = sebep });
        await _db.SaveChangesAsync();
        return (true, null);
    }

    public Task<SilmeTalebi?> GetOwnRequestAsync(Guid userId) =>
        _db.SilmeTalepleri.Where(t => t.UserId == userId).OrderByDescending(t => t.CreatedAt).FirstOrDefaultAsync();

    public Task<List<SilmeTalebi>> ListPendingAsync() =>
        _db.SilmeTalepleri.Include(t => t.User).Where(t => t.Durum == OnayDurumu.Beklemede).OrderBy(t => t.CreatedAt).ToListAsync();

    /// <summary>Approving anonymizes the User record (never hard-deletes it) — keeps FK-restricted
    /// history (SubmittedBy/ReviewedBy on years of onay/itiraz rows) intact while satisfying erasure.</summary>
    public async Task<bool> KararVerAsync(Guid id, Guid reviewedById, bool onayla, string? not)
    {
        var talep = await _db.SilmeTalepleri.Include(t => t.User).FirstOrDefaultAsync(x => x.Id == id);
        if (talep is null) return false;

        talep.Durum = onayla ? OnayDurumu.Onaylandi : OnayDurumu.Reddedildi;
        talep.ReviewedById = reviewedById;
        talep.ReviewNotu = not;

        if (onayla && talep.User is not null)
        {
            var user = talep.User;
            user.Email = $"silinmis-{user.Id:N}@t3ventureos.local";
            user.FullName = "Silinmiş Kullanıcı";
            user.PasswordHash = null;
            user.Status = UserStatus.Disabled;
            user.UpdatedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();
        return true;
    }
}
