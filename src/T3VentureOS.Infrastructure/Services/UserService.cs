using T3VentureOS.Domain;
using T3VentureOS.Domain.Entities;
using T3VentureOS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace T3VentureOS.Infrastructure.Services;

public record BulkInviteRow(string Email, string FullName, string Role, string? GirisimAdi);
public record BulkInviteRowResult(int SatirNo, string Email, bool Basarili, string? Hata);

public class UserService
{
    private readonly AppDbContext _db;
    private readonly PasswordHasherService _hasher;
    private readonly VerificationTokenService _tokens;
    private readonly IEmailSender _mail;
    private readonly AuditLogService _audit;

    public UserService(AppDbContext db, PasswordHasherService hasher, VerificationTokenService tokens, IEmailSender mail, AuditLogService audit)
    {
        _db = db;
        _hasher = hasher;
        _tokens = tokens;
        _mail = mail;
        _audit = audit;
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
    public async Task<(bool Success, string? Error, User? User)> InviteUserAsync(
        Guid actorId, string email, string fullName, UserRole role, Guid? girisimId)
    {
        if (await _db.Users.AnyAsync(u => u.Email == email))
            return (false, "Bu e-posta ile zaten bir hesap var.", null);

        if (role == UserRole.StartupKullanicisi && girisimId is null)
            return (false, "Startup kullanıcısı bir girişime bağlı olmalıdır.", null);

        var actor = await _db.Users.FirstOrDefaultAsync(u => u.Id == actorId);
        if (actor is null) return (false, "Oturum açan kullanıcı bulunamadı.", null);

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

        await _audit.LogAsync(actor, IslemEylemleri.KullaniciDavetEdildi, user, $"Rol: {role}");

        return (true, null, user);
    }

    /// <summary>Re-sends the invite mail with a fresh token — the visible "yes, it went out" action for an admin to fall back on.</summary>
    public async Task<(bool Success, string? Error)> ResendInviteAsync(Guid actorId, Guid userId)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null) return (false, "Kullanıcı bulunamadı.");
        if (user.Status != UserStatus.Invited) return (false, "Bu kullanıcı zaten hesabını aktifleştirmiş.");

        var actor = await _db.Users.FirstOrDefaultAsync(u => u.Id == actorId);
        if (actor is null) return (false, "Oturum açan kullanıcı bulunamadı.");

        var rawToken = await _tokens.IssueAsync(user.Id, VerificationTokenType.PasswordReset, TimeSpan.FromDays(7));
        await _mail.SendAsync(user.Email, "T3 Girişim Ekosistemi Yönetim Sistemi'ne davet edildiniz",
            $"Hesabınız oluşturuldu. Parolanızı belirlemek için kod: {rawToken}");

        await _audit.LogAsync(actor, IslemEylemleri.DavetYenidenGonderildi, user);

        return (true, null);
    }

    /// <summary>Disabling blocks login immediately (AuthService checks Status); re-enabling always lands on Active.
    /// Guards against disabling the system's last active SuperAdmin, which would lock everyone out of admin functions.</summary>
    public async Task<(bool Success, string? Error)> SetDisabledAsync(Guid actorId, Guid userId, bool disabled)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null) return (false, "Kullanıcı bulunamadı.");

        if (disabled && user.Role == UserRole.SuperAdmin && await IsLastActiveSuperAdminAsync(user.Id))
            return (false, "Sistemde en az bir aktif Süper Admin kalmalıdır.");

        var actor = await _db.Users.FirstOrDefaultAsync(u => u.Id == actorId);
        if (actor is null) return (false, "Oturum açan kullanıcı bulunamadı.");

        user.Status = disabled ? UserStatus.Disabled : UserStatus.Active;
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        await _audit.LogAsync(actor, disabled ? IslemEylemleri.KullaniciDevreDisiBirakildi : IslemEylemleri.KullaniciAktiflestirildi, user);

        return (true, null);
    }

    /// <summary>Changes a user's role (and, for StartupKullanicisi, their girişim assignment in the same step).
    /// Guards against demoting the system's last active SuperAdmin — always requires at least one to remain.</summary>
    public async Task<(bool Success, string? Error, User? User)> ChangeRoleAsync(
        Guid actorId, Guid userId, UserRole newRole, Guid? girisimId)
    {
        var user = await _db.Users.Include(u => u.Girisim).FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null) return (false, "Kullanıcı bulunamadı.", null);

        if (newRole == UserRole.StartupKullanicisi && girisimId is null)
            return (false, "Startup kullanıcısı bir girişime bağlı olmalıdır.", null);

        if (user.Role == UserRole.SuperAdmin && newRole != UserRole.SuperAdmin && await IsLastActiveSuperAdminAsync(user.Id))
            return (false, "Sistemde en az bir aktif Süper Admin kalmalıdır.", null);

        if (newRole == UserRole.StartupKullanicisi && girisimId is not null && !await _db.Girisimler.AnyAsync(g => g.Id == girisimId))
            return (false, "Girişim bulunamadı.", null);

        var actor = await _db.Users.FirstOrDefaultAsync(u => u.Id == actorId);
        if (actor is null) return (false, "Oturum açan kullanıcı bulunamadı.", null);

        var oldRole = user.Role;
        user.Role = newRole;
        user.GirisimId = newRole == UserRole.StartupKullanicisi ? girisimId : null;
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        await _db.Entry(user).Reference(u => u.Girisim).LoadAsync();

        await _audit.LogAsync(actor, IslemEylemleri.RolDegistirildi, user, $"{oldRole} → {newRole}");

        return (true, null, user);
    }

    /// <summary>Reassigns which girişim a StartupKullanicisi represents.</summary>
    public async Task<(bool Success, string? Error, User? User)> ChangeGirisimAsync(Guid actorId, Guid userId, Guid? girisimId)
    {
        var user = await _db.Users.Include(u => u.Girisim).FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null) return (false, "Kullanıcı bulunamadı.", null);

        if (user.Role != UserRole.StartupKullanicisi)
            return (false, "Yalnızca startup kullanıcılarının girişim ataması değiştirilebilir.", null);

        if (girisimId is null)
            return (false, "Startup kullanıcısı bir girişime bağlı olmalıdır.", null);

        var girisim = await _db.Girisimler.FirstOrDefaultAsync(g => g.Id == girisimId);
        if (girisim is null) return (false, "Girişim bulunamadı.", null);

        var actor = await _db.Users.FirstOrDefaultAsync(u => u.Id == actorId);
        if (actor is null) return (false, "Oturum açan kullanıcı bulunamadı.", null);

        var eskiGirisimAdi = user.Girisim?.Ad ?? "—";
        user.GirisimId = girisim.Id;
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        await _db.Entry(user).Reference(u => u.Girisim).LoadAsync();

        await _audit.LogAsync(actor, IslemEylemleri.GirisimAtamasiDegistirildi, user, $"{eskiGirisimAdi} → {girisim.Ad}");

        return (true, null, user);
    }

    /// <summary>Invites every row independently — a bad row (invalid role, duplicate e-posta, missing girişim)
    /// fails on its own without blocking the rest of the batch.</summary>
    public async Task<List<BulkInviteRowResult>> BulkInviteAsync(Guid actorId, List<BulkInviteRow> rows)
    {
        var results = new List<BulkInviteRowResult>();
        var basariliSayisi = 0;

        for (var i = 0; i < rows.Count; i++)
        {
            var satirNo = i + 1;
            var row = rows[i];

            if (string.IsNullOrWhiteSpace(row.Email) || !row.Email.Contains('@'))
            {
                results.Add(new BulkInviteRowResult(satirNo, row.Email, false, "Geçersiz e-posta."));
                continue;
            }

            if (!Enum.TryParse<UserRole>(row.Role, true, out var role))
            {
                results.Add(new BulkInviteRowResult(satirNo, row.Email, false, $"Geçersiz rol: {row.Role}"));
                continue;
            }

            Guid? girisimId = null;
            if (role == UserRole.StartupKullanicisi)
            {
                if (string.IsNullOrWhiteSpace(row.GirisimAdi))
                {
                    results.Add(new BulkInviteRowResult(satirNo, row.Email, false, "Girişim adı zorunludur."));
                    continue;
                }

                var girisim = await _db.Girisimler.FirstOrDefaultAsync(g => g.Ad.ToLower() == row.GirisimAdi.ToLower());
                if (girisim is null)
                {
                    results.Add(new BulkInviteRowResult(satirNo, row.Email, false, $"Girişim bulunamadı: {row.GirisimAdi}"));
                    continue;
                }
                girisimId = girisim.Id;
            }

            var (success, error, _) = await InviteUserAsync(actorId, row.Email, row.FullName, role, girisimId);
            results.Add(new BulkInviteRowResult(satirNo, row.Email, success, error));
            if (success) basariliSayisi++;
        }

        var actor = await _db.Users.FirstOrDefaultAsync(u => u.Id == actorId);
        if (actor is not null)
        {
            await _audit.LogAsync(actor, IslemEylemleri.TopluDavetTamamlandi, null,
                $"{rows.Count} satır, {basariliSayisi} başarılı, {rows.Count - basariliSayisi} hatalı");
        }

        return results;
    }

    /// <summary>True when removing/disabling this SuperAdmin would leave zero active SuperAdmin accounts.</summary>
    private async Task<bool> IsLastActiveSuperAdminAsync(Guid excludeUserId)
    {
        var otherActiveSuperAdmins = await _db.Users.CountAsync(u =>
            u.Id != excludeUserId && u.Role == UserRole.SuperAdmin && u.Status != UserStatus.Disabled);
        return otherActiveSuperAdmins == 0;
    }
}
