using T3VentureOS.Domain;
using T3VentureOS.Infrastructure.Services;
using T3VentureOS.Web.Auth;
using T3VentureOS.Web.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace T3VentureOS.Web.Controllers.Admin;

[ApiController]
[Route("api/admin/users")]
[Authorize(Policy = AuthorizationPolicies.SistemYonetimiErisimi)]
public class UsersController : ControllerBase
{
    private readonly UserService _users;
    private readonly ICurrentUserService _currentUser;

    public UsersController(UserService users, ICurrentUserService currentUser)
    {
        _users = users;
        _currentUser = currentUser;
    }

    [HttpGet]
    public async Task<IActionResult> Index(
        [FromQuery] string? role, [FromQuery] string? ara, [FromQuery] int page = 1, [FromQuery] int pageSize = 12)
    {
        UserRole? parsedRole = null;
        if (!string.IsNullOrWhiteSpace(role) && Enum.TryParse<UserRole>(role, true, out var r))
            parsedRole = r;

        var result = await _users.ListAsync(parsedRole, ara, page, pageSize);
        return Ok(result.ToPagedDto(u => u.ToDto()));
    }

    [HttpPost("invite")]
    public async Task<IActionResult> Invite(InviteUserRequest request)
    {
        if (!Enum.TryParse<UserRole>(request.Role, true, out var role))
            return BadRequest(new ErrorResponse("Geçersiz rol."));

        var (success, error, user) = await _users.InviteUserAsync(request.Email, request.FullName, role, request.GirisimId);
        if (!success || user is null)
            return BadRequest(new ErrorResponse(error ?? "Kullanıcı davet edilemedi."));

        return Ok(user.ToDto());
    }

    [HttpPost("{id:guid}/resend-invite")]
    public async Task<IActionResult> ResendInvite(Guid id)
    {
        var (success, error) = await _users.ResendInviteAsync(id);
        if (!success) return BadRequest(new ErrorResponse(error ?? "Davet e-postası gönderilemedi."));
        return Ok(new MessageResponse("Davet e-postası yeniden gönderildi."));
    }

    [HttpPost("{id:guid}/disable")]
    public async Task<IActionResult> Disable(Guid id)
    {
        if (_currentUser.UserId == id)
            return BadRequest(new ErrorResponse("Kendi hesabınızı devre dışı bırakamazsınız."));

        var (success, error) = await _users.SetDisabledAsync(id, disabled: true);
        if (!success) return BadRequest(new ErrorResponse(error ?? "İşlem gerçekleştirilemedi."));
        return Ok(new MessageResponse("Kullanıcı devre dışı bırakıldı."));
    }

    [HttpPost("{id:guid}/enable")]
    public async Task<IActionResult> Enable(Guid id)
    {
        var (success, error) = await _users.SetDisabledAsync(id, disabled: false);
        if (!success) return BadRequest(new ErrorResponse(error ?? "İşlem gerçekleştirilemedi."));
        return Ok(new MessageResponse("Kullanıcı aktifleştirildi."));
    }
}
