using T3VentureOS.Domain;
using T3VentureOS.Domain.Entities;
using T3VentureOS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace T3VentureOS.Infrastructure.Services;

/// <summary>In-app notifications — onay/itiraz kararları ve program güncellemeleri kullanıcıya buradan ulaşır.</summary>
public class NotificationService
{
    private readonly AppDbContext _db;

    public NotificationService(AppDbContext db)
    {
        _db = db;
    }

    public async Task CreateAsync(Guid kullaniciId, BildirimTuru tur, string baslik, string mesaj, Guid? ilgiliGirisimId = null)
    {
        _db.Bildirimler.Add(new Bildirim
        {
            KullaniciId = kullaniciId,
            Tur = tur,
            Baslik = baslik,
            Mesaj = mesaj,
            IlgiliGirisimId = ilgiliGirisimId,
        });
        await _db.SaveChangesAsync();
    }

    public async Task<PagedResult<Bildirim>> ListAsync(Guid kullaniciId, int page = 1, int pageSize = PagingDefaults.DefaultPageSize)
    {
        (page, pageSize) = PagingDefaults.Normalize(page, pageSize);

        var query = _db.Bildirimler.Where(b => b.KullaniciId == kullaniciId).OrderByDescending(b => b.CreatedAt);
        var totalCount = await query.CountAsync();
        var items = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        return new PagedResult<Bildirim>(items, totalCount, page, pageSize);
    }

    public Task<int> UnreadCountAsync(Guid kullaniciId) =>
        _db.Bildirimler.CountAsync(b => b.KullaniciId == kullaniciId && !b.Okundu);

    /// <summary>Returns false if the notification doesn't exist or belongs to someone else — never leaks ownership either way.</summary>
    public async Task<bool> MarkAsReadAsync(Guid id, Guid kullaniciId)
    {
        var bildirim = await _db.Bildirimler.FirstOrDefaultAsync(b => b.Id == id && b.KullaniciId == kullaniciId);
        if (bildirim is null) return false;
        bildirim.Okundu = true;
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task MarkAllAsReadAsync(Guid kullaniciId)
    {
        var unread = await _db.Bildirimler.Where(b => b.KullaniciId == kullaniciId && !b.Okundu).ToListAsync();
        foreach (var bildirim in unread) bildirim.Okundu = true;
        await _db.SaveChangesAsync();
    }
}
