using System.Text;
using System.Text.Json.Serialization;
using T3VentureOS.Infrastructure.Data;
using T3VentureOS.Infrastructure.Services;
using T3VentureOS.Web.Auth;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
        options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
    });

builder.Services.AddEndpointsApiExplorer();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("Default")));

builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUserService, HttpCurrentUserService>();

builder.Services.AddScoped<PasswordHasherService>();
builder.Services.AddScoped<VerificationTokenService>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<UserService>();
builder.Services.AddScoped<ProgramService>();
builder.Services.AddScoped<GirisimService>();
builder.Services.AddScoped<OnayService>();
builder.Services.AddScoped<DashboardService>();
builder.Services.AddScoped<NotificationService>();
builder.Services.AddScoped<ItirazService>();
builder.Services.AddScoped<OnayOneriService>();
builder.Services.AddScoped<PrivacyService>();
builder.Services.AddScoped<OnboardingService>();
builder.Services.AddScoped<GirisimSaglikService>();
builder.Services.AddScoped<PitchDeckService>();
builder.Services.AddScoped<GirisimAnalizService>();
builder.Services.AddScoped<EkosistemEtkiService>();
builder.Services.AddScoped<ProgramKohortService>();
builder.Services.AddScoped<YatirimciHazirligiService>();
builder.Services.AddScoped<SunumPaylasimService>();
builder.Services.AddScoped<AsamaService>();
builder.Services.AddScoped<AuditLogService>();
builder.Services.AddScoped<IEmailSender, LoggingEmailSender>();
builder.Services.AddScoped<JwtTokenService>();
// AI sağlayıcısı config ile seçilir (Ai:Provider = "Gemini" | "Anthropic"); varsayılan Gemini.
// Her iki tipli HttpClient de kayıtlı kalır, IAiService yalnızca seçili olana çözümlenir.
builder.Services.AddHttpClient<AnthropicService>();
builder.Services.AddHttpClient<GeminiService>();
var aiProvider = builder.Configuration["Ai:Provider"];
if (string.Equals(aiProvider, "Anthropic", StringComparison.OrdinalIgnoreCase))
    builder.Services.AddScoped<IAiService>(sp => sp.GetRequiredService<AnthropicService>());
else
    builder.Services.AddScoped<IAiService>(sp => sp.GetRequiredService<GeminiService>());

var uploadsRoot = Path.Combine(builder.Environment.ContentRootPath, "wwwroot", "uploads");
builder.Services.AddSingleton(new FileStorageService(uploadsRoot, "/uploads"));

var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? Array.Empty<string>();
builder.Services.AddCors(options =>
{
    options.AddPolicy("Spa", policy =>
        policy.WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod());
});

// Signing key is never committed — set it via `dotnet user-secrets set "Jwt:Key" "..."` locally,
// or the Jwt__Key environment variable in any other environment.
var jwtKey = builder.Configuration["Jwt:Key"]
    ?? throw new InvalidOperationException("Jwt:Key is not configured. Run: dotnet user-secrets set \"Jwt:Key\" \"<value>\" (or set the Jwt__Key env var).");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidateAudience = true,
            ValidAudience = builder.Configuration["Jwt:Audience"],
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromSeconds(30),
        };
    });
builder.Services.AddAuthorization(AuthorizationPolicies.Configure);

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await DbInitializer.SeedAsync(db);
    await DbInitializer.SeedDemoExtrasAsync(db);
    await DbInitializer.SeedIstihdamAsync(db);
    await DbInitializer.SeedAsamaGecisleriAsync(db);
    await DbInitializer.PuanlariTazeleAsync(db);
}

app.UseHttpsRedirection();
app.UseRouting();
app.UseStaticFiles();

app.UseCors("Spa");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();

/// <summary>Exposes the top-level-statements entry point so WebApplicationFactory&lt;Program&gt; can bootstrap it in tests.</summary>
public partial class Program;
