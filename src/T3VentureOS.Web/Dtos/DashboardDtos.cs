namespace T3VentureOS.Web.Dtos;

public record SektorSayisiDto(string Sektor, int Sayi);
public record YatirimTuruDagilimiDto(string Tur, decimal ToplamTutar);
public record AylikTrendDto(string Ay, decimal Ciro, decimal Yatirim);

/// <summary>Public-safe subset of DashboardStatsDto — no pending-approval or revenue figures, just growth signals.</summary>
public record PublicStatsDto(int ToplamGirisim, int AktifProgramSayisi, decimal ToplamOnayliYatirim);

public record AiAnalizDto(string Analiz);

public record AiAnalizKaydiDto(Guid Id, DateTime CreatedAt, string CreatedByAdSoyad, string Metin);

public record ProgramSecenegiDto(Guid Id, string Ad);
public record GirisimSecenegiDto(Guid Id, string Ad);
public record DashboardFiltreSecenekleriDto(List<string> Sektorler, List<ProgramSecenegiDto> Programlar, List<GirisimSecenegiDto> Girisimler);

public record DashboardStatsDto(
    int ToplamGirisim,
    int AktifProgramSayisi,
    int BekleyenOnaySayisi,
    decimal ToplamOnayliYatirim,
    decimal ToplamOnayliCiro,
    List<SektorSayisiDto> SektorDagilimi,
    List<YatirimTuruDagilimiDto> YatirimTuruDagilimi,
    List<AylikTrendDto> AylikTrend);
