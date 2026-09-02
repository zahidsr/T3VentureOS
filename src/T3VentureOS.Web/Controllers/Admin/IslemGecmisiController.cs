using T3VentureOS.Infrastructure.Services;
using T3VentureOS.Web.Auth;
using T3VentureOS.Web.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace T3VentureOS.Web.Controllers.Admin;

/// <summary>SuperAdmin'lerin kullanıcı yönetimi üzerinde yaptığı işlemlerin geçmişi (audit log).</summary>
[ApiController]
[Route("api/admin/islem-gecmisi")]
[Authorize(Policy = AuthorizationPolicies.SistemYonetimiErisimi)]
public class IslemGecmisiController : ControllerBase
{
    private readonly AuditLogService _audit;

    public IslemGecmisiController(AuditLogService audit)
    {
        _audit = audit;
    }

    [HttpGet]
    public async Task<IActionResult> Index(
        [FromQuery] Guid? hedefKullaniciId, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var result = await _audit.ListAsync(hedefKullaniciId, page, pageSize);
        return Ok(result.ToPagedDto(k => k.ToDto()));
    }
}
