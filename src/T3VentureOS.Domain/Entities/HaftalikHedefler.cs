namespace T3VentureOS.Domain.Entities;

public class HaftalikHedefler
{
    public Guid GirisimId { get; set; }
    public DateOnly HaftaBaslangici { get; set; }
    public string Hedef1 { get; set; } = "";
    public string Hedef2 { get; set; } = "";
    public string Hedef3 { get; set; } = "";
    public bool Tamamlandi1 { get; set; }
    public bool Tamamlandi2 { get; set; }
    public bool Tamamlandi3 { get; set; }
    public DateTime UpdatedAt { get; set; }
    public Guid Version { get; set; } = Guid.NewGuid();
}
