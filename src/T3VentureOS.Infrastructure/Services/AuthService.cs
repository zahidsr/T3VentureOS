using T3VentureOS.Domain;
using T3VentureOS.Domain.Entities;
using T3VentureOS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace T3VentureOS.Infrastructure.Services;

/// <summary>
/// Program Yöneticisi/Karar Verici accounts are still admin-invited (UserService.InviteUserAsync),
/// but a startup can also self-register here: this creates both their User (StartupKullanicisi)
/// and a brand-new Girisim profile in one step, then logs them straight in.
/// </summary>
public class AuthService
{
    private readonly AppDbContext _db;
    private readonly PasswordHasherService _hasher;
    private readonly VerificationTokenService _tokens;
    private readonly IEmailSender _mail;

    public AuthService(AppDbContext db, PasswordHasherService hasher, VerificationTokenService tokens, IEmailSender mail)
    {
        _db = db;
        _hasher = hasher;
        _tokens = tokens;
        _mail = mail;
    }

    /// <summary>Self-service sign-up: creates the account (StartupKullanicisi) and a new Girisim profile together.</summary>
    public async Task<(bool Success, string? Error, User? User)> RegisterAsync(
        string email, string password, string fullName, string girisimAdi, string? sektor)
    {
        if (await _db.Users.AnyAsync(u => u.Email == email))
            return (false, "Bu e-posta ile zaten bir hesap var.", null);

        var user = new User
        {
            Email = email,
            FullName = fullName,
            Role = UserRole.StartupKullanicisi,
            Status = UserStatus.Active,
        };
        user.PasswordHash = _hasher.Hash(user, password);
        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        var girisim = new Girisim
        {
            Ad = girisimAdi,
            Sektor = sektor,
            CreatedById = user.Id,
        };
        _db.Girisimler.Add(girisim);
        await _db.SaveChangesAsync();

        user.GirisimId = girisim.Id;
        await _db.SaveChangesAsync();

        await RequestEmailVerificationAsync(user.Id);

        return (true, null, user);
    }

    public async Task<(bool Success, string? Error)> ChangePasswordAsync(Guid userId, string currentPassword, string newPassword)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null || user.PasswordHash is null) return (false, "Kullanıcı bulunamadı.");

        if (!_hasher.Verify(user, user.PasswordHash, currentPassword))
            return (false, "Mevcut parolanız hatalı.");

        user.PasswordHash = _hasher.Hash(user, newPassword);
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return (true, null);
    }

    /// <summary>Silently no-ops for an already-verified user so it's safe to call from both register and a "resend" button.</summary>
    public async Task RequestEmailVerificationAsync(Guid userId)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null || user.EmailVerified) return;

        var rawToken = await _tokens.IssueAsync(user.Id, VerificationTokenType.EmailVerify, TimeSpan.FromDays(3));
        await _mail.SendAsync(user.Email, "E-posta adresinizi doğrulayın",
            $"E-posta adresinizi doğrulamak için kod: {rawToken}");
    }

    public async Task<bool> VerifyEmailAsync(string rawToken)
    {
        var token = await _tokens.RedeemAsync(rawToken, VerificationTokenType.EmailVerify);
        if (token?.User is null) return false;

        token.User.EmailVerified = true;
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<(bool Success, string? Error, User? User)> ValidateCredentialsAsync(string email, string password)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email);

        if (user is null || user.PasswordHash is null)
            return (false, "E-posta veya parola hatalı.", null);

        if (user.LockedUntil is not null && user.LockedUntil > DateTime.UtcNow)
            return (false, "Hesabınız geçici olarak kilitlendi. Lütfen daha sonra tekrar deneyin.", null);

        if (!_hasher.Verify(user, user.PasswordHash, password))
        {
            user.FailedLoginAttempts++;
            if (user.FailedLoginAttempts >= 5)
                user.LockedUntil = DateTime.UtcNow.AddMinutes(15);
            await _db.SaveChangesAsync();
            return (false, "E-posta veya parola hatalı.", null);
        }

        if (user.Status == UserStatus.Disabled)
            return (false, "Hesabınız devre dışı bırakılmış.", null);

        user.FailedLoginAttempts = 0;
        user.LockedUntil = null;
        user.LastLoginAt = DateTime.UtcNow;
        if (user.Status == UserStatus.Invited) user.Status = UserStatus.Active;
        await _db.SaveChangesAsync();
        return (true, null, user);
    }

    public async Task RequestPasswordResetAsync(string email)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (user is null) return; // do not reveal whether the account exists

        var rawToken = await _tokens.IssueAsync(user.Id, VerificationTokenType.PasswordReset, TimeSpan.FromHours(1));
        await _mail.SendAsync(user.Email, "Parola sıfırlama", $"Sıfırlama kodunuz: {rawToken}");
    }

    public async Task<bool> ResetPasswordAsync(string rawToken, string newPassword)
    {
        var token = await _tokens.RedeemAsync(rawToken, VerificationTokenType.PasswordReset);
        if (token?.User is null) return false;

        token.User.PasswordHash = _hasher.Hash(token.User, newPassword);
        token.User.FailedLoginAttempts = 0;
        token.User.LockedUntil = null;
        if (token.User.Status == UserStatus.Invited) token.User.Status = UserStatus.Active;
        await _db.SaveChangesAsync();
        return true;
    }
}
