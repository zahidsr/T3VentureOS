using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using T3VentureOS.Infrastructure.Data;
using T3VentureOS.Web.Dtos;

namespace T3VentureOS.Tests.Integration;

public class GirisimlerControllerTests : IClassFixture<T3VentureOSWebApplicationFactory>
{
    private readonly HttpClient _client;

    public GirisimlerControllerTests(T3VentureOSWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    private async Task<string> LoginAsync(string email, string password)
    {
        var response = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest(email, password));
        response.EnsureSuccessStatusCode();
        var auth = await response.Content.ReadFromJsonAsync<AuthResponse>();
        return auth!.AccessToken;
    }

    private HttpRequestMessage AuthorizedGet(string url, string token)
    {
        var request = new HttpRequestMessage(HttpMethod.Get, url);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return request;
    }

    [Fact]
    public async Task Listing_girisimler_without_a_token_is_unauthorized()
    {
        var response = await _client.GetAsync("/api/girisimler");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task ProgramYoneticisi_can_list_girisimler()
    {
        var token = await LoginAsync(DbInitializer.ProgramYoneticisiEmail, DbInitializer.DemoPassword);

        var response = await _client.SendAsync(AuthorizedGet("/api/girisimler", token));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task StartupKullanicisi_is_forbidden_from_the_full_girisimler_listing()
    {
        var token = await LoginAsync(DbInitializer.StartupEmail, DbInitializer.DemoPassword);

        var response = await _client.SendAsync(AuthorizedGet("/api/girisimler", token));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task StartupKullanicisi_can_read_its_own_girisim_via_benim()
    {
        var token = await LoginAsync(DbInitializer.StartupEmail, DbInitializer.DemoPassword);

        var response = await _client.SendAsync(AuthorizedGet("/api/girisimler/benim", token));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    /// <summary>
    /// Guards the actual attack the [GirisimErisim] resource-based filter exists to stop: a
    /// StartupKullanicisi hitting /api/girisimler/{id} with someone ELSE's girişim id in the route,
    /// not their own. Listing/detail/benim alone wouldn't catch a regression here.
    /// </summary>
    [Fact]
    public async Task StartupKullanicisi_cannot_read_another_girisims_details_by_id()
    {
        var startupToken = await LoginAsync(DbInitializer.StartupEmail, DbInitializer.DemoPassword);
        var ownGirisim = await (await _client.SendAsync(AuthorizedGet("/api/girisimler/benim", startupToken)))
            .Content.ReadFromJsonAsync<GirisimDetailDto>();

        var pmToken = await LoginAsync(DbInitializer.ProgramYoneticisiEmail, DbInitializer.DemoPassword);
        var allGirisimler = await (await _client.SendAsync(AuthorizedGet("/api/girisimler?pageSize=50", pmToken)))
            .Content.ReadFromJsonAsync<PagedResultDto<GirisimSummaryDto>>();
        var otherGirisimId = allGirisimler!.Items.Select(g => g.Id).First(id => id != ownGirisim!.Id);

        var ownResponse = await _client.SendAsync(AuthorizedGet($"/api/girisimler/{ownGirisim!.Id}", startupToken));
        var otherResponse = await _client.SendAsync(AuthorizedGet($"/api/girisimler/{otherGirisimId}", startupToken));

        Assert.Equal(HttpStatusCode.OK, ownResponse.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, otherResponse.StatusCode);
    }
}
