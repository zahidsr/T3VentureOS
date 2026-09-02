using T3VentureOS.Infrastructure.Services;
using T3VentureOS.Web.Auth;
using T3VentureOS.Web.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace T3VentureOS.Web.Controllers;

[ApiController]
[Route("api/onaylar")]
[Authorize(Policy = AuthorizationPolicies.YoneticiErisimi)]
public class OnayController : ControllerBase
{
    private readonly OnayService _onay;
    private readonly ItirazService _itirazlar;
    private readonly ICurrentUserService _currentUser;

    public OnayController(OnayService onay, ItirazService itirazlar, ICurrentUserService currentUser)
    {
        _onay = onay;
        _itirazlar = itirazlar;
        _currentUser = currentUser;
    }

    [HttpGet]
    public async Task<IActionResult> Index()
    {
        var satislar = await _onay.ListPendingSatisAsync();
        var yatirimlar = await _onay.ListPendingYatirimAsync();
        var basarilar = await _onay.ListPendingBasariAsync();
        var dokumanlar = await _onay.ListPendingDokumanAsync();
        var guncellemeler = await _onay.ListPendingGuncellemeAsync();
        var itirazlar = await _itirazlar.ListPendingAsync();

        var dto = new OnayKuyruguDto(
            satislar.Select(s => new OnayBekleyenSatisDto(s.Id, s.GirisimId, s.Girisim?.Ad ?? string.Empty, s.Donem, s.Ciro, s.Ihracat, s.CreatedAt)).ToList(),
            yatirimlar.Select(y => new OnayBekleyenYatirimDto(y.Id, y.GirisimId, y.Girisim?.Ad ?? string.Empty, y.Tur.ToString(), y.Tutar, y.ParaBirimi, y.Tarih, y.YatirimciAdi, y.CreatedAt)).ToList(),
            basarilar.Select(b => new OnayBekleyenBasariDto(b.Id, b.GirisimId, b.Girisim?.Ad ?? string.Empty, b.Tur.ToString(), b.Baslik, b.Tarih, b.CreatedAt)).ToList(),
            dokumanlar.Select(d => new OnayBekleyenDokumanDto(d.Id, d.GirisimId, d.Girisim?.Ad ?? string.Empty, d.Baslik, d.DosyaAdi, d.DosyaUrl, d.CreatedAt)).ToList(),
            guncellemeler.Select(t => new OnayBekleyenGuncellemeDto(t.Id, t.GirisimId, t.Girisim?.Ad ?? string.Empty, t.Ad, t.Sektor, t.CreatedAt)).ToList(),
            itirazlar.Select(i => new OnayBekleyenItirazDto(i.Id, i.GirisimId, i.Girisim?.Ad ?? string.Empty, i.KonuTuru.ToString(), i.KonuId, i.Aciklama, i.CreatedAt)).ToList());

        return Ok(dto);
    }

    /// <summary>Rejecting a submission without a reason leaves the startup with no idea what to fix — require one.</summary>
    private static IActionResult? ValidateKarar(OnayKararRequest request) =>
        !request.Onayla && string.IsNullOrWhiteSpace(request.Not)
            ? new BadRequestObjectResult(new ErrorResponse("Reddetme sebebi zorunludur."))
            : null;

    [HttpPost("satis/{id:guid}")]
    public async Task<IActionResult> KararVerSatis(Guid id, OnayKararRequest request)
    {
        if (ValidateKarar(request) is { } invalid) return invalid;
        var ok = await _onay.KararVerSatisAsync(id, _currentUser.UserId!.Value, request.Onayla, request.Not);
        if (!ok) return NotFound();
        return Ok(new MessageResponse(request.Onayla ? "Satış kaydı onaylandı." : "Satış kaydı reddedildi."));
    }

    [HttpPost("yatirim/{id:guid}")]
    public async Task<IActionResult> KararVerYatirim(Guid id, OnayKararRequest request)
    {
        if (ValidateKarar(request) is { } invalid) return invalid;
        var ok = await _onay.KararVerYatirimAsync(id, _currentUser.UserId!.Value, request.Onayla, request.Not);
        if (!ok) return NotFound();
        return Ok(new MessageResponse(request.Onayla ? "Yatırım kaydı onaylandı." : "Yatırım kaydı reddedildi."));
    }

    [HttpPost("basari/{id:guid}")]
    public async Task<IActionResult> KararVerBasari(Guid id, OnayKararRequest request)
    {
        if (ValidateKarar(request) is { } invalid) return invalid;
        var ok = await _onay.KararVerBasariAsync(id, _currentUser.UserId!.Value, request.Onayla, request.Not);
        if (!ok) return NotFound();
        return Ok(new MessageResponse(request.Onayla ? "Başarı kaydı onaylandı." : "Başarı kaydı reddedildi."));
    }

    [HttpPost("dokuman/{id:guid}")]
    public async Task<IActionResult> KararVerDokuman(Guid id, OnayKararRequest request)
    {
        if (ValidateKarar(request) is { } invalid) return invalid;
        var ok = await _onay.KararVerDokumanAsync(id, _currentUser.UserId!.Value, request.Onayla, request.Not);
        if (!ok) return NotFound();
        return Ok(new MessageResponse(request.Onayla ? "Doküman onaylandı." : "Doküman reddedildi."));
    }

    [HttpPost("guncelleme/{id:guid}")]
    public async Task<IActionResult> KararVerGuncelleme(Guid id, OnayKararRequest request)
    {
        if (ValidateKarar(request) is { } invalid) return invalid;
        var ok = await _onay.KararVerGuncellemeAsync(id, _currentUser.UserId!.Value, request.Onayla, request.Not);
        if (!ok) return NotFound();
        return Ok(new MessageResponse(request.Onayla ? "Profil güncellemesi onaylandı." : "Profil güncellemesi reddedildi."));
    }

    [HttpPost("itiraz/{id:guid}")]
    public async Task<IActionResult> KararVerItiraz(Guid id, OnayKararRequest request)
    {
        if (ValidateKarar(request) is { } invalid) return invalid;
        var ok = await _itirazlar.KararVerAsync(id, _currentUser.UserId!.Value, request.Onayla, request.Not);
        if (!ok) return NotFound();
        return Ok(new MessageResponse(request.Onayla ? "İtiraz kabul edildi." : "İtiraz reddedildi."));
    }
}
