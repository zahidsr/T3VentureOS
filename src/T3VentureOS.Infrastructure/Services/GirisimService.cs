using T3VentureOS.Domain;
using T3VentureOS.Domain.Entities;
using T3VentureOS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace T3VentureOS.Infrastructure.Services;

/// <summary>Rakip karşılaştırma panelinin filtre çubuğundan gelen kriterler — hepsi opsiyonel.</summary>
public record GirisimKarsilastirmaFiltre(
    string? Sektor, int? KurulusYiliMin, int? KurulusYiliMax,
    int? EkipMin, int? EkipMax, decimal? CiroMin, decimal? CiroMax, decimal? YatirimMin, decimal? YatirimMax);

public record GirisimKarsilastirmaSonuc(Girisim Girisim, decimal ToplamOnayliCiro, decimal ToplamOnayliYatirim, List<AylikTrend> AylikTrend);

public class GirisimService
{
    private readonly AppDbContext _db;

    public GirisimService(AppDbContext db)
    {
        _db = db;
    }

    /// <summary>sirala: "puan_desc" | "puan_asc" | "ciro_desc" | "ciro_asc" | "ad_asc" | default (en yeni önce).</summary>
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
            // Puan tabloda tutulduğu için sayfalama ile birlikte veritabanında sıralanabiliyor.
            "puan_desc" => query.OrderByDescending(g => g.Puan).ThenBy(g => g.Ad),
            "puan_asc" => query.OrderBy(g => g.Puan).ThenBy(g => g.Ad),
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
            .Include(g => g.IstihdamKayitlari.OrderByDescending(i => i.Donem))
            .Include(g => g.Dokumanlar.OrderByDescending(d => d.CreatedAt))
            .Include(g => g.Contact)
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

    public async Task<IstihdamKaydi> AddIstihdamKaydiAsync(IstihdamKaydi kayit)
    {
        _db.IstihdamKayitlari.Add(kayit);
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

    public async Task<bool> UpdateKapakGorseliAsync(Guid girisimId, string kapakGorseliUrl)
    {
        var girisim = await _db.Girisimler.FirstOrDefaultAsync(g => g.Id == girisimId);
        if (girisim is null) return false;
        girisim.KapakGorseliUrl = kapakGorseliUrl;
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

    /// <summary>Girişimin muhatap/iletişim kartını oluşturur ya da günceller (1:1, tek kayıt).</summary>
    public async Task<GirisimContact> UpsertContactAsync(Guid girisimId, string adSoyad, string? unvan, string? telefon, string? email, string? linkedInUrl)
    {
        var contact = await _db.GirisimContactlar.FirstOrDefaultAsync(c => c.GirisimId == girisimId);
        if (contact is null)
        {
            contact = new GirisimContact { GirisimId = girisimId };
            _db.GirisimContactlar.Add(contact);
        }
        contact.AdSoyad = adSoyad;
        contact.Unvan = unvan;
        contact.Telefon = telefon;
        contact.Email = email;
        contact.LinkedInUrl = linkedInUrl;
        contact.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return contact;
    }

    private static readonly string[] AyKisaltmalari =
        { "Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara" };

    /// <summary>Sektör/kuruluş yılı/ekip büyüklüğü/ciro/yatırım kriterlerine göre filtrelenmiş, karşılaştırılabilir girişim seti.</summary>
    public async Task<List<GirisimKarsilastirmaSonuc>> GetKarsilastirmaAsync(GirisimKarsilastirmaFiltre filtre)
    {
        var query = _db.Girisimler.AsQueryable();
        if (!string.IsNullOrWhiteSpace(filtre.Sektor))
            query = query.Where(g => g.Sektor == filtre.Sektor);
        if (filtre.KurulusYiliMin is not null)
            query = query.Where(g => g.KurulusYili != null && g.KurulusYili >= filtre.KurulusYiliMin);
        if (filtre.KurulusYiliMax is not null)
            query = query.Where(g => g.KurulusYili != null && g.KurulusYili <= filtre.KurulusYiliMax);
        if (filtre.EkipMin is not null)
            query = query.Where(g => g.EkipBuyuklugu != null && g.EkipBuyuklugu >= filtre.EkipMin);
        if (filtre.EkipMax is not null)
            query = query.Where(g => g.EkipBuyuklugu != null && g.EkipBuyuklugu <= filtre.EkipMax);

        var girisimler = await query
            .Include(g => g.SatisKayitlari.Where(s => s.OnayDurumu == OnayDurumu.Onaylandi))
            .Include(g => g.YatirimKayitlari.Where(y => y.OnayDurumu == OnayDurumu.Onaylandi))
            .ToListAsync();

        var sonuclar = BuildKarsilastirmaSonuclari(girisimler);

        return sonuclar
            .Where(s => filtre.CiroMin is null || s.ToplamOnayliCiro >= filtre.CiroMin)
            .Where(s => filtre.CiroMax is null || s.ToplamOnayliCiro <= filtre.CiroMax)
            .Where(s => filtre.YatirimMin is null || s.ToplamOnayliYatirim >= filtre.YatirimMin)
            .Where(s => filtre.YatirimMax is null || s.ToplamOnayliYatirim <= filtre.YatirimMax)
            .OrderByDescending(s => s.ToplamOnayliCiro)
            .ToList();
    }

    /// <summary>Detaylı rakip analizi (madde 11) için belirli bir girişim setinin karşılaştırma verisi — filtresiz, doğrudan ID ile.</summary>
    public async Task<List<GirisimKarsilastirmaSonuc>> GetKarsilastirmaByIdsAsync(List<Guid> girisimIds)
    {
        var girisimler = await _db.Girisimler
            .Where(g => girisimIds.Contains(g.Id))
            .Include(g => g.SatisKayitlari.Where(s => s.OnayDurumu == OnayDurumu.Onaylandi))
            .Include(g => g.YatirimKayitlari.Where(y => y.OnayDurumu == OnayDurumu.Onaylandi))
            .ToListAsync();

        return BuildKarsilastirmaSonuclari(girisimler).OrderByDescending(s => s.ToplamOnayliCiro).ToList();
    }

    private static List<GirisimKarsilastirmaSonuc> BuildKarsilastirmaSonuclari(List<Girisim> girisimler)
    {
        var windowStart = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1).AddMonths(-5);
        var sonuclar = new List<GirisimKarsilastirmaSonuc>();

        foreach (var g in girisimler)
        {
            var ciro = g.SatisKayitlari.Sum(s => s.Ciro);
            var yatirim = g.YatirimKayitlari.Sum(y => y.Tutar);

            var trend = new List<AylikTrend>();
            for (var i = 0; i < 6; i++)
            {
                var d = windowStart.AddMonths(i);
                var ayCiro = g.SatisKayitlari.Where(s => s.CreatedAt.Year == d.Year && s.CreatedAt.Month == d.Month).Sum(s => s.Ciro);
                var ayYatirim = g.YatirimKayitlari.Where(y => y.CreatedAt.Year == d.Year && y.CreatedAt.Month == d.Month).Sum(y => y.Tutar);
                trend.Add(new AylikTrend($"{AyKisaltmalari[d.Month - 1]} {d.Year}", ayCiro, ayYatirim));
            }

            sonuclar.Add(new GirisimKarsilastirmaSonuc(g, ciro, yatirim, trend));
        }

        return sonuclar;
    }

    /// <summary>Seçilen girişim setine göre AI destekli rakip analizi (SWOT + pazar payı + büyüme yorumu) promptu üretir.</summary>
    public static string BuildRakipAnaliziPrompt(List<GirisimKarsilastirmaSonuc> secilenler)
    {
        var toplamCiro = secilenler.Sum(s => s.ToplamOnayliCiro);
        var girisimlerText = string.Join("\n\n", secilenler.Select(s =>
        {
            var ilkAy = s.AylikTrend.First().Ciro;
            var sonAy = s.AylikTrend.Last().Ciro;
            var buyumeText = ilkAy > 0
                ? $"{((sonAy - ilkAy) / ilkAy * 100):N0}%"
                : (sonAy > 0 ? "yeni gelir (önceki dönemde ciro yok)" : "veri yok");
            var pazarPayi = toplamCiro > 0 ? $"{(s.ToplamOnayliCiro / toplamCiro * 100):N0}%" : "veri yok";

            return
                $"""
                - {s.Girisim.Ad}
                  Sektör: {s.Girisim.Sektor ?? "belirtilmemiş"} | Kuruluş: {s.Girisim.KurulusYili?.ToString() ?? "?"} | Ekip: {s.Girisim.EkipBuyuklugu?.ToString() ?? "?"} kişi
                  Onaylı Ciro: {s.ToplamOnayliCiro:N0} TRY | Onaylı Yatırım: {s.ToplamOnayliYatirim:N0} TRY
                  Seçili set içindeki ciro payı (kabaca pazar payı vekili): {pazarPayi}
                  Son 6 ay ciro değişimi: {buyumeText}
                """;
        }));

        return
            $"""
            Sen T3 Vakfı Girişim Ekosistemi Yönetim Sistemi için bir rekabet analizi asistanısın. Aşağıda karşılaştırılan
            girişimlerin verileri var. Türkçe, kısa ve öz (madde işaretli) bir "rakip analizi" raporu yaz:
            1) Her girişim için 1-2 satırlık SWOT-benzeri değerlendirme (güçlü/zayıf yön, veriden çıkarsanabildiği kadarıyla).
            2) Karşılaştırılan set içindeki göreli pazar konumlandırması (ciro payına göre kim önde, kim geride).
            3) Büyüme trendi karşılaştırması (kim hızlı büyüyor, kim duraklamış/gerilemiş).
            4) Karar vericiye 1-2 somut öneri (ör. hangi girişime öncelik/destek verilebilir).
            Süslü giriş/kapanış cümlesi yazma, doğrudan maddelerle başla. Veri azsa (kısa geçmiş, tek aylık kayıt) bunu
            doğal karşıla, abartılı yorum yapma. "Pazar payı" ifadesinin gerçek pazar verisi değil, karşılaştırılan set
            içindeki ciro oranından bir vekil (proxy) olduğunu unutma ve buna göre temkinli bir dille yaz.

            Karşılaştırılan Girişimler:
            {girisimlerText}
            """;
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

    public async Task<(bool Success, string? Error)> DeleteIstihdamKaydiAsync(Guid girisimId, Guid id)
    {
        var kayit = await _db.IstihdamKayitlari.FirstOrDefaultAsync(x => x.Id == id && x.GirisimId == girisimId);
        if (kayit is null) return (false, "Kayıt bulunamadı.");
        if (kayit.OnayDurumu != OnayDurumu.Beklemede) return (false, "Sadece bekleyen kayıtlar silinebilir.");
        _db.IstihdamKayitlari.Remove(kayit);
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

    /// <summary>Self-correction: a startup can withdraw its own profile update request only while it's still awaiting review.</summary>
    public async Task<(bool Success, string? Error)> DeleteGuncellemeTalebiAsync(Guid girisimId, Guid id)
    {
        var talep = await _db.GirisimGuncellemeTalepleri.FirstOrDefaultAsync(x => x.Id == id && x.GirisimId == girisimId);
        if (talep is null) return (false, "Talep bulunamadı.");
        if (talep.OnayDurumu != OnayDurumu.Beklemede) return (false, "Sadece bekleyen talepler geri çekilebilir.");
        _db.GirisimGuncellemeTalepleri.Remove(talep);
        await _db.SaveChangesAsync();
        return (true, null);
    }
}
