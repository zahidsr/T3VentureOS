namespace T3VentureOS.Domain.Entities;

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Email { get; set; } = string.Empty;
    public string? PasswordHash { get; set; }
    public string FullName { get; set; } = string.Empty;
    public UserRole Role { get; set; }
    public UserStatus Status { get; set; } = UserStatus.Invited;

    /// <summary>Only set when Role == StartupKullanicisi — the startup this user represents.</summary>
    public Guid? GirisimId { get; set; }

    public DateTime? LastLoginAt { get; set; }
    public bool EmailVerified { get; set; }
    public int FailedLoginAttempts { get; set; }
    public DateTime? LockedUntil { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Girisim? Girisim { get; set; }
    public ICollection<VerificationToken> VerificationTokens { get; set; } = new List<VerificationToken>();
}
