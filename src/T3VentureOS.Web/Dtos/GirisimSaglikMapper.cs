using T3VentureOS.Infrastructure.Services;

namespace T3VentureOS.Web.Dtos;

/// <summary>Sağlık kaydını DTO'ya çevirir. Panel ve girişim künyesi aynı dönüşümü kullansın diye tek yerde.</summary>
public static class GirisimSaglikMapper
{
    public static GirisimSaglikDto ToDto(GirisimSaglik s) => new(
        s.GirisimId, s.Ad, s.Sektor, s.LogoUrl, s.TamamlananAdim, s.ToplamAdim, s.SonVeriGirisi,
        // Hiç veri girilmemiş girişimlerde "gün" anlamsızdır; int.MaxValue yerine null döner.
        s.GuncellemeUzerindenGecenGun == int.MaxValue ? null : s.GuncellemeUzerindenGecenGun,
        s.BekleyenKayitSayisi, s.IletisimVar, s.SunumVar,
        s.Puan, s.Seviye.ToString(), s.Guncel,
        s.SonrakiAdimlar.Select(a => new SonrakiAdimDto(a.Aciklama, a.Puan)).ToList());
}
