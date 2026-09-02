using T3VentureOS.Infrastructure.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace T3VentureOS.Tests.Integration;

/// <summary>
/// Boots the real Program.cs pipeline (controllers, auth, seeding) against an isolated in-memory
/// database per factory instance.
///
/// Program.cs reads Jwt:Key directly off `builder.Configuration` and throws before `builder.Build()`
/// runs — i.e. before WebApplicationFactory's ConfigureWebHost/ConfigureAppConfiguration hooks are
/// applied. Environment variables are read into configuration earlier than that, so the Jwt__Key
/// (double-underscore = ':' section separator) env var is the only override point that lands in time.
/// </summary>
public class T3VentureOSWebApplicationFactory : WebApplicationFactory<Program>
{
    private readonly string _dbName = Guid.NewGuid().ToString();

    static T3VentureOSWebApplicationFactory()
    {
        Environment.SetEnvironmentVariable("Jwt__Key", "test-only-signing-key-at-least-32-characters-long");
        Environment.SetEnvironmentVariable("Jwt__Issuer", "T3VentureOS.Tests");
        Environment.SetEnvironmentVariable("Jwt__Audience", "T3VentureOS.Tests.Client");
        Environment.SetEnvironmentVariable("Cors__AllowedOrigins__0", "http://localhost:5173");
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        builder.ConfigureServices(services =>
        {
            // EF Core 8+ keeps each AddDbContext optionsAction as its own IDbContextOptionsConfiguration<T>
            // registration (they all get applied) — removing only DbContextOptions<T> leaves Program.cs's
            // UseSqlServer(...) configuration active alongside ours, which EF then rejects as two providers.
            services.RemoveAll<DbContextOptions<AppDbContext>>();
            services.RemoveAll<IDbContextOptionsConfiguration<AppDbContext>>();
            services.AddDbContext<AppDbContext>(options => options.UseInMemoryDatabase(_dbName));
        });
    }
}
