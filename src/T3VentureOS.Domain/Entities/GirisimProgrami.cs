namespace T3VentureOS.Domain.Entities;

/// <summary>Named GirisimProgrami (not "Program") to avoid colliding with the top-level-statements Program class in T3VentureOS.Web.</summary>
public class GirisimProgrami
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public ProgramDurumu Durum { get; set; } = ProgramDurumu.Taslak;
    public DateTime? BaslangicTarihi { get; set; }
    public DateTime? BitisTarihi { get; set; }
    public Guid CreatedById { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public User? CreatedBy { get; set; }
    public ICollection<ProgramKatilimi> Katilimlar { get; set; } = new List<ProgramKatilimi>();
}
