using T3VentureOS.Domain.Entities;

namespace T3VentureOS.Web.Dtos;

public record ProgramSummaryDto(Guid Id, string Name, string? Description, string Durum, DateTime? BaslangicTarihi, DateTime? BitisTarihi, int KatilimciSayisi);

public record ProgramKatilimciDto(Guid KatilimId, Guid GirisimId, string GirisimAdi, string? Donem, string Durum, DateTime BaslangicTarihi);

public record ProgramDetailDto(Guid Id, string Name, string? Description, string Durum, DateTime? BaslangicTarihi, DateTime? BitisTarihi, List<ProgramKatilimciDto> Katilimcilar);

public record CreateProgramRequest(string Name, string? Description, DateTime? BaslangicTarihi, DateTime? BitisTarihi);
public record UpdateProgramRequest(string Name, string? Description, string Durum, DateTime? BaslangicTarihi, DateTime? BitisTarihi);

public record AddKatilimRequest(Guid GirisimId, string? Donem, string Durum);
public record UpdateKatilimDurumuRequest(string Durum);

public static class ProgramDtoExtensions
{
    public static ProgramSummaryDto ToSummaryDto(this GirisimProgrami p) =>
        new(p.Id, p.Name, p.Description, p.Durum.ToString(), p.BaslangicTarihi, p.BitisTarihi, p.Katilimlar.Count);

    public static ProgramDetailDto ToDetailDto(this GirisimProgrami p) => new(
        p.Id, p.Name, p.Description, p.Durum.ToString(), p.BaslangicTarihi, p.BitisTarihi,
        p.Katilimlar.Select(k => new ProgramKatilimciDto(k.Id, k.GirisimId, k.Girisim?.Ad ?? string.Empty, k.Donem, k.Durum.ToString(), k.BaslangicTarihi)).ToList());
}
