using T3VentureOS.Domain.Entities;

namespace T3VentureOS.Web.Dtos;

public record ProgramSummaryDto(Guid Id, string Name, string? Description, string? KapakGorseliUrl, string Durum, DateTime? BaslangicTarihi, DateTime? BitisTarihi, int KatilimciSayisi);

public record ProgramKatilimciDto(Guid KatilimId, Guid GirisimId, string GirisimAdi, string? Donem, string Durum, DateTime BaslangicTarihi);

public record ProgramDetailDto(Guid Id, string Name, string? Description, string? KapakGorseliUrl, string Durum, DateTime? BaslangicTarihi, DateTime? BitisTarihi, List<ProgramKatilimciDto> Katilimcilar);

public record CreateProgramRequest(string Name, string? Description, DateTime? BaslangicTarihi, DateTime? BitisTarihi);
public record UpdateProgramRequest(string Name, string? Description, string Durum, DateTime? BaslangicTarihi, DateTime? BitisTarihi);

public record AddKatilimRequest(Guid GirisimId, string? Donem, string Durum);
public record UpdateKatilimDurumuRequest(string Durum);

public static class ProgramDtoExtensions
{
    public static ProgramSummaryDto ToSummaryDto(this GirisimProgrami p) =>
        new(p.Id, p.Name, p.Description, p.KapakGorseliUrl, p.Durum.ToString(), p.BaslangicTarihi, p.BitisTarihi, p.Katilimlar.Count);

    public static ProgramDetailDto ToDetailDto(this GirisimProgrami p) => new(
        p.Id, p.Name, p.Description, p.KapakGorseliUrl, p.Durum.ToString(), p.BaslangicTarihi, p.BitisTarihi,
        p.Katilimlar.Select(k => new ProgramKatilimciDto(k.Id, k.GirisimId, k.Girisim?.Ad ?? string.Empty, k.Donem, k.Durum.ToString(), k.BaslangicTarihi)).ToList());
}

public record KohortSatiriDto(
    Guid GirisimId, string Ad, string? Sektor, string KatilimDurumu, DateTime KatilimBaslangici,
    decimal ProgramOncesiCiro, decimal ProgramSirasindaCiro,
    int ProgramBasindaCalisan, int GuncelCalisan,
    decimal ProgramSirasindaYatirim, int Puan, string Seviye, int? GuncellemeUzerindenGecenGun);

/// <summary>Programın kohortu: katılan girişimlerin program başlangıcından bugüne değişimi.</summary>
public record ProgramKohortuDto(
    Guid ProgramId, string ProgramAdi, DateTime? BaslangicTarihi, DateTime? BitisTarihi,
    int GirisimSayisi, decimal ToplamProgramSirasindaCiro, decimal ToplamProgramSirasindaYatirim,
    int ToplamIstihdamArtisi, int VeriGirmeyenGirisimSayisi, List<KohortSatiriDto> Satirlar);
