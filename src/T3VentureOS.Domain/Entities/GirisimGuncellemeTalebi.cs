namespace T3VentureOS.Domain.Entities;

/// <summary>
/// A startup user's proposed new values for their own core profile fields — a full snapshot of the
/// editable fields, applied onto the Girisim record once a Program Yöneticisi/SuperAdmin approves it.
/// </summary>
public class GirisimGuncellemeTalebi
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid GirisimId { get; set; }
    public string Ad { get; set; } = string.Empty;
    public string? Sektor { get; set; }
    public string? KisaTanim { get; set; }
    public string? Teknoloji { get; set; }
    public string? WebsiteUrl { get; set; }
    public int? KurulusYili { get; set; }
    public int? EkipBuyuklugu { get; set; }
    public OnayDurumu OnayDurumu { get; set; } = OnayDurumu.Beklemede;
    public Guid SubmittedById { get; set; }
    public Guid? ReviewedById { get; set; }
    public string? ReviewNotu { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Girisim? Girisim { get; set; }
    public User? SubmittedBy { get; set; }
    public User? ReviewedBy { get; set; }
}
