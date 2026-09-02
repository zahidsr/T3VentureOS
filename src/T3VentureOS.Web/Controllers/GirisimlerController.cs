using T3VentureOS.Domain;
using T3VentureOS.Domain.Entities;
using T3VentureOS.Infrastructure.Services;
using T3VentureOS.Web.Auth;
using T3VentureOS.Web.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace T3VentureOS.Web.Controllers;

[ApiController]
[Route("api/girisimler")]
[Authorize]
public class GirisimlerController : ControllerBase
{
    private readonly GirisimService _girisimler;
    private readonly ICurrentUserService _currentUser;
    private readonly FileStorageService _files;
    private readonly ItirazService _itirazlar;
    private readonly OnboardingService _onboarding;

    public GirisimlerController(
        GirisimService girisimler, ICurrentUserService currentUser, FileStorageService files,
        ItirazService itirazlar, OnboardingService onboarding)
    {
        _girisimler = girisimler;
        _currentUser = currentUser;
        _files = files;
        _itirazlar = itirazlar;
        _onboarding = onboarding;
    }

    [HttpGet]
    [Authorize(Policy = AuthorizationPolicies.YonetimVeRaporErisimi)]
    public async Task<IActionResult> Index(
        [FromQuery] string? sektor, [FromQuery] Guid? programId, [FromQuery] string? ara, [FromQuery] string? sirala,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 12)
    {
        var result = await _girisimler.ListAsync(sektor, programId, ara, sirala, page, pageSize);
        return Ok(result.ToPagedDto(g => g.ToSummaryDto()));
    }

    [HttpGet("benim")]
    [Authorize(Policy = AuthorizationPolicies.StartupErisimi)]
    public async Task<IActionResult> Benim()
    {
        if (_currentUser.GirisimId is null) return NotFound();
        var girisim = await _girisimler.GetAsync(_currentUser.GirisimId.Value);
        if (girisim is null) return NotFound();
        return Ok(girisim.ToDetailDto());
    }

    [HttpGet("{id:guid}")]
    [GirisimErisim]
    public async Task<IActionResult> Details(Guid id)
    {
        var girisim = await _girisimler.GetAsync(id);
        if (girisim is null) return NotFound();
        return Ok(girisim.ToDetailDto());
    }

    [HttpPost]
    [Authorize(Policy = AuthorizationPolicies.YoneticiErisimi)]
    public async Task<IActionResult> Create(CreateGirisimRequest request)
    {
        var girisim = new Girisim
        {
            Ad = request.Ad,
            Sektor = request.Sektor,
            KisaTanim = request.KisaTanim,
            Teknoloji = request.Teknoloji,
            WebsiteUrl = request.WebsiteUrl,
            KurulusYili = request.KurulusYili,
            EkipBuyuklugu = request.EkipBuyuklugu,
        };
        var created = await _girisimler.CreateAsync(_currentUser.UserId!.Value, girisim);
        var full = await _girisimler.GetAsync(created.Id);
        return Ok(full!.ToDetailDto());
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = AuthorizationPolicies.YoneticiErisimi)]
    public async Task<IActionResult> Update(Guid id, UpdateGirisimRequest request)
    {
        var girisim = await _girisimler.GetAsync(id);
        if (girisim is null) return NotFound();

        girisim.Ad = request.Ad;
        girisim.Sektor = request.Sektor;
        girisim.KisaTanim = request.KisaTanim;
        girisim.Teknoloji = request.Teknoloji;
        girisim.WebsiteUrl = request.WebsiteUrl;
        girisim.KurulusYili = request.KurulusYili;
        girisim.EkipBuyuklugu = request.EkipBuyuklugu;
        await _girisimler.UpdateAsync(girisim);

        return Ok(girisim.ToDetailDto());
    }

    [HttpPost("{id:guid}/gelisim-adimlari")]
    [Authorize(Policy = AuthorizationPolicies.GirisimVeriGirisiErisimi)]
    [GirisimErisim]
    public async Task<IActionResult> AddGelisimAdimi(Guid id, AddGelisimAdimiRequest request)
    {
        await _girisimler.AddGelisimAdimiAsync(new GelisimAdimi
        {
            GirisimId = id,
            Tarih = request.Tarih,
            Baslik = request.Baslik,
            Aciklama = request.Aciklama,
            CreatedById = _currentUser.UserId!.Value,
        });
        var full = await _girisimler.GetAsync(id);
        return Ok(full!.ToDetailDto());
    }

    [HttpPost("{id:guid}/satis")]
    [Authorize(Policy = AuthorizationPolicies.GirisimVeriGirisiErisimi)]
    [GirisimErisim]
    public async Task<IActionResult> AddSatis(Guid id, AddSatisKaydiRequest request)
    {
        await _girisimler.AddSatisKaydiAsync(new SatisKaydi
        {
            GirisimId = id,
            Donem = request.Donem,
            Ciro = request.Ciro,
            Ihracat = request.Ihracat,
            SubmittedById = _currentUser.UserId!.Value,
        });
        var full = await _girisimler.GetAsync(id);
        return Ok(full!.ToDetailDto());
    }

    [HttpDelete("{id:guid}/satis/{satisId:guid}")]
    [Authorize(Policy = AuthorizationPolicies.GirisimVeriGirisiErisimi)]
    [GirisimErisim]
    public async Task<IActionResult> DeleteSatis(Guid id, Guid satisId)
    {
        var (success, error) = await _girisimler.DeleteSatisKaydiAsync(id, satisId);
        if (!success) return BadRequest(new ErrorResponse(error ?? "Kayıt silinemedi."));
        var full = await _girisimler.GetAsync(id);
        return Ok(full!.ToDetailDto());
    }

    [HttpPost("{id:guid}/yatirim")]
    [Authorize(Policy = AuthorizationPolicies.GirisimVeriGirisiErisimi)]
    [GirisimErisim]
    public async Task<IActionResult> AddYatirim(Guid id, AddYatirimKaydiRequest request)
    {
        await _girisimler.AddYatirimKaydiAsync(new YatirimKaydi
        {
            GirisimId = id,
            Tur = Enum.Parse<YatirimTuru>(request.Tur, ignoreCase: true),
            Tutar = request.Tutar,
            ParaBirimi = request.ParaBirimi,
            Tarih = request.Tarih,
            YatirimciAdi = request.YatirimciAdi,
            SubmittedById = _currentUser.UserId!.Value,
        });
        var full = await _girisimler.GetAsync(id);
        return Ok(full!.ToDetailDto());
    }

    [HttpDelete("{id:guid}/yatirim/{yatirimId:guid}")]
    [Authorize(Policy = AuthorizationPolicies.GirisimVeriGirisiErisimi)]
    [GirisimErisim]
    public async Task<IActionResult> DeleteYatirim(Guid id, Guid yatirimId)
    {
        var (success, error) = await _girisimler.DeleteYatirimKaydiAsync(id, yatirimId);
        if (!success) return BadRequest(new ErrorResponse(error ?? "Kayıt silinemedi."));
        var full = await _girisimler.GetAsync(id);
        return Ok(full!.ToDetailDto());
    }

    [HttpPost("{id:guid}/basari")]
    [Authorize(Policy = AuthorizationPolicies.GirisimVeriGirisiErisimi)]
    [GirisimErisim]
    public async Task<IActionResult> AddBasari(Guid id, AddBasariRequest request)
    {
        await _girisimler.AddBasariAsync(new Basari
        {
            GirisimId = id,
            Tur = Enum.Parse<BasariTuru>(request.Tur, ignoreCase: true),
            Baslik = request.Baslik,
            Aciklama = request.Aciklama,
            Tarih = request.Tarih,
            SubmittedById = _currentUser.UserId!.Value,
        });
        var full = await _girisimler.GetAsync(id);
        return Ok(full!.ToDetailDto());
    }

    [HttpDelete("{id:guid}/basari/{basariId:guid}")]
    [Authorize(Policy = AuthorizationPolicies.GirisimVeriGirisiErisimi)]
    [GirisimErisim]
    public async Task<IActionResult> DeleteBasari(Guid id, Guid basariId)
    {
        var (success, error) = await _girisimler.DeleteBasariAsync(id, basariId);
        if (!success) return BadRequest(new ErrorResponse(error ?? "Kayıt silinemedi."));
        var full = await _girisimler.GetAsync(id);
        return Ok(full!.ToDetailDto());
    }

    [HttpPost("{id:guid}/logo")]
    [Authorize(Policy = AuthorizationPolicies.GirisimVeriGirisiErisimi)]
    [GirisimErisim]
    [RequestSizeLimit(5_000_000)]
    public async Task<IActionResult> UploadLogo(Guid id, [FromForm] IFormFile file)
    {
        if (file.Length == 0) return BadRequest(new ErrorResponse("Dosya boş olamaz."));

        await using var stream = file.OpenReadStream();
        var (url, _) = await _files.SaveAsync(stream, file.FileName);

        var ok = await _girisimler.UpdateLogoAsync(id, url);
        if (!ok) return NotFound();

        var full = await _girisimler.GetAsync(id);
        return Ok(full!.ToDetailDto());
    }

    [HttpPost("{id:guid}/dokuman")]
    [Authorize(Policy = AuthorizationPolicies.GirisimVeriGirisiErisimi)]
    [GirisimErisim]
    [RequestSizeLimit(20_000_000)]
    public async Task<IActionResult> AddDokuman(Guid id, [FromForm] string baslik, [FromForm] IFormFile file)
    {
        if (file.Length == 0) return BadRequest(new ErrorResponse("Dosya boş olamaz."));

        await using var stream = file.OpenReadStream();
        var (url, size) = await _files.SaveAsync(stream, file.FileName);

        await _girisimler.AddDokumanAsync(new Dokuman
        {
            GirisimId = id,
            Baslik = baslik,
            DosyaAdi = file.FileName,
            DosyaUrl = url,
            DosyaBoyutu = size,
            SubmittedById = _currentUser.UserId!.Value,
        });
        var full = await _girisimler.GetAsync(id);
        return Ok(full!.ToDetailDto());
    }

    [HttpDelete("{id:guid}/dokuman/{dokumanId:guid}")]
    [Authorize(Policy = AuthorizationPolicies.GirisimVeriGirisiErisimi)]
    [GirisimErisim]
    public async Task<IActionResult> DeleteDokuman(Guid id, Guid dokumanId)
    {
        var (success, error) = await _girisimler.DeleteDokumanAsync(id, dokumanId);
        if (!success) return BadRequest(new ErrorResponse(error ?? "Kayıt silinemedi."));
        var full = await _girisimler.GetAsync(id);
        return Ok(full!.ToDetailDto());
    }

    [HttpPost("{id:guid}/guncelleme-talebi")]
    [Authorize(Policy = AuthorizationPolicies.StartupErisimi)]
    [GirisimErisim]
    public async Task<IActionResult> SubmitGuncellemeTalebi(Guid id, SubmitGuncellemeTalebiRequest request)
    {
        await _girisimler.SubmitGuncellemeTalebiAsync(new GirisimGuncellemeTalebi
        {
            GirisimId = id,
            Ad = request.Ad,
            Sektor = request.Sektor,
            KisaTanim = request.KisaTanim,
            Teknoloji = request.Teknoloji,
            WebsiteUrl = request.WebsiteUrl,
            KurulusYili = request.KurulusYili,
            EkipBuyuklugu = request.EkipBuyuklugu,
            SubmittedById = _currentUser.UserId!.Value,
        });
        return Ok(new MessageResponse("Güncelleme talebiniz admin onayına gönderildi."));
    }

    [HttpGet("{id:guid}/guncelleme-talepleri")]
    [GirisimErisim]
    public async Task<IActionResult> ListGuncellemeTalepleri(Guid id)
    {
        var list = await _girisimler.ListGuncellemeTalepleriAsync(id);
        return Ok(list.Select(t => new GuncellemeTalebiDto(
            t.Id, t.Ad, t.Sektor, t.KisaTanim, t.Teknoloji, t.WebsiteUrl, t.KurulusYili, t.EkipBuyuklugu,
            t.OnayDurumu.ToString(), t.ReviewNotu, t.CreatedAt)).ToList());
    }

    /// <summary>Reddedilmiş bir satış/yatırım/başarı/doküman kaydına itiraz gönderir — sadece kendi girişimi için.</summary>
    [HttpPost("{id:guid}/itiraz")]
    [Authorize(Policy = AuthorizationPolicies.StartupErisimi)]
    [GirisimErisim]
    public async Task<IActionResult> SubmitItiraz(Guid id, SubmitItirazRequest request)
    {
        if (!Enum.TryParse<ItirazKonusuTuru>(request.KonuTuru, ignoreCase: true, out var konuTuru))
            return BadRequest(new ErrorResponse("Geçersiz itiraz konusu türü."));

        var (success, error) = await _itirazlar.SubmitAsync(id, konuTuru, request.KonuId, request.Aciklama, _currentUser.UserId!.Value);
        if (!success) return BadRequest(new ErrorResponse(error ?? "İtiraz gönderilemedi."));
        return Ok(new MessageResponse("İtirazınız admin onayına gönderildi."));
    }

    [HttpGet("{id:guid}/itirazlar")]
    [GirisimErisim]
    public async Task<IActionResult> ListItirazlar(Guid id)
    {
        var list = await _itirazlar.ListForGirisimAsync(id);
        return Ok(list.Select(i => new ItirazDto(
            i.Id, i.KonuTuru.ToString(), i.KonuId, i.Aciklama, i.OnayDurumu.ToString(), i.ReviewNotu, i.CreatedAt)).ToList());
    }

    [HttpGet("{id:guid}/onboarding-durumu")]
    [GirisimErisim]
    public async Task<IActionResult> OnboardingDurumu(Guid id)
    {
        var durum = await _onboarding.GetDurumAsync(id);
        if (durum is null) return NotFound();
        return Ok(new OnboardingDurumuDto(
            durum.LogoEklendi, durum.KisaTanimGirildi, durum.IlkSatisKaydiGirildi, durum.IlkGelisimAdimiEklendi,
            durum.EmailDogrulandi, durum.TamamlananAdimSayisi, durum.ToplamAdimSayisi));
    }
}
