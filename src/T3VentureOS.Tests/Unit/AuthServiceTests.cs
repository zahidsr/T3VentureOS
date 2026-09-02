using T3VentureOS.Domain;
using T3VentureOS.Infrastructure.Services;
using T3VentureOS.Tests.TestSupport;

namespace T3VentureOS.Tests.Unit;

public class AuthServiceTests
{
    private static AuthService CreateService(out FakeEmailSender mail)
    {
        var db = TestDb.Create();
        mail = new FakeEmailSender();
        return new AuthService(db, new PasswordHasherService(), new VerificationTokenService(db), mail);
    }

    [Fact]
    public async Task RegisterAsync_creates_a_StartupKullanicisi_and_links_a_new_Girisim()
    {
        var auth = CreateService(out _);

        var (success, error, user) = await auth.RegisterAsync(
            "girisimci@example.com", "Passw0rd!", "Ada Girişimci", "Ada Teknoloji", "Yazılım");

        Assert.True(success, error);
        Assert.NotNull(user);
        Assert.Equal(UserRole.StartupKullanicisi, user!.Role);
        Assert.NotNull(user.GirisimId);
    }

    [Fact]
    public async Task RegisterAsync_rejects_a_duplicate_email()
    {
        var auth = CreateService(out _);
        await auth.RegisterAsync("girisimci@example.com", "Passw0rd!", "Ada Girişimci", "Ada Teknoloji", null);

        var (success, error, user) = await auth.RegisterAsync(
            "girisimci@example.com", "BaskaParola1!", "Başka Kişi", "Başka Girişim", null);

        Assert.False(success);
        Assert.Null(user);
        Assert.NotNull(error);
    }

    [Fact]
    public async Task ValidateCredentialsAsync_succeeds_with_the_correct_password()
    {
        var auth = CreateService(out _);
        await auth.RegisterAsync("girisimci@example.com", "Passw0rd!", "Ada Girişimci", "Ada Teknoloji", null);

        var (success, error, user) = await auth.ValidateCredentialsAsync("girisimci@example.com", "Passw0rd!");

        Assert.True(success, error);
        Assert.NotNull(user);
    }

    [Fact]
    public async Task ValidateCredentialsAsync_locks_the_account_after_five_failed_attempts()
    {
        var auth = CreateService(out _);
        await auth.RegisterAsync("girisimci@example.com", "Passw0rd!", "Ada Girişimci", "Ada Teknoloji", null);

        for (var i = 0; i < 5; i++)
            await auth.ValidateCredentialsAsync("girisimci@example.com", "yanlis-parola");

        var (success, error, _) = await auth.ValidateCredentialsAsync("girisimci@example.com", "Passw0rd!");

        Assert.False(success);
        Assert.Contains("kilit", error, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task RegisterAsync_sends_an_email_verification_message()
    {
        var auth = CreateService(out var mail);

        await auth.RegisterAsync("girisimci@example.com", "Passw0rd!", "Ada Girişimci", "Ada Teknoloji", null);

        Assert.Single(mail.Sent);
        Assert.Equal("girisimci@example.com", mail.Sent[0].ToEmail);
    }
}
