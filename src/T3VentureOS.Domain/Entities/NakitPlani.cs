namespace T3VentureOS.Domain.Entities;

public class NakitPlani
{
    public Guid GirisimId { get; set; }
    public decimal KasadakiPara { get; set; }
    public decimal AylikGelir { get; set; }
    public decimal AylikGider { get; set; }
    public DateTime UpdatedAt { get; set; }
    public Guid Version { get; set; } = Guid.NewGuid();
}
