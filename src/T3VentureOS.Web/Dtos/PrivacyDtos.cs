namespace T3VentureOS.Web.Dtos;

public record RequestDeletionRequest(string? Sebep);

public record SilmeTalebiDto(Guid Id, string Durum, string? ReviewNotu, DateTime CreatedAt);

public record SilmeTalebiYonetimDto(Guid Id, Guid UserId, string KullaniciEmail, string KullaniciAdi, string? Sebep, DateTime CreatedAt);
