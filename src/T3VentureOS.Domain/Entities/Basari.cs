namespace T3VentureOS.Domain.Entities;

public class Basari
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid GirisimId { get; set; }
    public BasariTuru Tur { get; set; }
    public string Baslik { get; set; } = string.Empty;
    public string? Aciklama { get; set; }
    public DateTime Tarih { get; set; } = DateTime.UtcNow;
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
