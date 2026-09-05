using T3VentureOS.Domain.Entities;
using T3VentureOS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace T3VentureOS.Infrastructure.Services;

/// <summary>Eylem adı sabitleri — hem loglayan servisler hem de frontend etiketleme için tek referans noktası.</summary>
public static class IslemEylemleri
{
    public const string KullaniciDavetEdildi = "KullaniciDavetEdildi";
    public const string DavetYenidenGonderildi = "DavetYenidenGonderildi";
    public const string KullaniciDevreDisiBirakildi = "KullaniciDevreDisiBirakildi";
    public const string KullaniciAktiflestirildi = "KullaniciAktiflestirildi";
    public const string RolDegistirildi = "RolDegistirildi";
    public const string GirisimAtamasiDegistirildi = "GirisimAtamasiDegistirildi";
    public const string TopluDavetTamamlandi = "TopluDavetTamamlandi";
    public const string SatisKaydiKararVerildi = "SatisKaydiKararVerildi";
    public const string YatirimKaydiKararVerildi = "YatirimKaydiKararVerildi";
    public const string BasariKaydiKararVerildi = "BasariKaydiKararVerildi";
    public const string DokumanKararVerildi = "DokumanKararVerildi";
    public const string GuncellemeTalebiKararVerildi = "GuncellemeTalebiKararVerildi";
    public const string ItirazKararVerildi = "ItirazKararVerildi";
    public const string OnayOnerisiVerildi = "OnayOnerisiVerildi";
}

/// <summary>SuperAdmin'lerin kullanıcı yönetimi üzerinde yaptığı işlemlerin (audit trail) kaydı.</summary>
public class AuditLogService
{
    private readonly AppDbContext _db;

    public AuditLogService(AppDbContext db)
    {
        _db = db;
    }

    public async Task LogAsync(User actor, string eylem, User? hedef = null, string? detay = null)
    {
        _db.IslemKayitlari.Add(new IslemKaydi
        {
            ActorId = actor.Id,
            ActorAdSoyad = actor.FullName,
            ActorEmail = actor.Email,
            HedefKullaniciId = hedef?.Id,
            HedefAdSoyad = hedef?.FullName,
            HedefEmail = hedef?.Email,
            Eylem = eylem,
            Detay = detay,
        });
        await _db.SaveChangesAsync();
    }

    public async Task<PagedResult<IslemKaydi>> ListAsync(
        Guid? hedefKullaniciId = null, int page = 1, int pageSize = PagingDefaults.DefaultPageSize)
    {
        (page, pageSize) = PagingDefaults.Normalize(page, pageSize);

        var query = _db.IslemKayitlari.Where(x => hedefKullaniciId == null || x.HedefKullaniciId == hedefKullaniciId);
        query = query.OrderByDescending(x => x.CreatedAt);

        var totalCount = await query.CountAsync();
        var items = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        return new PagedResult<IslemKaydi>(items, totalCount, page, pageSize);
    }
}
