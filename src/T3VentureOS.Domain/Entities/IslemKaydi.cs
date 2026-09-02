namespace T3VentureOS.Domain.Entities;

/// <summary>
/// Admin işlem geçmişi (audit log) satırı. Aktör ve hedef bilgileri işlem anında anlık görüntü (snapshot)
/// olarak saklanır — böylece bir kullanıcı sonradan anonimleştirilse (KVKK silme talebi) veya güncellense
/// bile geçmiş kayıt hangi isim/e-posta ile yapıldığını doğru yansıtmaya devam eder.
/// </summary>
public class IslemKaydi
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Guid ActorId { get; set; }
    public string ActorAdSoyad { get; set; } = string.Empty;
    public string ActorEmail { get; set; } = string.Empty;

    public Guid? HedefKullaniciId { get; set; }
    public string? HedefAdSoyad { get; set; }
    public string? HedefEmail { get; set; }

    public string Eylem { get; set; } = string.Empty;
    public string? Detay { get; set; }
}
