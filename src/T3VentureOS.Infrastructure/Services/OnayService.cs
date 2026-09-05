using T3VentureOS.Domain;
using T3VentureOS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace T3VentureOS.Infrastructure.Services;

/// <summary>
/// Approval workflow for startup-submitted data: every SatisKaydi/YatirimKaydi/Basari/Dokuman/
/// GirisimGuncellemeTalebi starts life as Beklemede and only becomes visible/applied once a
/// Program Yöneticisi or SuperAdmin approves it here.
/// </summary>
public class OnayService
{
    private readonly AppDbContext _db;
    private readonly NotificationService _notifications;
    private readonly AuditLogService _audit;

    public OnayService(AppDbContext db, NotificationService notifications, AuditLogService audit)
    {
        _db = db;
        _notifications = notifications;
        _audit = audit;
    }

    /// <summary>Onay/red kararlarını merkezi İşlem Geçmişi'ne yazar — kimin, ne zaman, hangi kaydı onayladığı/reddettiği izlenebilir kalsın diye.</summary>
    private async Task LogKararAsync(string eylem, Guid reviewedById, Guid submittedById, string ozet, bool onayla, string? not)
    {
        var actor = await _db.Users.FindAsync(reviewedById);
        if (actor is null) return;
        var hedef = await _db.Users.FindAsync(submittedById);
        var detay = $"{ozet} — {(onayla ? "Onaylandı" : "Reddedildi")}{(string.IsNullOrWhiteSpace(not) ? "" : $". Gerekçe: {not}")}";
        await _audit.LogAsync(actor, eylem, hedef, detay);
    }

    private Task NotifyKararAsync(Guid submittedById, Guid girisimId, string kayitAdi, bool onayla, string? not) =>
        _notifications.CreateAsync(
            submittedById,
            BildirimTuru.OnayKarari,
            onayla ? $"{kayitAdi} onaylandı" : $"{kayitAdi} reddedildi",
            onayla
                ? $"{kayitAdi} başarıyla onaylandı."
                : $"{kayitAdi} reddedildi.{(string.IsNullOrWhiteSpace(not) ? "" : $" Gerekçe: {not}")}",
            girisimId);

    public Task<List<Domain.Entities.SatisKaydi>> ListPendingSatisAsync() =>
        _db.SatisKayitlari.Include(s => s.Girisim).Where(s => s.OnayDurumu == OnayDurumu.Beklemede).OrderBy(s => s.CreatedAt).ToListAsync();

    public Task<List<Domain.Entities.YatirimKaydi>> ListPendingYatirimAsync() =>
        _db.YatirimKayitlari.Include(y => y.Girisim).Where(y => y.OnayDurumu == OnayDurumu.Beklemede).OrderBy(y => y.CreatedAt).ToListAsync();

    public Task<List<Domain.Entities.Basari>> ListPendingBasariAsync() =>
        _db.Basarilar.Include(b => b.Girisim).Where(b => b.OnayDurumu == OnayDurumu.Beklemede).OrderBy(b => b.CreatedAt).ToListAsync();

    public Task<List<Domain.Entities.Dokuman>> ListPendingDokumanAsync() =>
        _db.Dokumanlar.Include(d => d.Girisim).Where(d => d.OnayDurumu == OnayDurumu.Beklemede).OrderBy(d => d.CreatedAt).ToListAsync();

    public Task<List<Domain.Entities.GirisimGuncellemeTalebi>> ListPendingGuncellemeAsync() =>
        _db.GirisimGuncellemeTalepleri.Include(t => t.Girisim).Where(t => t.OnayDurumu == OnayDurumu.Beklemede).OrderBy(t => t.CreatedAt).ToListAsync();

    public async Task<bool> KararVerSatisAsync(Guid id, Guid reviewedById, bool onayla, string? not)
    {
        var kayit = await _db.SatisKayitlari.Include(s => s.Girisim).FirstOrDefaultAsync(x => x.Id == id);
        if (kayit is null) return false;
        kayit.OnayDurumu = onayla ? OnayDurumu.Onaylandi : OnayDurumu.Reddedildi;
        kayit.ReviewedById = reviewedById;
        kayit.ReviewNotu = not;
        kayit.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        var kayitAdi = $"\"{kayit.Donem}\" dönemi satış kaydı";
        await NotifyKararAsync(kayit.SubmittedById, kayit.GirisimId, kayitAdi, onayla, not);
        await LogKararAsync(IslemEylemleri.SatisKaydiKararVerildi, reviewedById, kayit.SubmittedById,
            $"{kayitAdi} ({kayit.Girisim?.Ad ?? "Girişim"})", onayla, not);
        return true;
    }

    public async Task<bool> KararVerYatirimAsync(Guid id, Guid reviewedById, bool onayla, string? not)
    {
        var kayit = await _db.YatirimKayitlari.Include(y => y.Girisim).FirstOrDefaultAsync(x => x.Id == id);
        if (kayit is null) return false;
        kayit.OnayDurumu = onayla ? OnayDurumu.Onaylandi : OnayDurumu.Reddedildi;
        kayit.ReviewedById = reviewedById;
        kayit.ReviewNotu = not;
        kayit.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        var kayitAdi = $"{kayit.Tur} yatırım kaydı";
        await NotifyKararAsync(kayit.SubmittedById, kayit.GirisimId, kayitAdi, onayla, not);
        await LogKararAsync(IslemEylemleri.YatirimKaydiKararVerildi, reviewedById, kayit.SubmittedById,
            $"{kayitAdi} ({kayit.Girisim?.Ad ?? "Girişim"})", onayla, not);
        return true;
    }

    public async Task<bool> KararVerBasariAsync(Guid id, Guid reviewedById, bool onayla, string? not)
    {
        var kayit = await _db.Basarilar.Include(b => b.Girisim).FirstOrDefaultAsync(x => x.Id == id);
        if (kayit is null) return false;
        kayit.OnayDurumu = onayla ? OnayDurumu.Onaylandi : OnayDurumu.Reddedildi;
        kayit.ReviewedById = reviewedById;
        kayit.ReviewNotu = not;
        kayit.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        var kayitAdi = $"\"{kayit.Baslik}\" başarı kaydı";
        await NotifyKararAsync(kayit.SubmittedById, kayit.GirisimId, kayitAdi, onayla, not);
        await LogKararAsync(IslemEylemleri.BasariKaydiKararVerildi, reviewedById, kayit.SubmittedById,
            $"{kayitAdi} ({kayit.Girisim?.Ad ?? "Girişim"})", onayla, not);
        return true;
    }

    public async Task<bool> KararVerDokumanAsync(Guid id, Guid reviewedById, bool onayla, string? not)
    {
        var kayit = await _db.Dokumanlar.Include(d => d.Girisim).FirstOrDefaultAsync(x => x.Id == id);
        if (kayit is null) return false;
        kayit.OnayDurumu = onayla ? OnayDurumu.Onaylandi : OnayDurumu.Reddedildi;
        kayit.ReviewedById = reviewedById;
        kayit.ReviewNotu = not;
        await _db.SaveChangesAsync();
        var kayitAdi = $"\"{kayit.Baslik}\" dokümanı";
        await NotifyKararAsync(kayit.SubmittedById, kayit.GirisimId, kayitAdi, onayla, not);
        await LogKararAsync(IslemEylemleri.DokumanKararVerildi, reviewedById, kayit.SubmittedById,
            $"{kayitAdi} ({kayit.Girisim?.Ad ?? "Girişim"})", onayla, not);
        return true;
    }

    /// <summary>Approving a profile-update request copies its proposed fields onto the live Girisim record.</summary>
    public async Task<bool> KararVerGuncellemeAsync(Guid id, Guid reviewedById, bool onayla, string? not)
    {
        var talep = await _db.GirisimGuncellemeTalepleri.Include(t => t.Girisim).FirstOrDefaultAsync(x => x.Id == id);
        if (talep is null) return false;

        talep.OnayDurumu = onayla ? OnayDurumu.Onaylandi : OnayDurumu.Reddedildi;
        talep.ReviewedById = reviewedById;
        talep.ReviewNotu = not;

        if (onayla && talep.Girisim is not null)
        {
            talep.Girisim.Ad = talep.Ad;
            talep.Girisim.Sektor = talep.Sektor;
            talep.Girisim.KisaTanim = talep.KisaTanim;
            talep.Girisim.Teknoloji = talep.Teknoloji;
            talep.Girisim.WebsiteUrl = talep.WebsiteUrl;
            talep.Girisim.KurulusYili = talep.KurulusYili;
            talep.Girisim.EkipBuyuklugu = talep.EkipBuyuklugu;
            talep.Girisim.UpdatedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();
        if (talep.Girisim is not null)
            await NotifyKararAsync(talep.SubmittedById, talep.GirisimId, "Profil güncelleme talebiniz", onayla, not);
        await LogKararAsync(IslemEylemleri.GuncellemeTalebiKararVerildi, reviewedById, talep.SubmittedById,
            $"Profil güncelleme talebi ({talep.Girisim?.Ad ?? "Girişim"})", onayla, not);
        return true;
    }
}
