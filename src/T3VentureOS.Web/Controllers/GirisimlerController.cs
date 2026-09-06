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
    private readonly DashboardService _dashboard;
    private readonly IAiService _ai;
    private readonly PitchDeckService _pitchDeck;
    private readonly GirisimSaglikService _saglik;
    private readonly GirisimAnalizService _analiz;
    private readonly YatirimciHazirligiService _hazirlik;
    private readonly SunumPaylasimService _paylasim;
    private readonly AsamaService _asama;
    private readonly DonemGirisiService _donemGirisi;

    public GirisimlerController(
        GirisimService girisimler, ICurrentUserService currentUser, FileStorageService files,
        ItirazService itirazlar, OnboardingService onboarding, DashboardService dashboard, IAiService ai,
        PitchDeckService pitchDeck, GirisimSaglikService saglik, GirisimAnalizService analiz, YatirimciHazirligiService hazirlik, SunumPaylasimService paylasim, AsamaService asama, DonemGirisiService donemGirisi)
    {
        _girisimler = girisimler;
        _currentUser = currentUser;
        _files = files;
        _itirazlar = itirazlar;
        _onboarding = onboarding;
        _dashboard = dashboard;
        _ai = ai;
        _pitchDeck = pitchDeck;
        _saglik = saglik;
        _analiz = analiz;
        _hazirlik = hazirlik;
        _paylasim = paylasim;
        _asama = asama;
        _donemGirisi = donemGirisi;
    }

    [HttpGet]
    [Authorize(Policy = AuthorizationPolicies.YoneticiErisimi)]
    public async Task<IActionResult> Index(
        [FromQuery] string? sektor, [FromQuery] Guid? programId, [FromQuery] string? ara, [FromQuery] string? sirala,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 12)
    {
        var result = await _girisimler.ListAsync(sektor, programId, ara, sirala, page, pageSize);

        // Puan/seviye ayrı hesaplanıyor; yalnızca bu sayfadaki girişimler için çekilir.
        var saglikMap = (await _saglik.GetTumSaglikAsync(result.Items.Select(g => g.Id).ToList()))
            .ToDictionary(s => s.GirisimId);

        return Ok(result.ToPagedDto(g => g.ToSummaryDto(saglikMap.GetValueOrDefault(g.Id))));
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

    /// <summary>Girişimcinin kendi verileri üzerinden ciro/yatırım trendi ve onay durumu özeti.</summary>
    [HttpGet("benim/rapor")]
    [Authorize(Policy = AuthorizationPolicies.StartupErisimi)]
    public async Task<IActionResult> BenimRapor([FromQuery] DateTime? baslangic, [FromQuery] DateTime? bitis)
    {
        if (_currentUser.GirisimId is null) return NotFound();

        var filter = new DashboardFilter(baslangic, bitis, null, null, _currentUser.GirisimId);
        var stats = await _dashboard.GetStatsAsync(filter);
        return Ok(new DashboardStatsDto(
            stats.ToplamGirisim,
            stats.AktifProgramSayisi,
            stats.BekleyenOnaySayisi,
            stats.ToplamOnayliYatirim,
            stats.ToplamOnayliCiro,
            stats.SektorDagilimi.Select(s => new SektorSayisiDto(s.Sektor, s.Sayi)).ToList(),
            stats.YatirimTuruDagilimi.Select(y => new YatirimTuruDagilimiDto(y.Tur, y.ToplamTutar)).ToList(),
            stats.AylikTrend.Select(a => new AylikTrendDto(a.Ay, a.Ciro, a.Yatirim)).ToList()));
    }

    /// <summary>Sektör/kuruluş yılı/ekip/ciro/yatırım kriterlerine göre filtrelenebilir rakip karşılaştırma seti.</summary>
    [HttpGet("karsilastirma")]
    [Authorize(Policy = AuthorizationPolicies.YoneticiErisimi)]
    public async Task<IActionResult> Karsilastirma(
        [FromQuery] string? sektor, [FromQuery] int? kurulusYiliMin, [FromQuery] int? kurulusYiliMax,
        [FromQuery] int? ekipMin, [FromQuery] int? ekipMax,
        [FromQuery] decimal? ciroMin, [FromQuery] decimal? ciroMax,
        [FromQuery] decimal? yatirimMin, [FromQuery] decimal? yatirimMax)
    {
        var filtre = new GirisimKarsilastirmaFiltre(
            sektor, kurulusYiliMin, kurulusYiliMax, ekipMin, ekipMax, ciroMin, ciroMax, yatirimMin, yatirimMax);
        var sonuclar = await _girisimler.GetKarsilastirmaAsync(filtre);
        return Ok(sonuclar.Select(s => new GirisimKarsilastirmaDto(
            s.Girisim.Id, s.Girisim.Ad, s.Girisim.Sektor, s.Girisim.KurulusYili, s.Girisim.EkipBuyuklugu, s.Girisim.LogoUrl,
            s.ToplamOnayliCiro, s.ToplamOnayliYatirim,
            s.AylikTrend.Select(t => new AylikTrendDto(t.Ay, t.Ciro, t.Yatirim)).ToList())).ToList());
    }

    /// <summary>Seçilen girişim setine göre AI destekli detaylı rakip analizi (SWOT + pazar payı + büyüme yorumu).</summary>
    [HttpPost("karsilastirma/ai-analiz")]
    [Authorize(Policy = AuthorizationPolicies.YoneticiErisimi)]
    public async Task<IActionResult> KarsilastirmaAiAnaliz([FromBody] RakipAnaliziRequest request)
    {
        if (request.GirisimIds is null || request.GirisimIds.Count < 2)
            return BadRequest(new ErrorResponse("Detaylı analiz için en az 2 girişim seçilmelidir."));

        var secilenler = await _girisimler.GetKarsilastirmaByIdsAsync(request.GirisimIds);
        if (secilenler.Count < 2)
            return BadRequest(new ErrorResponse("Seçilen girişimler bulunamadı."));

        var prompt = GirisimService.BuildRakipAnaliziPrompt(secilenler);
        var (success, text, error) = await _ai.GenerateInsightAsync(prompt);
        if (!success) return BadRequest(new ErrorResponse(error ?? "AI analizi oluşturulamadı."));
        return Ok(new AiAnalizDto(text!));
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

    [HttpPost("{id:guid}/istihdam")]
    [Authorize(Policy = AuthorizationPolicies.GirisimVeriGirisiErisimi)]
    [GirisimErisim]
    public async Task<IActionResult> AddIstihdam(Guid id, AddIstihdamKaydiRequest request)
    {
        if (request.CalisanSayisi < 0) return BadRequest(new ErrorResponse("Çalışan sayısı negatif olamaz."));

        await _girisimler.AddIstihdamKaydiAsync(new IstihdamKaydi
        {
            GirisimId = id,
            Donem = request.Donem,
            CalisanSayisi = request.CalisanSayisi,
            YeniIseAlim = request.YeniIseAlim,
            SubmittedById = _currentUser.UserId!.Value,
        });
        var full = await _girisimler.GetAsync(id);
        return Ok(full!.ToDetailDto());
    }

    [HttpDelete("{id:guid}/istihdam/{istihdamId:guid}")]
    [Authorize(Policy = AuthorizationPolicies.GirisimVeriGirisiErisimi)]
    [GirisimErisim]
    public async Task<IActionResult> DeleteIstihdam(Guid id, Guid istihdamId)
    {
        var (ok, error) = await _girisimler.DeleteIstihdamKaydiAsync(id, istihdamId);
        if (!ok) return BadRequest(new ErrorResponse(error!));
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
    public async Task<IActionResult> AddDokuman(Guid id, [FromForm] string baslik, [FromForm] IFormFile file, [FromForm] string? tur = null)
    {
        if (file.Length == 0) return BadRequest(new ErrorResponse("Dosya boş olamaz."));
        if (!Enum.TryParse<DokumanTuru>(tur, ignoreCase: true, out var dokumanTuru)) dokumanTuru = DokumanTuru.Genel;

        await using var stream = file.OpenReadStream();
        var (url, size) = await _files.SaveAsync(stream, file.FileName);

        await _girisimler.AddDokumanAsync(new Dokuman
        {
            GirisimId = id,
            Baslik = baslik,
            DosyaAdi = file.FileName,
            DosyaUrl = url,
            DosyaBoyutu = size,
            Tur = dokumanTuru,
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

    [HttpPut("{id:guid}/iletisim")]
    [Authorize(Policy = AuthorizationPolicies.StartupErisimi)]
    [GirisimErisim]
    public async Task<IActionResult> UpsertIletisim(Guid id, UpsertGirisimContactRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.AdSoyad)) return BadRequest(new ErrorResponse("Ad soyad zorunludur."));
        await _girisimler.UpsertContactAsync(id, request.AdSoyad, request.Unvan, request.Telefon, request.Email, request.LinkedInUrl);
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

    /// <summary>Kendi bekleyen profil güncelleme talebini geri çeker (onaylanmış/reddedilmiş talepler geri çekilemez).</summary>
    [HttpDelete("{id:guid}/guncelleme-talebi/{talebiId:guid}")]
    [Authorize(Policy = AuthorizationPolicies.StartupErisimi)]
    [GirisimErisim]
    public async Task<IActionResult> DeleteGuncellemeTalebi(Guid id, Guid talebiId)
    {
        var (success, error) = await _girisimler.DeleteGuncellemeTalebiAsync(id, talebiId);
        if (!success) return BadRequest(new ErrorResponse(error ?? "Talep geri çekilemedi."));
        return Ok(new MessageResponse("Güncelleme talebi geri çekildi."));
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

    /// <summary>
    /// Girişim bazlı AI analizi. <c>tur</c>: "durum" (tarafsız okuma, yönetici ve girişimci) ya da
    /// "gelisim" (girişimciye yönelik geliştirme önerileri). Son üretilen analiz döner, yoksa 404.
    /// </summary>
    [HttpGet("{id:guid}/ai-analiz/{tur}")]
    [Authorize(Policy = AuthorizationPolicies.GirisimVeriGirisiErisimi)]
    [GirisimErisim]
    public async Task<IActionResult> GirisimAnaliz(Guid id, string tur)
    {
        if (!TryParseAnalizTuru(tur, out var analizTuru)) return BadRequest(new ErrorResponse("Geçersiz analiz türü."));

        var sonuc = await _analiz.GetSonAnalizAsync(id, analizTuru);
        if (sonuc is null) return NotFound();
        return Ok(new GirisimAnalizDto(sonuc.Metin, sonuc.CreatedAt, sonuc.CreatedByAdSoyad, sonuc.Tur.ToString()));
    }

    [HttpPost("{id:guid}/ai-analiz/{tur}")]
    [Authorize(Policy = AuthorizationPolicies.GirisimVeriGirisiErisimi)]
    [GirisimErisim]
    public async Task<IActionResult> GirisimAnalizUret(Guid id, string tur)
    {
        if (!TryParseAnalizTuru(tur, out var analizTuru)) return BadRequest(new ErrorResponse("Geçersiz analiz türü."));

        var (ok, sonuc, hata) = await _analiz.UretAsync(id, _currentUser.UserId!.Value, analizTuru);
        if (!ok) return BadRequest(new ErrorResponse(hata ?? "Analiz üretilemedi."));
        return Ok(new GirisimAnalizDto(sonuc!.Metin, sonuc.CreatedAt, sonuc.CreatedByAdSoyad, sonuc.Tur.ToString()));
    }

    /// <summary>Adres çubuğundaki kısa ad ("durum"/"gelisim") ile enum arasındaki eşleme.</summary>
    private static bool TryParseAnalizTuru(string tur, out AiAnalizTuru analizTuru)
    {
        analizTuru = tur.ToLowerInvariant() switch
        {
            "durum" => AiAnalizTuru.GirisimDurumu,
            "gelisim" => AiAnalizTuru.GirisimGelisim,
            "program-etkisi" => AiAnalizTuru.GirisimProgramEtkisi,
            _ => AiAnalizTuru.Ekosistem,
        };
        return analizTuru != AiAnalizTuru.Ekosistem;
    }

    /// <summary>
    /// "Yatırımcıya hazır mıyım?" değerlendirmesi. Girişim puanından farklıdır: puan verinin var
    /// olup olmadığını, bu ölçüt verinin bir yatırımcı görüşmesine dayanıp dayanmadığını ölçer.
    /// </summary>
    [HttpGet("{id:guid}/yatirimci-hazirligi")]
    [Authorize(Policy = AuthorizationPolicies.GirisimVeriGirisiErisimi)]
    [GirisimErisim]
    public async Task<IActionResult> YatirimciHazirligi(Guid id)
    {
        var h = await _hazirlik.GetAsync(id);
        if (h is null) return NotFound();

        return Ok(new YatirimciHazirligiDto(h.Yuzde, h.Durum,
            h.Kriterler.Select(k => new HazirlikKriteriDto(k.Anahtar, k.Baslik, k.NedenOnemli, k.Karsilandi, k.Ipucu)).ToList()));
    }

    /// <summary>Son kapanmış çeyreklerden hangilerinde veri eksik.</summary>
    [HttpGet("{id:guid}/eksik-donemler")]
    [Authorize(Policy = AuthorizationPolicies.GirisimVeriGirisiErisimi)]
    [GirisimErisim]
    public async Task<IActionResult> EksikDonemler(Guid id)
    {
        var eksikler = await _donemGirisi.EksikDonemlerAsync(id);
        return Ok(eksikler.Select(e => new EksikDonemDto(e.Donem, e.CiroEksik, e.IstihdamEksik)).ToList());
    }

    /// <summary>
    /// Bir çeyreğin tüm sayısal verisini tek çağrıda kaydeder. Ciro, istihdam ve yatırım ayrı ayrı
    /// formlardan giriliyordu; girişimcinin bunu her çeyrek yapması gerçekçi değildi.
    /// </summary>
    [HttpPost("{id:guid}/donem-girisi")]
    [Authorize(Policy = AuthorizationPolicies.GirisimVeriGirisiErisimi)]
    [GirisimErisim]
    public async Task<IActionResult> DonemGirisi(Guid id, DonemGirisiRequest request)
    {
        var (ok, sonuc, hata) = await _donemGirisi.KaydetAsync(
            id, _currentUser.UserId!.Value, request.Donem, request.Ciro, request.Ihracat,
            request.CalisanSayisi, request.YeniIseAlim,
            request.YatirimTuru, request.YatirimTutari, request.YatirimTarihi, request.YatirimciAdi);

        if (!ok) return BadRequest(new ErrorResponse(hata!));
        return Ok(new DonemGirisiSonucuDto(
            sonuc!.Donem, sonuc.OncekiPuan, sonuc.YeniPuan, sonuc.EklenenKayitSayisi, sonuc.Kazanimlar));
    }

    /// <summary>Girişimin aşama geçmişi — en yeni geçiş en üstte.</summary>
    [HttpGet("{id:guid}/asama-gecmisi")]
    [Authorize(Policy = AuthorizationPolicies.GirisimVeriGirisiErisimi)]
    [GirisimErisim]
    public async Task<IActionResult> AsamaGecmisi(Guid id)
    {
        var gecmis = await _asama.GecmisAsync(id);
        return Ok(gecmis.Select(g => new AsamaGecisiDto(
            g.Id, g.OncekiAsama?.ToString(), g.YeniAsama.ToString(), g.Tarih, g.Aciklama, g.DegistirenAdSoyad)).ToList());
    }

    /// <summary>
    /// Girişimin aşamasını değiştirir ve geçişi kayda geçirir. Geçmiş, "programa hangi aşamada
    /// girdi" sorusunun tek dayanağıdır; bu yüzden aşama sessizce güncellenmez.
    /// </summary>
    [HttpPut("{id:guid}/asama")]
    [Authorize(Policy = AuthorizationPolicies.GirisimVeriGirisiErisimi)]
    [GirisimErisim]
    public async Task<IActionResult> AsamaDegistir(Guid id, AsamaDegistirRequest request)
    {
        if (!Enum.TryParse<GirisimAsamasi>(request.Asama, ignoreCase: true, out var asama))
            return BadRequest(new ErrorResponse("Geçersiz aşama."));

        var (ok, hata) = await _asama.AsamaDegistirAsync(id, asama, request.Tarih, request.Aciklama, _currentUser.UserId!.Value);
        if (!ok) return BadRequest(new ErrorResponse(hata!));

        var full = await _girisimler.GetAsync(id);
        return Ok(full!.ToDetailDto());
    }

    /// <summary>Girişimin künyesi için durum kartı: profil tamlığı, son veri girişi, bekleyen kayıt sayısı.</summary>
    [HttpGet("{id:guid}/durum")]
    [Authorize(Policy = AuthorizationPolicies.GirisimVeriGirisiErisimi)]
    [GirisimErisim]
    public async Task<IActionResult> Durum(Guid id)
    {
        var s = await _saglik.GetAsync(id);
        if (s is null) return NotFound();

        return Ok(GirisimSaglikMapper.ToDto(s));
    }

    /// <summary>Girişimin sunumu için oluşturduğu paylaşım bağlantıları.</summary>
    [HttpGet("{id:guid}/sunum-paylasimlari")]
    [Authorize(Policy = AuthorizationPolicies.GirisimVeriGirisiErisimi)]
    [GirisimErisim]
    public async Task<IActionResult> SunumPaylasimlari(Guid id)
    {
        var liste = await _paylasim.ListeleAsync(id);
        var simdi = DateTime.UtcNow;
        return Ok(liste.Select(p => new SunumPaylasimiDto(
            p.Id, p.Jeton, p.Etiket, p.GecerlilikBitisi, p.IptalEdildi, p.Gecerli(simdi),
            p.GoruntulenmeSayisi, p.SonGoruntulenme, p.CreatedAt)).ToList());
    }

    /// <summary>Sunumu sistem dışına açan, süre sınırlı bir bağlantı üretir.</summary>
    [HttpPost("{id:guid}/sunum-paylasimlari")]
    [Authorize(Policy = AuthorizationPolicies.GirisimVeriGirisiErisimi)]
    [GirisimErisim]
    public async Task<IActionResult> SunumPaylasimiOlustur(Guid id, SunumPaylasimiOlusturRequest request)
    {
        var (ok, paylasim, hata) = await _paylasim.OlusturAsync(
            id, _currentUser.UserId!.Value, request.GecerlilikGun, request.Etiket);
        if (!ok) return BadRequest(new ErrorResponse(hata!));

        return Ok(new SunumPaylasimiDto(
            paylasim!.Id, paylasim.Jeton, paylasim.Etiket, paylasim.GecerlilikBitisi, paylasim.IptalEdildi,
            paylasim.Gecerli(DateTime.UtcNow), paylasim.GoruntulenmeSayisi, paylasim.SonGoruntulenme, paylasim.CreatedAt));
    }

    /// <summary>Bağlantıyı iptal eder; bundan sonra açılamaz.</summary>
    [HttpDelete("{id:guid}/sunum-paylasimlari/{paylasimId:guid}")]
    [Authorize(Policy = AuthorizationPolicies.GirisimVeriGirisiErisimi)]
    [GirisimErisim]
    public async Task<IActionResult> SunumPaylasimiIptal(Guid id, Guid paylasimId)
    {
        var ok = await _paylasim.IptalEtAsync(id, paylasimId);
        if (!ok) return NotFound();
        return Ok(new MessageResponse("Bağlantı iptal edildi."));
    }

    /// <summary>Girişimin güncel sunum taslağı — yoksa 404.</summary>
    [HttpGet("{id:guid}/sunum-taslagi")]
    [Authorize(Policy = AuthorizationPolicies.GirisimVeriGirisiErisimi)]
    [GirisimErisim]
    public async Task<IActionResult> SunumTaslagi(Guid id)
    {
        var sonuc = await _pitchDeck.GetAsync(id);
        if (sonuc is null) return NotFound();
        return Ok(ToDto(sonuc));
    }

    /// <summary>
    /// Girişimin verisinden Sequoia pitch deck şablonuna göre sunum taslağı üretir. Mevcut taslak
    /// varsa üzerine yazar — girişimci yatırım/ciro güncelledikçe sunumu tazeleyebilsin diye.
    /// </summary>
    [HttpPost("{id:guid}/sunum-taslagi")]
    [Authorize(Policy = AuthorizationPolicies.GirisimVeriGirisiErisimi)]
    [GirisimErisim]
    public async Task<IActionResult> SunumTaslagiUret(Guid id)
    {
        var (ok, sonuc, hata) = await _pitchDeck.UretAsync(id, _currentUser.UserId!.Value);
        if (!ok) return BadRequest(new ErrorResponse(hata ?? "Sunum üretilemedi."));
        return Ok(ToDto(sonuc!));
    }

    /// <summary>Sunum bölümünün metnini girişimcinin yazdığıyla değiştirir; boş gövde AI metnine döndürür.</summary>
    [HttpPut("{id:guid}/sunum-taslagi/{anahtar}")]
    [Authorize(Policy = AuthorizationPolicies.GirisimVeriGirisiErisimi)]
    [GirisimErisim]
    public async Task<IActionResult> SunumBolumGuncelle(Guid id, string anahtar, PitchDeckBolumGuncelleRequest request)
    {
        var (ok, sonuc, hata) = await _pitchDeck.BolumGuncelleAsync(id, anahtar, request.Icerik);
        if (!ok) return BadRequest(new ErrorResponse(hata ?? "Bölüm güncellenemedi."));
        return Ok(ToDto(sonuc!));
    }

    private static PitchDeckDto ToDto(PitchDeckSonucu s) => new(
        s.Bolumler.Select(b => new PitchDeckBolumuDto(b.Anahtar, b.Baslik, b.Icerik, b.ElleDuzenlendi, b.AiIcerik is not null)).ToList(),
        s.OlusturulmaTarihi, s.OlusturanAdSoyad, s.Guncel);

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
