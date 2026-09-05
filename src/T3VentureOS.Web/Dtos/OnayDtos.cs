namespace T3VentureOS.Web.Dtos;

public record OnayBekleyenSatisDto(Guid Id, Guid GirisimId, string GirisimAdi, string Donem, decimal Ciro, decimal? Ihracat, DateTime CreatedAt);
public record OnayBekleyenYatirimDto(Guid Id, Guid GirisimId, string GirisimAdi, string Tur, decimal Tutar, string ParaBirimi, DateTime Tarih, string? YatirimciAdi, DateTime CreatedAt);
public record OnayBekleyenBasariDto(Guid Id, Guid GirisimId, string GirisimAdi, string Tur, string Baslik, DateTime Tarih, DateTime CreatedAt);
public record OnayBekleyenDokumanDto(Guid Id, Guid GirisimId, string GirisimAdi, string Baslik, string DosyaAdi, string DosyaUrl, DateTime CreatedAt);
public record OnayBekleyenGuncellemeDto(Guid Id, Guid GirisimId, string GirisimAdi, string YeniAd, string? YeniSektor, DateTime CreatedAt);
public record OnayBekleyenItirazDto(Guid Id, Guid GirisimId, string GirisimAdi, string KonuTuru, Guid KonuId, string Aciklama, DateTime CreatedAt);

public record OnayKuyruguDto(
    List<OnayBekleyenSatisDto> Satislar,
    List<OnayBekleyenYatirimDto> Yatirimlar,
    List<OnayBekleyenBasariDto> Basarilar,
    List<OnayBekleyenDokumanDto> Dokumanlar,
    List<OnayBekleyenGuncellemeDto> Guncellemeler,
    List<OnayBekleyenItirazDto> Itirazlar,
    List<OnayOnerisiDto> Oneriler);

/// <summary>Bir kayda bırakılmış ProgramYoneticisi önerisi — kararı SuperAdmin verir.</summary>
public record OnayOnerisiDto(
    Guid Id, string KonuTuru, Guid KonuId, string Tavsiye, string? Not,
    string OneriVerenAdSoyad, DateTime CreatedAt, DateTime? UpdatedAt);

public record OnayKararRequest(bool Onayla, string? Not);

public record OnayOnerisiRequest(string KonuTuru, Guid KonuId, string Tavsiye, string? Not);
