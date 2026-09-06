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

    /// <summary>Şirket CV'si ve dışa açılan paylaşım sayfasının ilk ekranında kullanılan geniş kapak görseli.</summary>
    public string? KapakGorseliUrl { get; set; }
    public Guid CreatedById { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Girişim puanı (0-100). Türetilmiş bir değerdir ama veritabanında tutulur, çünkü listeleme
    /// sayfalama ile birlikte puana göre sıralanabilsin. Hesap tek yerdedir
    /// (GirisimSaglikService.PuanHesapla) ve veri değiştikçe AppDbContext tarafından tazelenir.
    /// </summary>
    public int Puan { get; set; }

    /// <summary>Girişimin bugünkü ürün olgunluk aşaması. Her değişim <see cref="AsamaGecisi"/> olarak kaydedilir.</summary>
    public GirisimAsamasi Asama { get; set; } = GirisimAsamasi.Fikir;

    public User? CreatedBy { get; set; }
    public ICollection<ProgramKatilimi> ProgramKatilimlari { get; set; } = new List<ProgramKatilimi>();
    public ICollection<GelisimAdimi> GelisimAdimlari { get; set; } = new List<GelisimAdimi>();
    public ICollection<SatisKaydi> SatisKayitlari { get; set; } = new List<SatisKaydi>();
    public ICollection<YatirimKaydi> YatirimKayitlari { get; set; } = new List<YatirimKaydi>();
    public ICollection<Basari> Basarilar { get; set; } = new List<Basari>();
    public ICollection<IstihdamKaydi> IstihdamKayitlari { get; set; } = new List<IstihdamKaydi>();
    public ICollection<AsamaGecisi> AsamaGecisleri { get; set; } = new List<AsamaGecisi>();
    public ICollection<Dokuman> Dokumanlar { get; set; } = new List<Dokuman>();
    public GirisimContact? Contact { get; set; }
}
