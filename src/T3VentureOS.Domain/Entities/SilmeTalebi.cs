namespace T3VentureOS.Domain.Entities;

/// <summary>
/// A user's KVKK/GDPR-style request to have their account erased. Approving it anonymizes the User
/// record (rather than hard-deleting it) so historical Onay/Itiraz/Bildirim rows that reference the
/// user by id stay intact.
/// </summary>
public class SilmeTalebi
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public string? Sebep { get; set; }
    public OnayDurumu Durum { get; set; } = OnayDurumu.Beklemede;
    public Guid? ReviewedById { get; set; }
    public string? ReviewNotu { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public User? User { get; set; }
    public User? ReviewedBy { get; set; }
}
