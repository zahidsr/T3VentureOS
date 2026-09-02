using T3VentureOS.Domain;
using T3VentureOS.Domain.Entities;
using T3VentureOS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace T3VentureOS.Infrastructure.Services;

public class ProgramService
{
    private readonly AppDbContext _db;
    private readonly NotificationService _notifications;

    public ProgramService(AppDbContext db, NotificationService notifications)
    {
        _db = db;
        _notifications = notifications;
    }

    public async Task<PagedResult<GirisimProgrami>> ListAsync(
        string? ara = null, ProgramDurumu? durum = null, int page = 1, int pageSize = PagingDefaults.DefaultPageSize)
    {
        (page, pageSize) = PagingDefaults.Normalize(page, pageSize);

        // Include Katilimlar so ToSummaryDto's participant count is accurate (it was silently always 0 before this fix).
        var query = _db.Programlar.Include(p => p.Katilimlar).AsQueryable();
        if (!string.IsNullOrWhiteSpace(ara))
            query = query.Where(p => p.Name.Contains(ara));
        if (durum is not null)
            query = query.Where(p => p.Durum == durum);

        query = query.OrderByDescending(p => p.CreatedAt);

        var totalCount = await query.CountAsync();
        var items = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        return new PagedResult<GirisimProgrami>(items, totalCount, page, pageSize);
    }

    /// <summary>Public homepage carousel feed — no auth required, so keep the payload light.</summary>
    public Task<List<GirisimProgrami>> GetActiveAsync(int limit = 8) =>
        _db.Programlar
            .Include(p => p.Katilimlar)
            .Where(p => p.Durum == T3VentureOS.Domain.ProgramDurumu.Aktif)
            .OrderByDescending(p => p.BaslangicTarihi)
            .Take(limit)
            .ToListAsync();

    public Task<GirisimProgrami?> GetAsync(Guid id) =>
        _db.Programlar
            .Include(p => p.Katilimlar).ThenInclude(k => k.Girisim)
            .FirstOrDefaultAsync(p => p.Id == id);

    public async Task<GirisimProgrami> CreateAsync(Guid createdById, GirisimProgrami program)
    {
        program.CreatedById = createdById;
        _db.Programlar.Add(program);
        await _db.SaveChangesAsync();
        return program;
    }

    public async Task UpdateAsync(GirisimProgrami program)
    {
        program.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
    }

    /// <summary>Self-service application: a StartupKullanicisi applies its own Girisim to a program.</summary>
    public async Task<(bool Success, string? Error)> ApplyAsync(Guid programId, Guid girisimId)
    {
        var programExists = await _db.Programlar.AnyAsync(p => p.Id == programId);
        if (!programExists) return (false, "Program bulunamadı.");

        var alreadyApplied = await _db.ProgramKatilimlari.AnyAsync(k => k.ProgramId == programId && k.GirisimId == girisimId);
        if (alreadyApplied) return (false, "Bu programa zaten başvurdunuz.");

        _db.ProgramKatilimlari.Add(new ProgramKatilimi { ProgramId = programId, GirisimId = girisimId, Durum = KatilimDurumu.Basvuru });
        await _db.SaveChangesAsync();
        return (true, null);
    }

    public async Task<ProgramKatilimi> AddKatilimAsync(ProgramKatilimi katilim)
    {
        _db.ProgramKatilimlari.Add(katilim);
        await _db.SaveChangesAsync();
        return katilim;
    }

    public async Task UpdateKatilimDurumuAsync(Guid katilimId, T3VentureOS.Domain.KatilimDurumu durum)
    {
        var katilim = await _db.ProgramKatilimlari.Include(k => k.Program).FirstOrDefaultAsync(k => k.Id == katilimId);
        if (katilim is null) return;
        katilim.Durum = durum;
        katilim.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        var temsilciId = await _db.Users
            .Where(u => u.GirisimId == katilim.GirisimId && u.Role == T3VentureOS.Domain.UserRole.StartupKullanicisi)
            .Select(u => u.Id)
            .FirstOrDefaultAsync();
        if (temsilciId != Guid.Empty)
            await _notifications.CreateAsync(
                temsilciId,
                T3VentureOS.Domain.BildirimTuru.ProgramGuncellemesi,
                "Program katılım durumunuz güncellendi",
                $"\"{katilim.Program?.Name}\" programındaki katılım durumunuz \"{durum}\" olarak güncellendi.",
                katilim.GirisimId);
    }
}
