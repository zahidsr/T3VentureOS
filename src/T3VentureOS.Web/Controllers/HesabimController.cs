using T3VentureOS.Infrastructure.Services;
using T3VentureOS.Web.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace T3VentureOS.Web.Controllers;

/// <summary>KVKK/GDPR self-servis: kendi verini dışa aktarma ve hesap silme talebi.</summary>
[ApiController]
[Route("api/hesabim")]
[Authorize]
public class HesabimController : ControllerBase
{
    private readonly PrivacyService _privacy;
    private readonly ICurrentUserService _currentUser;

    public HesabimController(PrivacyService privacy, ICurrentUserService currentUser)
    {
        _privacy = privacy;
        _currentUser = currentUser;
    }

    [HttpGet("veri-ihracim")]
    public async Task<IActionResult> VeriIhracim()
    {
        var data = await _privacy.ExportUserDataAsync(_currentUser.UserId!.Value);
        if (data is null) return NotFound();
        return Ok(data);
    }

    [HttpGet("silme-talebi")]
    public async Task<IActionResult> GetSilmeTalebi()
    {
        var talep = await _privacy.GetOwnRequestAsync(_currentUser.UserId!.Value);
        if (talep is null) return NotFound();
        return Ok(new SilmeTalebiDto(talep.Id, talep.Durum.ToString(), talep.ReviewNotu, talep.CreatedAt));
    }

    [HttpPost("silme-talebi")]
    public async Task<IActionResult> RequestDeletion(RequestDeletionRequest request)
    {
        var (success, error) = await _privacy.RequestDeletionAsync(_currentUser.UserId!.Value, request.Sebep);
        if (!success) return BadRequest(new ErrorResponse(error ?? "Talep gönderilemedi."));
        return Ok(new MessageResponse("Hesap silme talebiniz alındı, SuperAdmin onayına gönderildi."));
    }
}
