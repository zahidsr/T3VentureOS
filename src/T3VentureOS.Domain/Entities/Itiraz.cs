namespace T3VentureOS.Domain.Entities;

/// <summary>
/// A startup's appeal against a rejected SatisKaydi/YatirimKaydi/Basari/Dokuman. Carries its own
/// OnayDurumu (the appeal's review outcome) — approving it flips the target record back to Onaylandi.
/// </summary>
public class Itiraz
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid GirisimId { get; set; }
    public ItirazKonusuTuru KonuTuru { get; set; }

    /// <summary>Id of the SatisKaydi/YatirimKaydi/Basari/Dokuman being appealed (polymorphic — see KonuTuru).</summary>
    public Guid KonuId { get; set; }

    public string Aciklama { get; set; } = string.Empty;
    public OnayDurumu OnayDurumu { get; set; } = OnayDurumu.Beklemede;
    public Guid SubmittedById { get; set; }
    public Guid? ReviewedById { get; set; }
    public string? ReviewNotu { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Girisim? Girisim { get; set; }
    public User? SubmittedBy { get; set; }
    public User? ReviewedBy { get; set; }
}
