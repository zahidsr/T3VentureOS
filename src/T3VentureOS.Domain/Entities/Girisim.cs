namespace T3VentureOS.Domain.Entities;

/// <summary>The central, persistent startup profile — the "kart" every other record hangs off of.</summary>
public class Girisim
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Ad { get; set; } = string.Empty;
    public string? Sektor { get; set; }
    public string? KisaTanim { get; set; }
    public string? Teknoloji { get; set; }
    public string? WebsiteUrl { get; set; }
    public int? KurulusYili { get; set; }
    public int? EkipBuyuklugu { get; set; }
    public string? LogoUrl { get; set; }
    public Guid CreatedById { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public User? CreatedBy { get; set; }
    public ICollection<ProgramKatilimi> ProgramKatilimlari { get; set; } = new List<ProgramKatilimi>();
    public ICollection<GelisimAdimi> GelisimAdimlari { get; set; } = new List<GelisimAdimi>();
    public ICollection<SatisKaydi> SatisKayitlari { get; set; } = new List<SatisKaydi>();
    public ICollection<YatirimKaydi> YatirimKayitlari { get; set; } = new List<YatirimKaydi>();
    public ICollection<Basari> Basarilar { get; set; } = new List<Basari>();
    public ICollection<Dokuman> Dokumanlar { get; set; } = new List<Dokuman>();
    public GirisimContact? Contact { get; set; }
}
