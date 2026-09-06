using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using T3VentureOS.Domain.Entities;
using T3VentureOS.Infrastructure.Data;
using T3VentureOS.Infrastructure.Services;
using T3VentureOS.Web.Auth;

namespace T3VentureOS.Web.Controllers;

public record NakitPlaniRequest(
    [property: JsonRequired] [Range(typeof(decimal), "0", "999999999999.99", ParseLimitsInInvariantCulture = true)] decimal KasadakiPara,
    [property: JsonRequired] [Range(typeof(decimal), "0", "999999999999.99", ParseLimitsInInvariantCulture = true)] decimal AylikGelir,
    [property: JsonRequired] [Range(typeof(decimal), "0", "999999999999.99", ParseLimitsInInvariantCulture = true)] decimal AylikGider,
    Guid? Version);
public record HaftalikHedefRequest([Required(AllowEmptyStrings = true), StringLength(200)] string Baslik, bool Tamamlandi);
public record HaftalikHedeflerRequest(
    [Required, MinLength(3), MaxLength(3)] List<HaftalikHedefRequest> Hedefler, Guid? Version);

/// <summary>Private workspace tools: the startup is resolved from the authenticated user, never the request.</summary>
[ApiController]
[Route("api/girisimler/benim/araclar")]
[Authorize(Policy = AuthorizationPolicies.StartupErisimi)]
public class GirisimAraclariController(AppDbContext db, ICurrentUserService user) : ControllerBase
{
    // The platform's weekly planning calendar is Europe/Istanbul (UTC+3).
    public static DateOnly BuHafta(DateTimeOffset now)
    {
        var today = DateOnly.FromDateTime(now.ToOffset(TimeSpan.FromHours(3)).DateTime);
        return today.AddDays(-(((int)today.DayOfWeek + 6) % 7));
    }

    private async Task<Guid?> GirisimIdAsync() => user.GirisimId is Guid id &&
        await db.Girisimler.AnyAsync(g => g.Id == id) ? id : null;

    [HttpGet("nakit")]
    public async Task<IActionResult> Nakit()
    {
        if (await GirisimIdAsync() is not Guid id) return NotFound();
        var plan = await db.NakitPlanlari.AsNoTracking().SingleOrDefaultAsync(x => x.GirisimId == id);
        return Ok(new { plan = plan is null ? null : NakitDto(plan) });
    }

    [HttpPut("nakit")]
    public async Task<IActionResult> NakitKaydet(NakitPlaniRequest request)
    {
        if (await GirisimIdAsync() is not Guid id) return NotFound();
        if (new[] { request.KasadakiPara, request.AylikGelir, request.AylikGider }
            .Any(x => decimal.Round(x, 2) != x))
            return BadRequest(new { error = "Tutarlar en fazla iki ondalık basamak içerebilir." });
        var plan = await db.NakitPlanlari.SingleOrDefaultAsync(x => x.GirisimId == id);
        if (plan?.Version != request.Version) return DegisiklikCakismasi();
        if (plan is null)
        {
            plan = new NakitPlani { GirisimId = id };
            db.NakitPlanlari.Add(plan);
        }
        plan.KasadakiPara = request.KasadakiPara;
        plan.AylikGelir = request.AylikGelir;
        plan.AylikGider = request.AylikGider;
        plan.UpdatedAt = DateTime.UtcNow;
        plan.Version = Guid.NewGuid();
        return await KaydetAsync(new { plan = NakitDto(plan) });
    }

    [HttpGet("hedefler")]
    public async Task<IActionResult> Hedefler([FromQuery] DateOnly? hafta)
    {
        if (await GirisimIdAsync() is not Guid id) return NotFound();
        var current = BuHafta(DateTimeOffset.UtcNow);
        var week = hafta ?? current;
        if (!GecerliHafta(week, current)) return BadRequest(new { error = "Geçerli bir geçmiş hafta veya bu haftayı seçin." });
        var kayit = await db.HaftalikHedefler.AsNoTracking()
            .SingleOrDefaultAsync(x => x.GirisimId == id && x.HaftaBaslangici == week);
        return Ok(HedefYaniti(week, current, kayit));
    }

    [HttpPut("hedefler/{hafta}")]
    public async Task<IActionResult> HedefKaydet(DateOnly hafta, HaftalikHedeflerRequest request)
    {
        if (await GirisimIdAsync() is not Guid id) return NotFound();
        var current = BuHafta(DateTimeOffset.UtcNow);
        if (!GecerliHafta(hafta, current)) return BadRequest(new { error = "Geçerli bir geçmiş hafta veya bu haftayı seçin." });
        if (request.Hedefler.Any(x => x is null || x.Baslik is null || (string.IsNullOrWhiteSpace(x.Baslik) && x.Tamamlandi)))
            return BadRequest(new { error = "Boş hedef tamamlandı olarak işaretlenemez." });
        var kayit = await db.HaftalikHedefler.SingleOrDefaultAsync(x => x.GirisimId == id && x.HaftaBaslangici == hafta);
        if (kayit?.Version != request.Version) return DegisiklikCakismasi();
        if (kayit is null)
        {
            kayit = new HaftalikHedefler { GirisimId = id, HaftaBaslangici = hafta };
            db.HaftalikHedefler.Add(kayit);
        }
        kayit.Hedef1 = request.Hedefler[0].Baslik.Trim();
        kayit.Hedef2 = request.Hedefler[1].Baslik.Trim();
        kayit.Hedef3 = request.Hedefler[2].Baslik.Trim();
        kayit.Tamamlandi1 = request.Hedefler[0].Tamamlandi;
        kayit.Tamamlandi2 = request.Hedefler[1].Tamamlandi;
        kayit.Tamamlandi3 = request.Hedefler[2].Tamamlandi;
        kayit.UpdatedAt = DateTime.UtcNow;
        kayit.Version = Guid.NewGuid();
        return await KaydetAsync(HedefYaniti(hafta, current, kayit));
    }

    private static object NakitDto(NakitPlani plan) => new
    {
        plan.GirisimId, plan.KasadakiPara, plan.AylikGelir, plan.AylikGider, plan.Version,
        updatedAt = DateTime.SpecifyKind(plan.UpdatedAt, DateTimeKind.Utc),
    };

    private static bool GecerliHafta(DateOnly hafta, DateOnly current) =>
        hafta.DayOfWeek == DayOfWeek.Monday && hafta >= new DateOnly(2020, 1, 6) && hafta <= current;

    private static object HedefYaniti(DateOnly hafta, DateOnly current, HaftalikHedefler? kayit) => new
    {
        haftaBaslangici = hafta,
        buHafta = current,
        version = kayit?.Version,
        updatedAt = kayit is null ? (DateTime?)null : DateTime.SpecifyKind(kayit.UpdatedAt, DateTimeKind.Utc),
        hedefler = new[]
        {
            new { baslik = kayit?.Hedef1 ?? "", tamamlandi = kayit?.Tamamlandi1 ?? false },
            new { baslik = kayit?.Hedef2 ?? "", tamamlandi = kayit?.Tamamlandi2 ?? false },
            new { baslik = kayit?.Hedef3 ?? "", tamamlandi = kayit?.Tamamlandi3 ?? false },
        },
    };

    private ConflictObjectResult DegisiklikCakismasi() => Conflict(new
    {
        error = "Bu kayıt başka bir sekmede güncellendi. Son kaydı yükleyip değişikliğinizi tekrar yapın.",
    });

    private async Task<IActionResult> KaydetAsync(object response)
    {
        try
        {
            await db.SaveChangesAsync();
            return Ok(response);
        }
        catch (DbUpdateConcurrencyException) { return DegisiklikCakismasi(); }
        catch (DbUpdateException ex) when (ex.InnerException is SqlException { Number: 2601 or 2627 })
        { return DegisiklikCakismasi(); }
    }
}
