using T3VentureOS.Infrastructure.Services;
using T3VentureOS.Web.Auth;
using T3VentureOS.Web.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace T3VentureOS.Web.Controllers.Admin;

/// <summary>KVKK hesap silme taleplerinin SuperAdmin tarafından karara bağlanması.</summary>
[ApiController]
[Route("api/admin/silme-talepleri")]
[Authorize(Policy = AuthorizationPolicies.SistemYonetimiErisimi)]
public class SilmeTalepleriController : ControllerBase
{
    private readonly PrivacyService _privacy;
    private readonly ICurrentUserService _currentUser;

    public SilmeTalepleriController(PrivacyService privacy, ICurrentUserService currentUser)
    {
        _privacy = privacy;
        _currentUser = currentUser;
    }

    [HttpGet]
    public async Task<IActionResult> Index()
    {
        var list = await _privacy.ListPendingAsync();
        return Ok(list.Select(t => new SilmeTalebiYonetimDto(
            t.Id, t.UserId, t.User?.Email ?? string.Empty, t.User?.FullName ?? string.Empty, t.Sebep, t.CreatedAt)).ToList());
    }

    [HttpPost("{id:guid}")]
    public async Task<IActionResult> KararVer(Guid id, OnayKararRequest request)
    {
        if (!request.Onayla && string.IsNullOrWhiteSpace(request.Not))
            return BadRequest(new ErrorResponse("Reddetme sebebi zorunludur."));

        var ok = await _privacy.KararVerAsync(id, _currentUser.UserId!.Value, request.Onayla, request.Not);
        if (!ok) return NotFound();
        return Ok(new MessageResponse(request.Onayla ? "Hesap silme talebi onaylandı." : "Hesap silme talebi reddedildi."));
    }
}
