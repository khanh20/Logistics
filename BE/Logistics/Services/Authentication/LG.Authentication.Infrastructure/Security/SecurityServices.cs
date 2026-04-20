using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using LG.Authentication.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace LG.Authentication.Infrastructure.Security;

// ── Password ─────────────────────────────────────────────────────────────────
public interface IPasswordHasher
{
    string Hash(string password);
    bool   Verify(string password, string hash);
}

public class PasswordHasher : IPasswordHasher
{
    private readonly PasswordHasher<string> _inner = new();

    public string Hash(string password)   => _inner.HashPassword(null!, password);
    public bool   Verify(string password, string hash)
        => _inner.VerifyHashedPassword(null!, hash, password) != PasswordVerificationResult.Failed;
}

// ── JWT / Refresh token ───────────────────────────────────────────────────────
public interface ITokenService
{
    string           GenerateAccessToken(User user, IEnumerable<string> roles, IEnumerable<string> permissions);
    RefreshToken     GenerateRefreshToken(Guid userId, string? ip);
    ClaimsPrincipal? ValidateExpiredToken(string token);
}

public class TokenService(IConfiguration config) : ITokenService
{
    private string SecretKey => config["Jwt:SecretKey"]
        ?? throw new InvalidOperationException("Jwt:SecretKey is not configured.");
    private int AccessMinutes  => int.TryParse(config["Jwt:AccessTokenMinutes"], out var v) ? v : 30;
    private int RefreshDays    => int.TryParse(config["Jwt:RefreshTokenDays"],   out var v) ? v : 7;

    public string GenerateAccessToken(User user, IEnumerable<string> roles, IEnumerable<string> permissions)
    {
        var key   = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(SecretKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new("userId",   user.Id.ToString()),
            new("email",    user.Email),
            new("fullName", user.FullName),
        };

        claims.AddRange(roles.Select(r       => new Claim(ClaimTypes.Role, r)));
        claims.AddRange(permissions.Select(p => new Claim("permission", p)));

        var token = new JwtSecurityToken(
            issuer:            config["Jwt:Issuer"],
            audience:          config["Jwt:Audience"],
            claims:            claims,
            expires:           DateTime.UtcNow.AddMinutes(AccessMinutes),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public RefreshToken GenerateRefreshToken(Guid userId, string? ip)
    {
        var bytes = RandomNumberGenerator.GetBytes(64);
        var token = Convert.ToBase64String(bytes);
        return RefreshToken.Create(userId, token, DateTime.UtcNow.AddDays(RefreshDays), ip);
    }

    public ClaimsPrincipal? ValidateExpiredToken(string token)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(SecretKey));
        var handler = new JwtSecurityTokenHandler();
        try
        {
            return handler.ValidateToken(token, new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey        = key,
                ValidateIssuer          = false,
                ValidateAudience        = false,
                ValidateLifetime        = false,   // allow expired
            }, out _);
        }
        catch { return null; }
    }
}
