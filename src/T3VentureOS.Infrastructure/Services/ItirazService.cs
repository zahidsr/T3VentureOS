using T3VentureOS.Domain;
using T3VentureOS.Domain.Entities;
using T3VentureOS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace T3VentureOS.Infrastructure.Services;

/// <summary>
/// İtiraz akışı: bir StartupKullanicisi, reddedilmiş bir satış/yatırım/başarı/doküman kaydına itiraz
/// edebilir. İtiraz onaylanırsa hedef kayıt tekrar Onaylandi durumuna döner.
/// </summary>
public class ItirazService
{
    private readonly AppDbContext _db;
    private readonly NotificationService _notifications;
    private readonly AuditLogService _audit;

    public ItirazService(AppDbContext db, NotificationService notifications, AuditLogService audit)
    {
        _db = db;
        _notifications = notifications;
        _audit = audit;
    }

    private async Task<(bool Found, bool Reddedildi, string Ozet)> GetKonuDurumuAsync(ItirazKonusuTuru tur, Guid girisimId, Guid konuId)
    {
        switch (tur)
        {
            case ItirazKonusuTuru.Satis:
                var satis = await _db.SatisKayitlari.FirstOrDefaultAsync(x => x.Id == konuId && x.GirisimId == girisimId);
                return satis is null ? (false, false, "") : (true, satis.OnayDurumu == OnayDurumu.Reddedildi, $"{satis.Donem} dönemi satış kaydı");
            case ItirazKonusuTuru.Yatirim:
                var yatirim = await _db.YatirimKayitlari.FirstOrDefaultAsync(x => x.Id == konuId && x.GirisimId == girisimId);
                return yatirim is null ? (false, false, "") : (true, yatirim.OnayDurumu == OnayDurumu.Reddedildi, $"{yatirim.Tur} yatırım kaydı");
            case ItirazKonusuTuru.Basari:
                var basari = await _db.Basarilar.FirstOrDefaultAsync(x => x.Id == konuId && x.GirisimId == girisimId);
                return basari is null ? (false, false, "") : (true, basari.OnayDurumu == OnayDurumu.Reddedildi, basari.Baslik);
            case ItirazKonusuTuru.Dokuman:
                var dokuman = await _db.Dokumanlar.FirstOrDefaultAsync(x => x.Id == konuId && x.GirisimId == girisimId);
                return dokuman is null ? (false, false, "") : (true, dokuman.OnayDurumu == OnayDurumu.Reddedildi, dokuman.Baslik);
            default:
                return (false, false, "");
        }
    }

    public async Task<(bool Success, string? Error)> SubmitAsync(Guid girisimId, ItirazKonusuTuru konuTuru, Guid konuId, string aciklama, Guid submittedById)
    {
        var (found, reddedildi, _) = await GetKonuDurumuAsync(konuTuru, girisimId, konuId);
        if (!found) return (false, "İtiraz edilecek kayıt bulunamadı.");
        if (!reddedildi) return (false, "Sadece reddedilmiş kayıtlara itiraz edilebilir.");

        var zatenBekliyor = await _db.Itirazlar.AnyAsync(i =>
            i.KonuTuru == konuTuru && i.KonuId == konuId && i.OnayDurumu == OnayDurumu.Beklemede);
        if (zatenBekliyor) return (false, "Bu kayıt için zaten bekleyen bir itirazınız var.");

        _db.Itirazlar.Add(new Itiraz
        {
            GirisimId = girisimId,
            KonuTuru = konuTuru,
            KonuId = konuId,
            Aciklama = aciklama,
            SubmittedById = submittedById,
        });
        await _db.SaveChangesAsync();
        return (true, null);
    }

    public Task<List<Itiraz>> ListPendingAsync() =>
        _db.Itirazlar.Include(i => i.Girisim).Where(i => i.OnayDurumu == OnayDurumu.Beklemede).OrderBy(i => i.CreatedAt).ToListAsync();

    public Task<List<Itiraz>> ListForGirisimAsync(Guid girisimId) =>
        _db.Itirazlar.Where(i => i.GirisimId == girisimId).OrderByDescending(i => i.CreatedAt).ToListAsync();

    public async Task<bool> KararVerAsync(Guid id, Guid reviewedById, bool onayla, string? not)
    {
        var itiraz = await _db.Itirazlar.Include(i => i.Girisim).FirstOrDefaultAsync(x => x.Id == id);
        if (itiraz is null) return false;

        itiraz.OnayDurumu = onayla ? OnayDurumu.Onaylandi : OnayDurumu.Reddedildi;
        itiraz.ReviewedById = reviewedById;
        itiraz.ReviewNotu = not;

        if (onayla)
            await RestoreOnayDurumuAsync(itiraz.KonuTuru, itiraz.KonuId, reviewedById, not);

        await _db.SaveChangesAsync();

        await _notifications.CreateAsync(
            itiraz.SubmittedById,
            BildirimTuru.ItirazSonucu,
            onayla ? "İtirazınız kabul edildi" : "İtirazınız reddedildi",
            onayla
                ? "Kaydınıza yaptığınız itiraz kabul edildi; kayıt tekrar onaylı duruma alındı."
                : $"Kaydınıza yaptığınız itiraz reddedildi.{(string.IsNullOrWhiteSpace(not) ? "" : $" Gerekçe: {not}")}",
            itiraz.GirisimId);

        var actor = await _db.Users.FindAsync(reviewedById);
        if (actor is not null)
        {
            var hedef = await _db.Users.FindAsync(itiraz.SubmittedById);
            var detay =
                $"{itiraz.KonuTuru} itirazı ({itiraz.Girisim?.Ad ?? "Girişim"}) — {(onayla ? "Kabul edildi" : "Reddedildi")}{(string.IsNullOrWhiteSpace(not) ? "" : $". Gerekçe: {not}")}";
            await _audit.LogAsync(actor, IslemEylemleri.ItirazKararVerildi, hedef, detay);
        }

        return true;
    }

    private async Task RestoreOnayDurumuAsync(ItirazKonusuTuru tur, Guid konuId, Guid reviewedById, string? not)
    {
        switch (tur)
        {
            case ItirazKonusuTuru.Satis:
                var satis = await _db.SatisKayitlari.FirstOrDefaultAsync(x => x.Id == konuId);
                if (satis is not null) { satis.OnayDurumu = OnayDurumu.Onaylandi; satis.ReviewedById = reviewedById; satis.ReviewNotu = not; satis.UpdatedAt = DateTime.UtcNow; }
                break;
            case ItirazKonusuTuru.Yatirim:
                var yatirim = await _db.YatirimKayitlari.FirstOrDefaultAsync(x => x.Id == konuId);
                if (yatirim is not null) { yatirim.OnayDurumu = OnayDurumu.Onaylandi; yatirim.ReviewedById = reviewedById; yatirim.ReviewNotu = not; yatirim.UpdatedAt = DateTime.UtcNow; }
                break;
            case ItirazKonusuTuru.Basari:
                var basari = await _db.Basarilar.FirstOrDefaultAsync(x => x.Id == konuId);
                if (basari is not null) { basari.OnayDurumu = OnayDurumu.Onaylandi; basari.ReviewedById = reviewedById; basari.ReviewNotu = not; basari.UpdatedAt = DateTime.UtcNow; }
                break;
            case ItirazKonusuTuru.Dokuman:
                var dokuman = await _db.Dokumanlar.FirstOrDefaultAsync(x => x.Id == konuId);
                if (dokuman is not null) { dokuman.OnayDurumu = OnayDurumu.Onaylandi; dokuman.ReviewedById = reviewedById; dokuman.ReviewNotu = not; }
                break;
        }
    }
}
