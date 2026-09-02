using T3VentureOS.Domain;

namespace T3VentureOS.Infrastructure.Services;

/// <summary>Resolves the signed-in user's identity from the current request. Implemented in the Web layer against HttpContext.</summary>
public interface ICurrentUserService
{
    Guid? UserId { get; }
    Guid? GirisimId { get; }
    UserRole? Role { get; }
    bool IsAuthenticated { get; }
}
