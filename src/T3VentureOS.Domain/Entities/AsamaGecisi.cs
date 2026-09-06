namespace T3VentureOS.Domain.Entities;

/// <summary>
/// Girişimin aşamasının değiştiği an. Aşamanın kendisi <see cref="Girisim.Asama"/> alanında
/// tutulur; asıl takip değeri buradaki geçmiştedir.
///
/// Yalnızca güncel aşamayı saklamak "programa hangi aşamada girdi" sorusunu cevapsız bırakırdı:
/// geçmiş olmadan bir girişimin programdan önce mi sonra mı ilerlediği bilinemez.
/// </summary>
public class AsamaGecisi
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid GirisimId { get; set; }

    /// <summary>İlk kayıtta null: girişimin başlangıç aşaması.</summary>
    public GirisimAsamasi? OncekiAsama { get; set; }

    public GirisimAsamasi YeniAsama { get; set; }

    /// <summary>Geçişin gerçekleştiği tarih — kaydın girildiği tarihten farklı olabilir.</summary>
    public DateTime Tarih { get; set; } = DateTime.UtcNow;

    /// <summary>Neyin değiştiğini anlatan serbest not; zaman çizelgesinde bu metin görünür.</summary>
    public string? Aciklama { get; set; }

    public Guid DegistirenId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Girisim? Girisim { get; set; }
    public User? Degistiren { get; set; }
}
