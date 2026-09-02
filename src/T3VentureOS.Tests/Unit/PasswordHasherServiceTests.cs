using T3VentureOS.Domain.Entities;
using T3VentureOS.Infrastructure.Services;

namespace T3VentureOS.Tests.Unit;

public class PasswordHasherServiceTests
{
    private readonly PasswordHasherService _hasher = new();
    private static User NewUser() => new() { Email = "test@example.com", FullName = "Test User" };

    [Fact]
    public void Verify_returns_true_for_the_correct_password()
    {
        var user = NewUser();
        var hash = _hasher.Hash(user, "Passw0rd!");

        Assert.True(_hasher.Verify(user, hash, "Passw0rd!"));
    }

    [Fact]
    public void Verify_returns_false_for_the_wrong_password()
    {
        var user = NewUser();
        var hash = _hasher.Hash(user, "Passw0rd!");

        Assert.False(_hasher.Verify(user, hash, "yanlis-parola"));
    }

    [Fact]
    public void Hash_is_salted_so_the_same_password_hashes_differently_each_time()
    {
        var user = NewUser();

        var hash1 = _hasher.Hash(user, "Passw0rd!");
        var hash2 = _hasher.Hash(user, "Passw0rd!");

        Assert.NotEqual(hash1, hash2);
    }
}
