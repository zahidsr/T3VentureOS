namespace T3VentureOS.Domain.Entities;

/// <summary>
/// Girişimin sistemdeki verisinden üretilmiş, Sequoia pitch deck şablonuna oturan sunum taslağı.
/// Girişim başına tek bir güncel taslak tutulur; yeniden üretim mevcut kaydın üzerine yazar.
///
/// <see cref="VeriParmakIzi"/>, taslağın üretildiği andaki kaynak verinin özetidir. Girişimci
/// sonradan yatırım/ciro girer ya da profilini değiştirirse parmak izi tutmaz ve arayüz "sunum
/// güncel değil" uyarısı gösterir — sunumun veriyle birlikte yaşaması bunun üzerine kurulu.
/// </summary>
public class SunumTaslagi
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid GirisimId { get; set; }

    /// <summary>Bölümlerin JSON dizisi (anahtar/başlık/içerik) — şablon değişse de şema göç gerektirmesin diye serileştirilmiş tutulur.</summary>
    public string IcerikJson { get; set; } = "[]";

    public string VeriParmakIzi { get; set; } = string.Empty;
    public Guid OlusturanId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Girisim? Girisim { get; set; }
    public User? Olusturan { get; set; }
}
