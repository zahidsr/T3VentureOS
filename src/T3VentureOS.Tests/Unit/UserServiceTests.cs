using T3VentureOS.Domain;
using T3VentureOS.Domain.Entities;
using T3VentureOS.Infrastructure.Services;
using T3VentureOS.Infrastructure.Data;
using T3VentureOS.Tests.TestSupport;
using Microsoft.EntityFrameworkCore;

namespace T3VentureOS.Tests.Unit;

public class UserServiceTests
{
    private static UserService MakeService(AppDbContext db) =>
        new(db, new PasswordHasherService(), new VerificationTokenService(db), new FakeEmailSender(), new AuditLogService(db));

    private static User MakeUser(UserRole role, UserStatus status = UserStatus.Active) =>
        new() { Email = $"{Guid.NewGuid():N}@test.local", FullName = "Test Kullanıcı", Role = role, Status = status };

    [Fact]
    public async Task SetDisabledAsync_blocks_disabling_the_last_active_SuperAdmin()
    {
        var db = TestDb.Create();
        var admin = MakeUser(UserRole.SuperAdmin);
        db.Users.Add(admin);
        await db.SaveChangesAsync();

        var users = MakeService(db);
        var (success, error) = await users.SetDisabledAsync(admin.Id, admin.Id, disabled: true);

        Assert.False(success);
        Assert.Equal("Sistemde en az bir aktif Süper Admin kalmalıdır.", error);
        Assert.Equal(UserStatus.Active, db.Users.Single(u => u.Id == admin.Id).Status);
    }

    [Fact]
    public async Task SetDisabledAsync_allows_disabling_a_SuperAdmin_when_another_active_one_remains()
    {
        var db = TestDb.Create();
        var admin1 = MakeUser(UserRole.SuperAdmin);
        var admin2 = MakeUser(UserRole.SuperAdmin);
        db.Users.AddRange(admin1, admin2);
        await db.SaveChangesAsync();

        var users = MakeService(db);
        var (success, error) = await users.SetDisabledAsync(admin2.Id, admin1.Id, disabled: true);

        Assert.True(success);
        Assert.Null(error);
        Assert.Equal(UserStatus.Disabled, db.Users.Single(u => u.Id == admin1.Id).Status);
    }

    [Fact]
    public async Task ChangeRoleAsync_blocks_demoting_the_last_active_SuperAdmin()
    {
        var db = TestDb.Create();
        var admin = MakeUser(UserRole.SuperAdmin);
        db.Users.Add(admin);
        await db.SaveChangesAsync();

        var users = MakeService(db);
        var (success, error, updated) = await users.ChangeRoleAsync(admin.Id, admin.Id, UserRole.ProgramYoneticisi, null);

        Assert.False(success);
        Assert.Equal("Sistemde en az bir aktif Süper Admin kalmalıdır.", error);
        Assert.Null(updated);
        Assert.Equal(UserRole.SuperAdmin, db.Users.Single(u => u.Id == admin.Id).Role);
    }

    [Fact]
    public async Task ChangeRoleAsync_allows_demoting_a_SuperAdmin_when_another_active_one_remains()
    {
        var db = TestDb.Create();
        var admin1 = MakeUser(UserRole.SuperAdmin);
        var admin2 = MakeUser(UserRole.SuperAdmin);
        db.Users.AddRange(admin1, admin2);
        await db.SaveChangesAsync();

        var users = MakeService(db);
        var (success, error, updated) = await users.ChangeRoleAsync(admin2.Id, admin1.Id, UserRole.KararVerici, null);

        Assert.True(success);
        Assert.Null(error);
        Assert.Equal(UserRole.KararVerici, updated!.Role);
    }

    [Fact]
    public async Task ChangeRoleAsync_requires_a_girisim_when_the_new_role_is_StartupKullanicisi()
    {
        var db = TestDb.Create();
        var actor = MakeUser(UserRole.SuperAdmin);
        var target = MakeUser(UserRole.KararVerici);
        db.Users.AddRange(actor, target);
        await db.SaveChangesAsync();

        var users = MakeService(db);
        var (success, error, _) = await users.ChangeRoleAsync(actor.Id, target.Id, UserRole.StartupKullanicisi, null);

        Assert.False(success);
        Assert.Equal("Startup kullanıcısı bir girişime bağlı olmalıdır.", error);
    }

    [Fact]
    public async Task ChangeRoleAsync_reassigns_girisim_when_promoting_to_StartupKullanicisi()
    {
        var db = TestDb.Create();
        var actor = MakeUser(UserRole.SuperAdmin);
        var target = MakeUser(UserRole.KararVerici);
        var girisim = new Girisim { Ad = "Yeni Girişim", CreatedById = actor.Id };
        db.Users.AddRange(actor, target);
        db.Girisimler.Add(girisim);
        await db.SaveChangesAsync();

        var users = MakeService(db);
        var (success, error, updated) = await users.ChangeRoleAsync(actor.Id, target.Id, UserRole.StartupKullanicisi, girisim.Id);

        Assert.True(success);
        Assert.Null(error);
        Assert.Equal(girisim.Id, updated!.GirisimId);
    }

    [Fact]
    public async Task ChangeGirisimAsync_rejects_targets_that_are_not_StartupKullanicisi()
    {
        var db = TestDb.Create();
        var actor = MakeUser(UserRole.SuperAdmin);
        var target = MakeUser(UserRole.ProgramYoneticisi);
        var girisim = new Girisim { Ad = "Girişim", CreatedById = actor.Id };
        db.Users.AddRange(actor, target);
        db.Girisimler.Add(girisim);
        await db.SaveChangesAsync();

        var users = MakeService(db);
        var (success, error, _) = await users.ChangeGirisimAsync(actor.Id, target.Id, girisim.Id);

        Assert.False(success);
        Assert.Equal("Yalnızca startup kullanıcılarının girişim ataması değiştirilebilir.", error);
    }

    [Fact]
    public async Task ChangeGirisimAsync_moves_a_StartupKullanicisi_to_the_new_girisim()
    {
        var db = TestDb.Create();
        var actor = MakeUser(UserRole.SuperAdmin);
        var eskiGirisim = new Girisim { Ad = "Eski Girişim", CreatedById = actor.Id };
        var yeniGirisim = new Girisim { Ad = "Yeni Girişim", CreatedById = actor.Id };
        var target = MakeUser(UserRole.StartupKullanicisi);
        target.GirisimId = eskiGirisim.Id;
        db.Users.AddRange(actor, target);
        db.Girisimler.AddRange(eskiGirisim, yeniGirisim);
        await db.SaveChangesAsync();

        var users = MakeService(db);
        var (success, error, updated) = await users.ChangeGirisimAsync(actor.Id, target.Id, yeniGirisim.Id);

        Assert.True(success);
        Assert.Null(error);
        Assert.Equal(yeniGirisim.Id, updated!.GirisimId);
    }

    [Fact]
    public async Task BulkInviteAsync_reports_a_bad_row_without_failing_the_rest_of_the_batch()
    {
        var db = TestDb.Create();
        var actor = MakeUser(UserRole.SuperAdmin);
        db.Users.Add(actor);
        await db.SaveChangesAsync();

        var users = MakeService(db);
        var rows = new List<BulkInviteRow>
        {
            new("gecerli@test.local", "Geçerli Kullanıcı", "KararVerici", null),
            new("gecersiz-rol@test.local", "Geçersiz Rol", "OlmayanRol", null),
            new("startup-girisimsiz@test.local", "Girişimsiz Startup", "StartupKullanicisi", null),
        };

        var results = await users.BulkInviteAsync(actor.Id, rows);

        Assert.Equal(3, results.Count);
        Assert.True(results[0].Basarili);
        Assert.False(results[1].Basarili);
        Assert.Equal("Geçersiz rol: OlmayanRol", results[1].Hata);
        Assert.False(results[2].Basarili);
        Assert.Equal("Girişim adı zorunludur.", results[2].Hata);
        Assert.True(await db.Users.AnyAsync(u => u.Email == "gecerli@test.local"));
    }

    [Fact]
    public async Task InviteUserAsync_writes_an_audit_log_entry()
    {
        var db = TestDb.Create();
        var actor = MakeUser(UserRole.SuperAdmin);
        db.Users.Add(actor);
        await db.SaveChangesAsync();

        var users = MakeService(db);
        var (success, _, invited) = await users.InviteUserAsync(actor.Id, "davetli@test.local", "Davetli Kullanıcı", UserRole.KararVerici, null);

        Assert.True(success);
        var entry = db.IslemKayitlari.Single();
        Assert.Equal(IslemEylemleri.KullaniciDavetEdildi, entry.Eylem);
        Assert.Equal(actor.Id, entry.ActorId);
        Assert.Equal(invited!.Id, entry.HedefKullaniciId);
    }
}
