using T3VentureOS.Domain;
using T3VentureOS.Domain.Entities;
using T3VentureOS.Infrastructure.Services;
using T3VentureOS.Web.Auth;
using T3VentureOS.Web.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace T3VentureOS.Web.Controllers;

[ApiController]
[Route("api/programs")]
[Authorize]
public class ProgramsController : ControllerBase
{
    private readonly ProgramService _programs;
    private readonly ICurrentUserService _currentUser;

    public ProgramsController(ProgramService programs, ICurrentUserService currentUser)
    {
        _programs = programs;
        _currentUser = currentUser;
    }

    [HttpGet]
    public async Task<IActionResult> Index([FromQuery] string? ara, [FromQuery] int page = 1, [FromQuery] int pageSize = 12)
    {
        var result = await _programs.ListAsync(ara, page, pageSize);
        return Ok(result.ToPagedDto(p => p.ToSummaryDto()));
    }

    /// <summary>Public — feeds the homepage's active-programs carousel, shown to logged-out visitors too.</summary>
    [HttpGet("aktif")]
    [AllowAnonymous]
    public async Task<IActionResult> Aktif()
    {
        var programs = await _programs.GetActiveAsync();
        return Ok(programs.Select(p => p.ToSummaryDto()).ToList());
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Details(Guid id)
    {
        var program = await _programs.GetAsync(id);
        if (program is null) return NotFound();
        return Ok(program.ToDetailDto());
    }

    [HttpPost]
    [Authorize(Policy = AuthorizationPolicies.YoneticiErisimi)]
    public async Task<IActionResult> Create(CreateProgramRequest request)
    {
        var program = new GirisimProgrami
        {
            Name = request.Name,
            Description = request.Description,
            BaslangicTarihi = request.BaslangicTarihi,
            BitisTarihi = request.BitisTarihi,
        };
        var created = await _programs.CreateAsync(_currentUser.UserId!.Value, program);
        var full = await _programs.GetAsync(created.Id);
        return Ok(full!.ToDetailDto());
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = AuthorizationPolicies.YoneticiErisimi)]
    public async Task<IActionResult> Update(Guid id, UpdateProgramRequest request)
    {
        var program = await _programs.GetAsync(id);
        if (program is null) return NotFound();

        program.Name = request.Name;
        program.Description = request.Description;
        program.Durum = Enum.Parse<ProgramDurumu>(request.Durum, ignoreCase: true);
        program.BaslangicTarihi = request.BaslangicTarihi;
        program.BitisTarihi = request.BitisTarihi;
        await _programs.UpdateAsync(program);

        return Ok(program.ToDetailDto());
    }

    /// <summary>Self-service: a StartupKullanicisi applies its own Girisim to this program.</summary>
    [HttpPost("{id:guid}/basvuru")]
    [Authorize(Policy = AuthorizationPolicies.StartupErisimi)]
    public async Task<IActionResult> Basvur(Guid id)
    {
        if (_currentUser.GirisimId is null) return BadRequest(new ErrorResponse("Bir girişime bağlı değilsiniz."));

        var (success, error) = await _programs.ApplyAsync(id, _currentUser.GirisimId.Value);
        if (!success) return BadRequest(new ErrorResponse(error ?? "Başvuru gönderilemedi."));

        return Ok(new MessageResponse("Başvurunuz alındı."));
    }

    [HttpPost("{id:guid}/katilimlar")]
    [Authorize(Policy = AuthorizationPolicies.YoneticiErisimi)]
    public async Task<IActionResult> AddKatilim(Guid id, AddKatilimRequest request)
    {
        var katilim = new ProgramKatilimi
        {
            ProgramId = id,
            GirisimId = request.GirisimId,
            Donem = request.Donem,
            Durum = Enum.Parse<KatilimDurumu>(request.Durum, ignoreCase: true),
        };
        await _programs.AddKatilimAsync(katilim);

        var full = await _programs.GetAsync(id);
        return Ok(full!.ToDetailDto());
    }

    [HttpPut("katilimlar/{katilimId:guid}/durum")]
    [Authorize(Policy = AuthorizationPolicies.YoneticiErisimi)]
    public async Task<IActionResult> UpdateKatilimDurumu(Guid katilimId, UpdateKatilimDurumuRequest request)
    {
        await _programs.UpdateKatilimDurumuAsync(katilimId, Enum.Parse<KatilimDurumu>(request.Durum, ignoreCase: true));
        return Ok(new MessageResponse("Katılım durumu güncellendi."));
    }
}
