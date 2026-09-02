namespace T3VentureOS.Domain.Entities;

/// <summary>A saved snapshot of a generated AI ecosystem analysis, so Karar Verici can revisit past runs
/// instead of losing the text the moment they regenerate.</summary>
public class AiAnalizKaydi
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public Guid CreatedById { get; set; }
    public string CreatedByAdSoyad { get; set; } = string.Empty;
    public string Metin { get; set; } = string.Empty;
}
