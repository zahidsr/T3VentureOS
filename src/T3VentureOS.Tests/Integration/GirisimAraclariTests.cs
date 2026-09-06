using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using T3VentureOS.Domain.Entities;
using T3VentureOS.Infrastructure.Data;
using T3VentureOS.Web.Controllers;
using T3VentureOS.Web.Dtos;

namespace T3VentureOS.Tests.Integration;

public class GirisimAraclariTests : IClassFixture<T3VentureOSWebApplicationFactory>
{
    private const string Root = "/api/girisimler/benim/araclar";
    private readonly T3VentureOSWebApplicationFactory _factory;
    public GirisimAraclariTests(T3VentureOSWebApplicationFactory factory) => _factory = factory;

    private async Task<HttpClient> Login(string email = DbInitializer.StartupEmail)
    {
        var client = _factory.CreateClient();
        var login = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(email, DbInitializer.DemoPassword));
        login.EnsureSuccessStatusCode();
        var auth = await login.Content.ReadFromJsonAsync<AuthResponse>();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth!.AccessToken);
        return client;
    }

    private static async Task<JsonElement> Json(HttpResponseMessage response)
    {
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<JsonElement>();
    }

    [Fact]
    public async Task Anonymous_and_non_startup_users_cannot_access_tools()
    {
        using var anonymous = _factory.CreateClient();
        using var manager = await Login(DbInitializer.ProgramYoneticisiEmail);
        foreach (var path in new[] { "/nakit", "/hedefler" })
        {
            Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.GetAsync(Root + path)).StatusCode);
            Assert.Equal(HttpStatusCode.Forbidden, (await manager.GetAsync(Root + path)).StatusCode);
        }
        Assert.Equal(HttpStatusCode.Forbidden, (await manager.PutAsJsonAsync(Root + "/nakit", new { kasadakiPara = 1, aylikGelir = 0, aylikGider = 1 })).StatusCode);
    }

    [Fact]
    public async Task Cash_persists_across_requests_and_stale_write_is_rejected()
    {
        using var client = await Login();
        var before = await Json(await client.GetAsync(Root + "/nakit"));
        var version = before.TryGetProperty("plan", out var plan) && plan.ValueKind != JsonValueKind.Null ? plan.GetProperty("version").GetString() : null;
        var saved = await Json(await client.PutAsJsonAsync(Root + "/nakit", new { kasadakiPara = 120000.25m, aylikGelir = 10000, aylikGider = 30000, version }));
        using var newClient = await Login();
        var loaded = await Json(await newClient.GetAsync(Root + "/nakit"));
        Assert.EndsWith("Z", loaded.GetProperty("plan").GetProperty("updatedAt").GetString());
        Assert.Equal(120000.25m, loaded.GetProperty("plan").GetProperty("kasadakiPara").GetDecimal());
        Assert.Equal(saved.GetProperty("plan").GetProperty("version").GetString(), loaded.GetProperty("plan").GetProperty("version").GetString());
        Assert.Equal(HttpStatusCode.Conflict, (await client.PutAsJsonAsync(Root + "/nakit", new { kasadakiPara = 1, aylikGelir = 0, aylikGider = 1, version })).StatusCode);
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(0.001)]
    [InlineData(1000000000000)]
    public async Task Invalid_cash_is_rejected(decimal amount)
    {
        using var client = await Login();
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PutAsJsonAsync(Root + "/nakit", new { kasadakiPara = amount, aylikGelir = 0, aylikGider = 1 })).StatusCode);
    }

    [Fact]
    public async Task Missing_cash_amount_is_rejected()
    {
        using var client = await Login();
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PutAsJsonAsync(Root + "/nakit", new { aylikGelir = 0, aylikGider = 1 })).StatusCode);
    }

    [Fact]
    public async Task Goals_persist_empty_slots_completion_and_separate_weeks()
    {
        using var client = await Login();
        var monday = GirisimAraclariController.BuHafta(DateTimeOffset.UtcNow).AddDays(-28).ToString("yyyy-MM-dd");
        var body = new { hedefler = new[] { new { baslik = "5 müşteriyle görüş", tamamlandi = true }, new { baslik = "", tamamlandi = false }, new { baslik = "Demo hazırla", tamamlandi = false } } };
        var saved = await Json(await client.PutAsJsonAsync(Root + "/hedefler/" + monday, body));
        using var reloaded = await Login();
        var loaded = await Json(await reloaded.GetAsync(Root + "/hedefler?hafta=" + monday));
        Assert.Equal("5 müşteriyle görüş", loaded.GetProperty("hedefler")[0].GetProperty("baslik").GetString());
        Assert.True(loaded.GetProperty("hedefler")[0].GetProperty("tamamlandi").GetBoolean());
        Assert.Equal("", loaded.GetProperty("hedefler")[1].GetProperty("baslik").GetString());
        Assert.Equal(saved.GetProperty("version").GetString(), loaded.GetProperty("version").GetString());
        Assert.Equal(HttpStatusCode.Conflict, (await client.PutAsJsonAsync(Root + "/hedefler/" + monday, body)).StatusCode);
        var other = await Json(await client.GetAsync(Root + "/hedefler?hafta=" + DateOnly.Parse(monday).AddDays(-7).ToString("yyyy-MM-dd")));
        Assert.All(other.GetProperty("hedefler").EnumerateArray(), h => Assert.Equal("", h.GetProperty("baslik").GetString()));
    }

    [Fact]
    public async Task Invalid_goals_and_dates_are_rejected()
    {
        using var client = await Login();
        var monday = GirisimAraclariController.BuHafta(DateTimeOffset.UtcNow);
        foreach (var goals in new object[] {
            new[] { new { baslik = "Bir", tamamlandi = false } },
            new[] { new { baslik = "", tamamlandi = true }, new { baslik = "", tamamlandi = false }, new { baslik = "", tamamlandi = false } },
            new[] { new { baslik = new string('a', 201), tamamlandi = false }, new { baslik = "", tamamlandi = false }, new { baslik = "", tamamlandi = false } },
            new object?[] { null, null, null },
        })
            Assert.Equal(HttpStatusCode.BadRequest, (await client.PutAsJsonAsync(Root + "/hedefler/" + monday.ToString("yyyy-MM-dd"), new { hedefler = goals })).StatusCode);
        foreach (var date in new[] { monday.AddDays(1), monday.AddDays(7), new DateOnly(2019, 12, 30) })
            Assert.Equal(HttpStatusCode.BadRequest, (await client.GetAsync(Root + "/hedefler?hafta=" + date.ToString("yyyy-MM-dd"))).StatusCode);
    }

    [Fact]
    public async Task Client_supplied_startup_id_cannot_select_another_startups_cash()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var ownId = await db.Users.Where(u => u.Email == DbInitializer.StartupEmail).Select(u => u.GirisimId).SingleAsync();
        var otherId = await db.Girisimler.Where(g => g.Id != ownId).Select(g => g.Id).FirstAsync();
        db.NakitPlanlari.Add(new NakitPlani { GirisimId = otherId, KasadakiPara = 987654321m });
        await db.SaveChangesAsync();
        using var client = await Login();
        var response = await Json(await client.GetAsync(Root + "/nakit?girisimId=" + otherId));
        if (response.TryGetProperty("plan", out var plan) && plan.ValueKind != JsonValueKind.Null)
            Assert.Equal(ownId.ToString(), plan.GetProperty("girisimId").GetString());
        var version = plan.ValueKind == JsonValueKind.Object ? plan.GetProperty("version").GetString() : null;
        await Json(await client.PutAsJsonAsync(Root + "/nakit", new { girisimId = otherId, kasadakiPara = 3, aylikGelir = 0, aylikGider = 1, version }));
        db.ChangeTracker.Clear();
        Assert.Equal(987654321m, (await db.NakitPlanlari.FindAsync(otherId))!.KasadakiPara);
    }

    [Theory]
    [InlineData("2026-09-06T20:59:00Z", "2026-08-31")]
    [InlineData("2026-09-06T21:00:00Z", "2026-09-07")]
    [InlineData("2026-01-01T00:00:00Z", "2025-12-29")]
    public void Week_starts_on_Monday_in_Turkey(string now, string expected) =>
        Assert.Equal(DateOnly.Parse(expected), GirisimAraclariController.BuHafta(DateTimeOffset.Parse(now)));
}
