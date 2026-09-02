using T3VentureOS.Domain;
using T3VentureOS.Domain.Entities;
using T3VentureOS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace T3VentureOS.Infrastructure.Services;

public class GirisimService
{
    private readonly AppDbContext _db;

    public GirisimService(AppDbContext db)
    {
        _db = db;
    }

    /// <summary>sirala: "ciro_desc" | "ciro_asc" | "ad_asc" | default (en yeni önce).</summary>
    public async Task<PagedResult<Girisim>> ListAsync(
        string? sektor = null, Guid? programId = null, string? ara = null, string? sirala = null,
        int page = 1, int pageSize = PagingDefaults.DefaultPageSize)
    {
        (page, pageSize) = PagingDefaults.Normalize(page, pageSize);

        // Investor-scouting (Karar Verici) view wants each card to show approved revenue, so this is
        // always included/filtered — it's also what "ciro" sort orders by.
        var query = _db.Girisimler
            .Include(g => g.SatisKayitlari.Where(s => s.OnayDurumu == OnayDurumu.Onaylandi))
            .AsQueryable();
        if (!string.IsNullOrWhiteSpace(sektor))
            query = query.Where(g => g.Sektor != null && g.Sektor.Contains(sektor));
        if (programId is not null)
            query = query.Where(g => g.ProgramKatilimlari.Any(k => k.ProgramId == programId));
        if (!string.IsNullOrWhiteSpace(ara))
            query = query.Where(g => g.Ad.Contains(ara) || (g.Teknoloji != null && g.Teknoloji.Contains(ara)));

        query = sirala switch
        {
            "ciro_desc" => query.OrderByDescending(g => g.SatisKayitlari.Where(s => s.OnayDurumu == OnayDurumu.Onaylandi).Sum(s => (decimal?)s.Ciro) ?? 0),
            "ciro_asc" => query.OrderBy(g => g.SatisKayitlari.Where(s => s.OnayDurumu == OnayDurumu.Onaylandi).Sum(s => (decimal?)s.Ciro) ?? 0),
            "ad_asc" => query.OrderBy(g => g.Ad),
            _ => query.OrderByDescending(g => g.CreatedAt),
        };

        var totalCount = await query.CountAsync();
        var items = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        return new PagedResult<Girisim>(items, totalCount, page, pageSize);
    }

    public Task<Girisim?> GetAsync(Guid id) =>
        _db.Girisimler
            .Include(g => g.ProgramKatilimlari.OrderByDescending(k => k.BaslangicTarihi)).ThenInclude(k => k.Program)
            .Include(g => g.GelisimAdimlari.OrderByDescending(a => a.Tarih))
            .Include(g => g.SatisKayitlari.OrderByDescending(s => s.CreatedAt))
            .Include(g => g.YatirimKayitlari.OrderByDescending(y => y.CreatedAt))
            .Include(g => g.Basarilar.OrderByDescending(b => b.CreatedAt))
            .Include(g => g.Dokumanlar.OrderByDescending(d => d.CreatedAt))
            .FirstOrDefaultAsync(g => g.Id == id);

    public async Task<Girisim> CreateAsync(Guid createdById, Girisim girisim)
    {
        girisim.CreatedById = createdById;
        _db.Girisimler.Add(girisim);
        await _db.SaveChangesAsync();
        return girisim;
    }

    /// <summary>Direct profile edit — Program Yöneticisi/SuperAdmin only, no approval needed.</summary>
    public async Task UpdateAsync(Girisim girisim)
    {
        girisim.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
    }

    public async Task<GelisimAdimi> AddGelisimAdimiAsync(GelisimAdimi adim)
    {
        _db.GelisimAdimlari.Add(adim);
        await _db.SaveChangesAsync();
        return adim;
    }

    public async Task<SatisKaydi> AddSatisKaydiAsync(SatisKaydi kayit)
    {
        _db.SatisKayitlari.Add(kayit);
        await _db.SaveChangesAsync();
        return kayit;
    }

    public async Task<YatirimKaydi> AddYatirimKaydiAsync(YatirimKaydi kayit)
    {
        _db.YatirimKayitlari.Add(kayit);
        await _db.SaveChangesAsync();
        return kayit;
    }

    public async Task<Basari> AddBasariAsync(Basari basari)
    {
        _db.Basarilar.Add(basari);
        await _db.SaveChangesAsync();
        return basari;
    }

    public async Task<bool> UpdateLogoAsync(Guid girisimId, string logoUrl)
    {
        var girisim = await _db.Girisimler.FirstOrDefaultAsync(g => g.Id == girisimId);
        if (girisim is null) return false;
        girisim.LogoUrl = logoUrl;
        girisim.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<Dokuman> AddDokumanAsync(Dokuman dokuman)
    {
        _db.Dokumanlar.Add(dokuman);
        await _db.SaveChangesAsync();
        return dokuman;
    }

    /// <summary>Self-correction: a startup can withdraw its own submission only while it's still awaiting review.</summary>
    public async Task<(bool Success, string? Error)> DeleteSatisKaydiAsync(Guid girisimId, Guid id)
    {
        var kayit = await _db.SatisKayitlari.FirstOrDefaultAsync(x => x.Id == id && x.GirisimId == girisimId);
        if (kayit is null) return (false, "Kayıt bulunamadı.");
        if (kayit.OnayDurumu != OnayDurumu.Beklemede) return (false, "Sadece bekleyen kayıtlar silinebilir.");
        _db.SatisKayitlari.Remove(kayit);
        await _db.SaveChangesAsync();
        return (true, null);
    }

    public async Task<(bool Success, string? Error)> DeleteYatirimKaydiAsync(Guid girisimId, Guid id)
    {
        var kayit = await _db.YatirimKayitlari.FirstOrDefaultAsync(x => x.Id == id && x.GirisimId == girisimId);
        if (kayit is null) return (false, "Kayıt bulunamadı.");
        if (kayit.OnayDurumu != OnayDurumu.Beklemede) return (false, "Sadece bekleyen kayıtlar silinebilir.");
        _db.YatirimKayitlari.Remove(kayit);
        await _db.SaveChangesAsync();
        return (true, null);
    }

    public async Task<(bool Success, string? Error)> DeleteBasariAsync(Guid girisimId, Guid id)
    {
        var kayit = await _db.Basarilar.FirstOrDefaultAsync(x => x.Id == id && x.GirisimId == girisimId);
        if (kayit is null) return (false, "Kayıt bulunamadı.");
        if (kayit.OnayDurumu != OnayDurumu.Beklemede) return (false, "Sadece bekleyen kayıtlar silinebilir.");
        _db.Basarilar.Remove(kayit);
        await _db.SaveChangesAsync();
        return (true, null);
    }

    public async Task<(bool Success, string? Error)> DeleteDokumanAsync(Guid girisimId, Guid id)
    {
        var dokuman = await _db.Dokumanlar.FirstOrDefaultAsync(x => x.Id == id && x.GirisimId == girisimId);
        if (dokuman is null) return (false, "Kayıt bulunamadı.");
        if (dokuman.OnayDurumu != OnayDurumu.Beklemede) return (false, "Sadece bekleyen kayıtlar silinebilir.");
        _db.Dokumanlar.Remove(dokuman);
        await _db.SaveChangesAsync();
        return (true, null);
    }

    /// <summary>Startup user proposes new profile field values; takes effect only once approved via OnayService.</summary>
    public async Task<GirisimGuncellemeTalebi> SubmitGuncellemeTalebiAsync(GirisimGuncellemeTalebi talep)
    {
        _db.GirisimGuncellemeTalepleri.Add(talep);
        await _db.SaveChangesAsync();
        return talep;
    }

    public Task<List<GirisimGuncellemeTalebi>> ListGuncellemeTalepleriAsync(Guid girisimId) =>
        _db.GirisimGuncellemeTalepleri
            .Where(t => t.GirisimId == girisimId)
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync();
}
