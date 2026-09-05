using T3VentureOS.Infrastructure.Services;
using T3VentureOS.Web.Auth;
using T3VentureOS.Web.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace T3VentureOS.Web.Controllers;

[ApiController]
[Route("api/dashboard")]
[Authorize(Policy = AuthorizationPolicies.YoneticiErisimi)]
public class DashboardController : ControllerBase
{
    private readonly DashboardService _dashboard;
    private readonly AnthropicService _ai;
    private readonly ICurrentUserService _currentUser;

    public DashboardController(DashboardService dashboard, AnthropicService ai, ICurrentUserService currentUser)
    {
        _dashboard = dashboard;
        _ai = ai;
        _currentUser = currentUser;
    }

    [HttpGet]
    public async Task<IActionResult> Index(
        [FromQuery] DateTime? baslangic,
        [FromQuery] DateTime? bitis,
        [FromQuery] string? sektor,
        [FromQuery] Guid? programId,
        [FromQuery] Guid? girisimId)
    {
        var filter = new DashboardFilter(baslangic, bitis, sektor, programId, girisimId);
        var stats = await _dashboard.GetStatsAsync(filter);
        return Ok(new DashboardStatsDto(
            stats.ToplamGirisim,
            stats.AktifProgramSayisi,
            stats.BekleyenOnaySayisi,
            stats.ToplamOnayliYatirim,
            stats.ToplamOnayliCiro,
            stats.SektorDagilimi.Select(s => new SektorSayisiDto(s.Sektor, s.Sayi)).ToList(),
            stats.YatirimTuruDagilimi.Select(y => new YatirimTuruDagilimiDto(y.Tur, y.ToplamTutar)).ToList(),
            stats.AylikTrend.Select(a => new AylikTrendDto(a.Ay, a.Ciro, a.Yatirim)).ToList()));
    }

    [HttpGet("filtre-secenekleri")]
    public async Task<IActionResult> FiltreSecenekleri()
    {
        var secenekler = await _dashboard.GetFiltreSecenekleriAsync();
        return Ok(new DashboardFiltreSecenekleriDto(
            secenekler.Sektorler,
            secenekler.Programlar.Select(p => new ProgramSecenegiDto(p.Id, p.Ad)).ToList(),
            secenekler.Girisimler.Select(g => new GirisimSecenegiDto(g.Id, g.Ad)).ToList()));
    }

    /// <summary>Public — feeds the homepage hero's live stat panel, shown to logged-out visitors too.</summary>
    [HttpGet("ozet")]
    [AllowAnonymous]
    public async Task<IActionResult> Ozet()
    {
        var stats = await _dashboard.GetStatsAsync();
        return Ok(new PublicStatsDto(stats.ToplamGirisim, stats.AktifProgramSayisi, stats.ToplamOnayliYatirim));
    }

    [HttpPost("ai-analiz")]
    public async Task<IActionResult> AiAnaliz()
    {
        var stats = await _dashboard.GetStatsAsync();
        var prompt = DashboardService.BuildAiPrompt(stats);
        var (success, text, error) = await _ai.GenerateInsightAsync(prompt);
        if (!success) return BadRequest(new ErrorResponse(error ?? "AI analizi oluşturulamadı."));

        await _dashboard.SaveAiAnalizAsync(_currentUser.UserId!.Value, text!);
        return Ok(new AiAnalizDto(text!));
    }

    [HttpGet("ai-analiz-gecmisi")]
    public async Task<IActionResult> AiAnalizGecmisi([FromQuery] int limit = 10)
    {
        var list = await _dashboard.ListAiAnalizGecmisiAsync(limit);
        return Ok(list.Select(a => new AiAnalizKaydiDto(a.Id, a.CreatedAt, a.CreatedByAdSoyad, a.Metin)).ToList());
    }
}
