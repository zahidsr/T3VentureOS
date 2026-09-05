using T3VentureOS.Domain;
using T3VentureOS.Domain.Entities;
using T3VentureOS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace T3VentureOS.Infrastructure.Services;

/// <summary>
/// Non-binding recommendations a ProgramYoneticisi leaves on pending records. Approval itself is
/// SuperAdmin-only (see OnayService); this is how the operational reviewer feeds into that decision.
/// </summary>
public class OnayOneriService
{
    private readonly AppDbContext _db;
    private readonly AuditLogService _audit;

    public OnayOneriService(AppDbContext db, AuditLogService audit)
    {
        _db = db;
        _audit = audit;
    }

    /// <summary>Every recommendation on the records currently in the onay kuyruğu, newest first.</summary>
    public async Task<List<OnayOnerisi>> ListForKonularAsync(IEnumerable<(OnayKonusuTuru Tur, Guid Id)> konular)
    {
        var pairs = konular.ToHashSet();
        if (pairs.Count == 0) return [];

        // Filtering by KonuId alone is index-backed; the (tür, id) pairing is re-checked in memory
        // because EF cannot translate a tuple-set Contains into SQL.
        var ids = pairs.Select(k => k.Id).ToList();
        var oneriler = await _db.OnayOnerileri
            .Include(o => o.OneriVeren)
            .Where(o => ids.Contains(o.KonuId))
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync();

        return oneriler.Where(o => pairs.Contains((o.KonuTuru, o.KonuId))).ToList();
    }

    /// <summary>
    /// Records this reviewer's recommendation, replacing their previous one on the same record —
    /// a reviewer has one standing opinion, not a running commentary.
    /// </summary>
    public async Task<OnayOnerisi> UpsertAsync(
        OnayKonusuTuru konuTuru, Guid konuId, Guid oneriVerenId, OneriTavsiyesi tavsiye, string? not)
    {
        var mevcut = await _db.OnayOnerileri
            .FirstOrDefaultAsync(o => o.KonuTuru == konuTuru && o.KonuId == konuId && o.OneriVerenId == oneriVerenId);

        if (mevcut is null)
        {
            mevcut = new OnayOnerisi
            {
                KonuTuru = konuTuru,
                KonuId = konuId,
                OneriVerenId = oneriVerenId,
                Tavsiye = tavsiye,
                Not = not,
            };
            _db.OnayOnerileri.Add(mevcut);
        }
        else
        {
            mevcut.Tavsiye = tavsiye;
            mevcut.Not = not;
            mevcut.UpdatedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();

        var actor = await _db.Users.FindAsync(oneriVerenId);
        mevcut.OneriVeren = actor;
        if (actor is not null)
            await _audit.LogAsync(actor, IslemEylemleri.OnayOnerisiVerildi, null,
                $"{konuTuru} kaydı için öneri: {tavsiye}{(string.IsNullOrWhiteSpace(not) ? "" : $". Not: {not}")}");

        return mevcut;
    }

    /// <summary>Recommendations are advisory scaffolding — once the record is decided they are cleared out.</summary>
    public async Task ClearAsync(OnayKonusuTuru konuTuru, Guid konuId)
    {
        await _db.OnayOnerileri
            .Where(o => o.KonuTuru == konuTuru && o.KonuId == konuId)
            .ExecuteDeleteAsync();
    }
}
