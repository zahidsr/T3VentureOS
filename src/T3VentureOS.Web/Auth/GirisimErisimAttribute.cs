using T3VentureOS.Domain;
using T3VentureOS.Infrastructure.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace T3VentureOS.Web.Auth;

/// <summary>
/// Resource-based authorization for girişim-scoped endpoints: a StartupKullanicisi may only act on
/// their own Girisim — matched against the route's Guid parameter (named "id" by default). Every
/// other role that already passed the endpoint's role/policy check is left untouched.
///
/// Centralizes what GirisimlerController used to re-implement as a private CanAccess(...) check,
/// manually called (and easy to forget) at the top of over a dozen separate actions.
/// </summary>
[AttributeUsage(AttributeTargets.Method | AttributeTargets.Class)]
public class GirisimErisimAttribute : Attribute, IAsyncAuthorizationFilter
{
    private readonly string _routeParam;

    public GirisimErisimAttribute(string routeParam = "id")
    {
        _routeParam = routeParam;
    }

    public Task OnAuthorizationAsync(AuthorizationFilterContext context)
    {
        var currentUser = context.HttpContext.RequestServices.GetRequiredService<ICurrentUserService>();

        if (currentUser.Role != UserRole.StartupKullanicisi)
            return Task.CompletedTask;

        var matchesOwnGirisim =
            context.RouteData.Values.TryGetValue(_routeParam, out var raw) &&
            Guid.TryParse(raw?.ToString(), out var girisimId) &&
            currentUser.GirisimId == girisimId;

        if (!matchesOwnGirisim)
            context.Result = new ForbidResult();

        return Task.CompletedTask;
    }
}
