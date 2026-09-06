using T3VentureOS.Infrastructure.Services;
using T3VentureOS.Web.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace T3VentureOS.Web.Controllers;

/// <summary>
/// Paylaşılan sunumun herkese açık uç noktası. Sistemin tek kimliksiz veri dönen yeri olduğu için
/// kapsamı bilinçli olarak dar: yalnızca sunum bölümleri ve künye döner; finansal kayıtlar, onay
/// durumları ve sistem içi notlar buradan hiç geçmez.
/// </summary>
[ApiController]
[Route("api/paylasim")]
[AllowAnonymous]
public class PaylasimController : ControllerBase
{
    private readonly SunumPaylasimService _paylasim;

    public PaylasimController(SunumPaylasimService paylasim)
    {
        _paylasim = paylasim;
    }

    [HttpGet("sunum/{jeton}")]
    public async Task<IActionResult> Sunum(string jeton)
    {
        var sunum = await _paylasim.GoruntuleAsync(jeton);
        // Geçersiz, süresi dolmuş ve iptal edilmiş bağlantılar aynı cevabı alır: bağlantının
        // durumu dışarıdan ayırt edilemesin.
        if (sunum is null) return NotFound();

        return Ok(new PaylasilanSunumDto(
            sunum.GirisimAdi, sunum.Sektor, sunum.KisaTanim, sunum.LogoUrl, sunum.KurulusYili,
            sunum.IletisimAdSoyad, sunum.IletisimUnvan, sunum.IletisimEmail,
            sunum.Bolumler.Select(b => new PitchDeckBolumuDto(b.Anahtar, b.Baslik, b.Icerik, b.ElleDuzenlendi, b.AiIcerik is not null)).ToList(),
            sunum.SunumTarihi));
    }
}
