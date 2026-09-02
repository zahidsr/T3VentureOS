using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using T3VentureOS.Infrastructure.Data;
using T3VentureOS.Web.Dtos;

namespace T3VentureOS.Tests.Integration;

public class AuthControllerTests : IClassFixture<T3VentureOSWebApplicationFactory>
{
    private readonly HttpClient _client;

    public AuthControllerTests(T3VentureOSWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Register_then_Me_returns_the_newly_created_account()
    {
        var email = $"{Guid.NewGuid():N}@example.com";
        var registerResponse = await _client.PostAsJsonAsync("/api/auth/register", new RegisterRequest(
            email, "Passw0rd!", "Test Kullanıcı", "Test Girişimi", "Yazılım"));

        Assert.Equal(HttpStatusCode.OK, registerResponse.StatusCode);
        var auth = await registerResponse.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(auth);
        Assert.False(string.IsNullOrWhiteSpace(auth!.AccessToken));
        Assert.Equal(email, auth.User.Email);
        Assert.Equal("StartupKullanicisi", auth.User.Role);

        var meRequest = new HttpRequestMessage(HttpMethod.Get, "/api/auth/me");
        meRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", auth.AccessToken);
        var meResponse = await _client.SendAsync(meRequest);

        Assert.Equal(HttpStatusCode.OK, meResponse.StatusCode);
        var me = await meResponse.Content.ReadFromJsonAsync<UserDto>();
        Assert.Equal(email, me!.Email);
    }

    [Fact]
    public async Task Login_with_seeded_demo_account_succeeds()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/login",
            new LoginRequest(DbInitializer.ProgramYoneticisiEmail, DbInitializer.DemoPassword));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var auth = await response.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.Equal("ProgramYoneticisi", auth!.User.Role);
    }

    [Fact]
    public async Task Login_with_the_wrong_password_fails()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/login",
            new LoginRequest(DbInitializer.ProgramYoneticisiEmail, "yanlis-parola"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Me_without_a_token_is_unauthorized()
    {
        var response = await _client.GetAsync("/api/auth/me");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
