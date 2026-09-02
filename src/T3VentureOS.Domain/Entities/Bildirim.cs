namespace T3VentureOS.Domain.Entities;

/// <summary>An in-app notification for one user — an onay/itiraz decision, a program update, etc.</summary>
public class Bildirim
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid KullaniciId { get; set; }
    public BildirimTuru Tur { get; set; }
    public string Baslik { get; set; } = string.Empty;
    public string Mesaj { get; set; } = string.Empty;

    /// <summary>Optional deep link target — the Girisim this notification is about, if any.</summary>
    public Guid? IlgiliGirisimId { get; set; }

    public bool Okundu { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public User? Kullanici { get; set; }
    public Girisim? IlgiliGirisim { get; set; }
}
