namespace T3VentureOS.Domain.Entities;

public class Dokuman
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid GirisimId { get; set; }
    public string Baslik { get; set; } = string.Empty;
    public string DosyaAdi { get; set; } = string.Empty;
    public string DosyaUrl { get; set; } = string.Empty;
    public long DosyaBoyutu { get; set; }
    public DokumanTuru Tur { get; set; } = DokumanTuru.Genel;
    public OnayDurumu OnayDurumu { get; set; } = OnayDurumu.Beklemede;
    public Guid SubmittedById { get; set; }
    public Guid? ReviewedById { get; set; }
    public string? ReviewNotu { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Girisim? Girisim { get; set; }
    public User? SubmittedBy { get; set; }
    public User? ReviewedBy { get; set; }
}
