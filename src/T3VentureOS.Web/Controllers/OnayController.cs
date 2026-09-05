using T3VentureOS.Domain;
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
    private readonly OnayOneriService _oneriler;
    private readonly ICurrentUserService _currentUser;

    public OnayController(
        OnayService onay, ItirazService itirazlar, OnayOneriService oneriler, ICurrentUserService currentUser)
    {
        _onay = onay;
        _itirazlar = itirazlar;
        _oneriler = oneriler;
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

        var konular = satislar.Select(x => (OnayKonusuTuru.Satis, x.Id))
            .Concat(yatirimlar.Select(x => (OnayKonusuTuru.Yatirim, x.Id)))
            .Concat(basarilar.Select(x => (OnayKonusuTuru.Basari, x.Id)))
            .Concat(dokumanlar.Select(x => (OnayKonusuTuru.Dokuman, x.Id)))
            .Concat(guncellemeler.Select(x => (OnayKonusuTuru.Guncelleme, x.Id)))
            .Concat(itirazlar.Select(x => (OnayKonusuTuru.Itiraz, x.Id)));
        var oneriler = await _oneriler.ListForKonularAsync(konular);

        var dto = new OnayKuyruguDto(
            satislar.Select(s => new OnayBekleyenSatisDto(s.Id, s.GirisimId, s.Girisim?.Ad ?? string.Empty, s.Donem, s.Ciro, s.Ihracat, s.CreatedAt)).ToList(),
            yatirimlar.Select(y => new OnayBekleyenYatirimDto(y.Id, y.GirisimId, y.Girisim?.Ad ?? string.Empty, y.Tur.ToString(), y.Tutar, y.ParaBirimi, y.Tarih, y.YatirimciAdi, y.CreatedAt)).ToList(),
            basarilar.Select(b => new OnayBekleyenBasariDto(b.Id, b.GirisimId, b.Girisim?.Ad ?? string.Empty, b.Tur.ToString(), b.Baslik, b.Tarih, b.CreatedAt)).ToList(),
            dokumanlar.Select(d => new OnayBekleyenDokumanDto(d.Id, d.GirisimId, d.Girisim?.Ad ?? string.Empty, d.Baslik, d.DosyaAdi, d.DosyaUrl, d.CreatedAt)).ToList(),
            guncellemeler.Select(t => new OnayBekleyenGuncellemeDto(t.Id, t.GirisimId, t.Girisim?.Ad ?? string.Empty, t.Ad, t.Sektor, t.CreatedAt)).ToList(),
            itirazlar.Select(i => new OnayBekleyenItirazDto(i.Id, i.GirisimId, i.Girisim?.Ad ?? string.Empty, i.KonuTuru.ToString(), i.KonuId, i.Aciklama, i.CreatedAt)).ToList(),
            oneriler.Select(o => new OnayOnerisiDto(
                o.Id, o.KonuTuru.ToString(), o.KonuId, o.Tavsiye.ToString(), o.Not,
                o.OneriVeren?.FullName ?? string.Empty, o.CreatedAt, o.UpdatedAt)).ToList());

        return Ok(dto);
    }

    /// <summary>
    /// ProgramYoneticisi'nin bekleyen bir kayda bıraktığı öneri. Bağlayıcı değildir — kararı
    /// SuperAdmin verir; aynı kullanıcının önceki önerisi güncellenir.
    /// </summary>
    [HttpPost("oneri")]
    public async Task<IActionResult> Oneri(OnayOnerisiRequest request)
    {
        if (!Enum.TryParse<OnayKonusuTuru>(request.KonuTuru, ignoreCase: true, out var konuTuru))
            return BadRequest(new ErrorResponse("Geçersiz konu türü."));

        if (!Enum.TryParse<OneriTavsiyesi>(request.Tavsiye, ignoreCase: true, out var tavsiye))
            return BadRequest(new ErrorResponse("Geçersiz öneri türü."));

        // Bir "reddedilsin"/"çekincem var" kararı veren SuperAdmin'e gerekçesiz ulaşırsa işe yaramaz.
        if (tavsiye != OneriTavsiyesi.Onay && string.IsNullOrWhiteSpace(request.Not))
            return BadRequest(new ErrorResponse("Ret ve çekince önerileri için gerekçe zorunludur."));

        var oneri = await _oneriler.UpsertAsync(
            konuTuru, request.KonuId, _currentUser.UserId!.Value, tavsiye, request.Not);

        return Ok(new OnayOnerisiDto(
            oneri.Id, oneri.KonuTuru.ToString(), oneri.KonuId, oneri.Tavsiye.ToString(), oneri.Not,
            oneri.OneriVeren?.FullName ?? string.Empty, oneri.CreatedAt, oneri.UpdatedAt));
    }

    /// <summary>Rejecting a submission without a reason leaves the startup with no idea what to fix — require one.</summary>
    private static IActionResult? ValidateKarar(OnayKararRequest request) =>
        !request.Onayla && string.IsNullOrWhiteSpace(request.Not)
            ? new BadRequestObjectResult(new ErrorResponse("Reddetme sebebi zorunludur."))
            : null;

    [HttpPost("satis/{id:guid}")]
    [Authorize(Policy = AuthorizationPolicies.OnayKararErisimi)]
    public async Task<IActionResult> KararVerSatis(Guid id, OnayKararRequest request)
    {
        if (ValidateKarar(request) is { } invalid) return invalid;
        var ok = await _onay.KararVerSatisAsync(id, _currentUser.UserId!.Value, request.Onayla, request.Not);
        if (!ok) return NotFound();
        await _oneriler.ClearAsync(OnayKonusuTuru.Satis, id);
        return Ok(new MessageResponse(request.Onayla ? "Satış kaydı onaylandı." : "Satış kaydı reddedildi."));
    }

    [HttpPost("yatirim/{id:guid}")]
    [Authorize(Policy = AuthorizationPolicies.OnayKararErisimi)]
    public async Task<IActionResult> KararVerYatirim(Guid id, OnayKararRequest request)
    {
        if (ValidateKarar(request) is { } invalid) return invalid;
        var ok = await _onay.KararVerYatirimAsync(id, _currentUser.UserId!.Value, request.Onayla, request.Not);
        if (!ok) return NotFound();
        await _oneriler.ClearAsync(OnayKonusuTuru.Yatirim, id);
        return Ok(new MessageResponse(request.Onayla ? "Yatırım kaydı onaylandı." : "Yatırım kaydı reddedildi."));
    }

    [HttpPost("basari/{id:guid}")]
    [Authorize(Policy = AuthorizationPolicies.OnayKararErisimi)]
    public async Task<IActionResult> KararVerBasari(Guid id, OnayKararRequest request)
    {
        if (ValidateKarar(request) is { } invalid) return invalid;
        var ok = await _onay.KararVerBasariAsync(id, _currentUser.UserId!.Value, request.Onayla, request.Not);
        if (!ok) return NotFound();
        await _oneriler.ClearAsync(OnayKonusuTuru.Basari, id);
        return Ok(new MessageResponse(request.Onayla ? "Başarı kaydı onaylandı." : "Başarı kaydı reddedildi."));
    }

    [HttpPost("dokuman/{id:guid}")]
    [Authorize(Policy = AuthorizationPolicies.OnayKararErisimi)]
    public async Task<IActionResult> KararVerDokuman(Guid id, OnayKararRequest request)
    {
        if (ValidateKarar(request) is { } invalid) return invalid;
        var ok = await _onay.KararVerDokumanAsync(id, _currentUser.UserId!.Value, request.Onayla, request.Not);
        if (!ok) return NotFound();
        await _oneriler.ClearAsync(OnayKonusuTuru.Dokuman, id);
        return Ok(new MessageResponse(request.Onayla ? "Doküman onaylandı." : "Doküman reddedildi."));
    }

    [HttpPost("guncelleme/{id:guid}")]
    [Authorize(Policy = AuthorizationPolicies.OnayKararErisimi)]
    public async Task<IActionResult> KararVerGuncelleme(Guid id, OnayKararRequest request)
    {
        if (ValidateKarar(request) is { } invalid) return invalid;
        var ok = await _onay.KararVerGuncellemeAsync(id, _currentUser.UserId!.Value, request.Onayla, request.Not);
        if (!ok) return NotFound();
        await _oneriler.ClearAsync(OnayKonusuTuru.Guncelleme, id);
        return Ok(new MessageResponse(request.Onayla ? "Profil güncellemesi onaylandı." : "Profil güncellemesi reddedildi."));
    }

    [HttpPost("itiraz/{id:guid}")]
    [Authorize(Policy = AuthorizationPolicies.OnayKararErisimi)]
    public async Task<IActionResult> KararVerItiraz(Guid id, OnayKararRequest request)
    {
        if (ValidateKarar(request) is { } invalid) return invalid;
        var ok = await _itirazlar.KararVerAsync(id, _currentUser.UserId!.Value, request.Onayla, request.Not);
        if (!ok) return NotFound();
        await _oneriler.ClearAsync(OnayKonusuTuru.Itiraz, id);
        return Ok(new MessageResponse(request.Onayla ? "İtiraz kabul edildi." : "İtiraz reddedildi."));
    }
}
