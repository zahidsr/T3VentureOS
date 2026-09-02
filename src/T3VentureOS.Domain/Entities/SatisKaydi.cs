namespace T3VentureOS.Domain.Entities;

public class SatisKaydi
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid GirisimId { get; set; }
    public string Donem { get; set; } = string.Empty;
    public decimal Ciro { get; set; }
    public decimal? Ihracat { get; set; }
    public OnayDurumu OnayDurumu { get; set; } = OnayDurumu.Beklemede;
    public Guid SubmittedById { get; set; }
    public Guid? ReviewedById { get; set; }
    public string? ReviewNotu { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Girisim? Girisim { get; set; }
    public User? SubmittedBy { get; set; }
    public User? ReviewedBy { get; set; }
}
