using T3VentureOS.Domain;
using T3VentureOS.Domain.Entities;
using T3VentureOS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace T3VentureOS.Infrastructure.Services;

public class UserService
{
    private readonly AppDbContext _db;
    private readonly PasswordHasherService _hasher;
    private readonly VerificationTokenService _tokens;
    private readonly IEmailSender _mail;

    public UserService(AppDbContext db, PasswordHasherService hasher, VerificationTokenService tokens, IEmailSender mail)
    {
        _db = db;
        _hasher = hasher;
        _tokens = tokens;
        _mail = mail;
    }

    public Task<User?> GetByIdAsync(Guid id) =>
        _db.Users.Include(u => u.Girisim).FirstOrDefaultAsync(u => u.Id == id);

    public async Task<PagedResult<User>> ListAsync(
        UserRole? role = null, string? ara = null, int page = 1, int pageSize = PagingDefaults.DefaultPageSize)
    {
        (page, pageSize) = PagingDefaults.Normalize(page, pageSize);

        var query = _db.Users.Include(u => u.Girisim).Where(u => role == null || u.Role == role);
        if (!string.IsNullOrWhiteSpace(ara))
            query = query.Where(u => u.FullName.Contains(ara) || u.Email.Contains(ara));

        query = query.OrderByDescending(u => u.CreatedAt);

        var totalCount = await query.CountAsync();
        var items = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        return new PagedResult<User>(items, totalCount, page, pageSize);
    }

    /// <summary>Creates the account with a random temporary password and emails a reset link so the invitee sets their own.</summary>
    public async Task<(bool Success, string? Error, User? User)> InviteUserAsync(string email, string fullName, UserRole role, Guid? girisimId)
    {
        if (await _db.Users.AnyAsync(u => u.Email == email))
            return (false, "Bu e-posta ile zaten bir hesap var.", null);

        if (role == UserRole.StartupKullanicisi && girisimId is null)
            return (false, "Startup kullanıcısı bir girişime bağlı olmalıdır.", null);

        var user = new User
        {
            Email = email,
            FullName = fullName,
            Role = role,
            Status = UserStatus.Invited,
            GirisimId = role == UserRole.StartupKullanicisi ? girisimId : null,
        };
        user.PasswordHash = _hasher.Hash(user, Guid.NewGuid().ToString());
        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        var rawToken = await _tokens.IssueAsync(user.Id, VerificationTokenType.PasswordReset, TimeSpan.FromDays(7));
        await _mail.SendAsync(user.Email, "T3 Girişim Ekosistemi Yönetim Sistemi'ne davet edildiniz",
            $"Hesabınız oluşturuldu. Parolanızı belirlemek için kod: {rawToken}");

        return (true, null, user);
    }

    /// <summary>Re-sends the invite mail with a fresh token — the visible "yes, it went out" action for an admin to fall back on.</summary>
    public async Task<(bool Success, string? Error)> ResendInviteAsync(Guid userId)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null) return (false, "Kullanıcı bulunamadı.");
        if (user.Status != UserStatus.Invited) return (false, "Bu kullanıcı zaten hesabını aktifleştirmiş.");

        var rawToken = await _tokens.IssueAsync(user.Id, VerificationTokenType.PasswordReset, TimeSpan.FromDays(7));
        await _mail.SendAsync(user.Email, "T3 Girişim Ekosistemi Yönetim Sistemi'ne davet edildiniz",
            $"Hesabınız oluşturuldu. Parolanızı belirlemek için kod: {rawToken}");

        return (true, null);
    }

    /// <summary>Disabling blocks login immediately (AuthService checks Status); re-enabling always lands on Active.</summary>
    public async Task<(bool Success, string? Error)> SetDisabledAsync(Guid userId, bool disabled)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null) return (false, "Kullanıcı bulunamadı.");

        user.Status = disabled ? UserStatus.Disabled : UserStatus.Active;
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return (true, null);
    }
}
