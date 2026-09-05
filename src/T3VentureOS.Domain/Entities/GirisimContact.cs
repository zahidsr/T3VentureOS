namespace T3VentureOS.Domain.Entities;

/// <summary>Girişimin muhatap/iletişim kartı — girişim başına en fazla bir kayıt (1:1).</summary>
public class GirisimContact
{
    public Guid GirisimId { get; set; }
    public string AdSoyad { get; set; } = string.Empty;
    public string? Unvan { get; set; }
    public string? Telefon { get; set; }
    public string? Email { get; set; }
    public string? LinkedInUrl { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Girisim? Girisim { get; set; }
}
