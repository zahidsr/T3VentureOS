using System.Security.Claims;
using T3VentureOS.Domain;
using T3VentureOS.Infrastructure.Services;

namespace T3VentureOS.Web.Auth;

public class HttpCurrentUserService : ICurrentUserService
{
    private readonly ClaimsPrincipal? _user;

    public HttpCurrentUserService(IHttpContextAccessor accessor)
    {
        _user = accessor.HttpContext?.User;
    }

    public bool IsAuthenticated => _user?.Identity?.IsAuthenticated ?? false;

    public Guid? UserId => IsAuthenticated && Guid.TryParse(_user!.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    public Guid? GirisimId => IsAuthenticated && Guid.TryParse(_user!.FindFirstValue(AppClaimTypes.GirisimId), out var id) ? id : null;

    public UserRole? Role => IsAuthenticated && Enum.TryParse<UserRole>(_user!.FindFirstValue(ClaimTypes.Role), out var role) ? role : null;
}

public static class AppClaimTypes
{
    public const string GirisimId = "girisim_id";
}
