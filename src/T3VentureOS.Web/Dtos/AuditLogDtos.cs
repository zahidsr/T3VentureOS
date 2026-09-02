using T3VentureOS.Domain.Entities;

namespace T3VentureOS.Web.Dtos;

public record IslemKaydiDto(
    Guid Id, DateTime CreatedAt, string ActorAdSoyad, string ActorEmail,
    Guid? HedefKullaniciId, string? HedefAdSoyad, string? HedefEmail, string Eylem, string? Detay);

public static class IslemKaydiDtoExtensions
{
    public static IslemKaydiDto ToDto(this IslemKaydi k) =>
        new(k.Id, k.CreatedAt, k.ActorAdSoyad, k.ActorEmail, k.HedefKullaniciId, k.HedefAdSoyad, k.HedefEmail, k.Eylem, k.Detay);
}
