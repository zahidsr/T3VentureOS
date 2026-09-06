namespace T3VentureOS.Domain.Entities;

/// <summary>
/// Girişimcinin "Şirket CV'si"ni sisteme kayıtlı olmayan birine (ör. bir yatırımcıya) açtığı bağlantı.
///
/// <see cref="SunumPaylasimi"/> ile aynı üç korumayı paylaşır: tahmin edilemeyecek uzunlukta rastgele
/// bir jeton, zorunlu bir son kullanma tarihi ve girişimcinin istediği an kullanabileceği iptal.
/// Bağlantı yalnızca girişimin kamuya açık profilini gösterir; ciro/yatırım gibi finansal kayıtlar,
/// onay durumları ve sistem içi notlar bu uçtan hiç dönmez.
/// </summary>
public class GirisimCvPaylasimi
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid GirisimId { get; set; }

    /// <summary>Bağlantıdaki rastgele jeton. Tahmin edilemezliği tek koruma katmanı değildir ama ilkidir.</summary>
    public string Jeton { get; set; } = string.Empty;

    /// <summary>Kime/niçin paylaşıldığını girişimcinin hatırlaması için serbest not (ör. "Ahmet Bey — X Fonu").</summary>
    public string? Etiket { get; set; }

    public DateTime GecerlilikBitisi { get; set; }
    public bool IptalEdildi { get; set; }
    public int GoruntulenmeSayisi { get; set; }
    public DateTime? SonGoruntulenme { get; set; }

    public Guid OlusturanId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Girisim? Girisim { get; set; }
    public User? Olusturan { get; set; }

    /// <summary>Bağlantının şu anda açılabilir olup olmadığı: iptal edilmemiş ve süresi dolmamış.</summary>
    public bool Gecerli(DateTime simdi) => !IptalEdildi && GecerlilikBitisi > simdi;
}
