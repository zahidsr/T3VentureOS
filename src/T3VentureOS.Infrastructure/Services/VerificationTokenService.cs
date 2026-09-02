using System.Security.Cryptography;
using System.Text;
using T3VentureOS.Domain;
using T3VentureOS.Domain.Entities;
using T3VentureOS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace T3VentureOS.Infrastructure.Services;

/// <summary>Issues and redeems single-use, hashed tokens for email verification and password reset.</summary>
public class VerificationTokenService
{
    private readonly AppDbContext _db;

    public VerificationTokenService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<string> IssueAsync(Guid userId, VerificationTokenType type, TimeSpan validFor)
    {
        var rawToken = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
        _db.VerificationTokens.Add(new VerificationToken
        {
            UserId = userId,
            Type = type,
            TokenHash = Hash(rawToken),
            ExpiresAt = DateTime.UtcNow.Add(validFor),
        });
        await _db.SaveChangesAsync();
        return rawToken;
    }

    public async Task<VerificationToken?> RedeemAsync(string rawToken, VerificationTokenType type)
    {
        var hash = Hash(rawToken);
        var token = await _db.VerificationTokens
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.TokenHash == hash && t.Type == type);

        if (token is null || token.UsedAt is not null || token.ExpiresAt < DateTime.UtcNow)
            return null;

        token.UsedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return token;
    }

    private static string Hash(string raw) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(raw)));
}
