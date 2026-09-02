using T3VentureOS.Infrastructure.Services;
using T3VentureOS.Web.Auth;
using T3VentureOS.Web.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace T3VentureOS.Web.Controllers;

[ApiController]
[Route("api/dashboard")]
[Authorize(Policy = AuthorizationPolicies.YonetimVeRaporErisimi)]
public class DashboardController : ControllerBase
{
    private readonly DashboardService _dashboard;
    private readonly AnthropicService _ai;

    public DashboardController(DashboardService dashboard, AnthropicService ai)
    {
        _dashboard = dashboard;
        _ai = ai;
    }

    [HttpGet]
    public async Task<IActionResult> Index()
    {
        var stats = await _dashboard.GetStatsAsync();
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
        return Ok(new AiAnalizDto(text!));
    }
}
