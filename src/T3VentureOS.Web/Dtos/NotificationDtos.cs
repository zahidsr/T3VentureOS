namespace T3VentureOS.Web.Dtos;

public record BildirimDto(Guid Id, string Tur, string Baslik, string Mesaj, Guid? IlgiliGirisimId, bool Okundu, DateTime CreatedAt);

public record UnreadCountDto(int Sayi);
