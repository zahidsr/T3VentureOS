namespace T3VentureOS.Web.Dtos;

public record SubmitItirazRequest(string KonuTuru, Guid KonuId, string Aciklama);

public record ItirazDto(
    Guid Id, string KonuTuru, Guid KonuId, string Aciklama, string OnayDurumu, string? ReviewNotu, DateTime CreatedAt);
