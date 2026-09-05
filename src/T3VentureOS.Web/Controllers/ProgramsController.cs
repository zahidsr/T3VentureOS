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
    private readonly ProgramKohortService _kohort;
    private readonly ICurrentUserService _currentUser;
    private readonly FileStorageService _files;

    public ProgramsController(ProgramService programs, ProgramKohortService kohort, ICurrentUserService currentUser, FileStorageService files)
    {
        _programs = programs;
        _kohort = kohort;
        _currentUser = currentUser;
        _files = files;
    }

    [HttpGet]
    public async Task<IActionResult> Index(
        [FromQuery] string? ara, [FromQuery] string? durum, [FromQuery] int page = 1, [FromQuery] int pageSize = 12)
    {
        ProgramDurumu? parsedDurum = null;
        if (!string.IsNullOrWhiteSpace(durum) && Enum.TryParse<ProgramDurumu>(durum, true, out var d))
            parsedDurum = d;

        var result = await _programs.ListAsync(ara, parsedDurum, page, pageSize);
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


    /// <summary>
    /// Programın kohortu: katılan girişimlerin program başlangıcından bugüne ciro, yatırım ve
    /// istihdam değişimi. Program yöneticisinin "bu program ne yaptı" sorusunun cevabı.
    /// </summary>
    [HttpGet("{id:guid}/kohort")]
    [Authorize(Policy = AuthorizationPolicies.YoneticiErisimi)]
    public async Task<IActionResult> Kohort(Guid id)
    {
        var k = await _kohort.GetAsync(id);
        if (k is null) return NotFound();

        return Ok(new ProgramKohortuDto(
            k.ProgramId, k.ProgramAdi, k.BaslangicTarihi, k.BitisTarihi, k.GirisimSayisi,
            k.ToplamProgramSirasindaCiro, k.ToplamProgramSirasindaYatirim, k.ToplamIstihdamArtisi,
            k.VeriGirmeyenGirisimSayisi,
            k.Satirlar.Select(s => new KohortSatiriDto(
                s.GirisimId, s.Ad, s.Sektor, s.KatilimDurumu, s.KatilimBaslangici,
                s.ProgramOncesiCiro, s.ProgramSirasindaCiro, s.ProgramBasindaCalisan, s.GuncelCalisan,
                s.ProgramSirasindaYatirim, s.Puan, s.Seviye.ToString(), s.GuncellemeUzerindenGecenGun)).ToList()));
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

    [HttpPost("{id:guid}/kapak")]
    [Authorize(Policy = AuthorizationPolicies.YoneticiErisimi)]
    [RequestSizeLimit(5_000_000)]
    public async Task<IActionResult> UploadKapakGorseli(Guid id, [FromForm] IFormFile file)
    {
        if (file.Length == 0) return BadRequest(new ErrorResponse("Dosya boş olamaz."));

        await using var stream = file.OpenReadStream();
        var (url, _) = await _files.SaveAsync(stream, file.FileName);

        var ok = await _programs.UpdateKapakGorseliAsync(id, url);
        if (!ok) return NotFound();

        var full = await _programs.GetAsync(id);
        return Ok(full!.ToDetailDto());
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
