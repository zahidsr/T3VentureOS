namespace T3VentureOS.Domain.Entities;

/// <summary>A single chronological milestone/timeline entry in a startup's journey.</summary>
public class GelisimAdimi
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid GirisimId { get; set; }
    public DateTime Tarih { get; set; } = DateTime.UtcNow;
    public string Baslik { get; set; } = string.Empty;
    public string? Aciklama { get; set; }
    public Guid CreatedById { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Girisim? Girisim { get; set; }
    public User? CreatedBy { get; set; }
}
