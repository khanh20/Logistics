using System.ComponentModel.DataAnnotations;
using LG.Module1.Domain.Entities;

namespace LG.Module1.ApplicationServices.DTOs.Platform;

// ── Platform Responses ────────────────────────────────────────────────────────
public record PlatformResponse(
    Guid Id,
    string Name,
    string BaseUrl,
    string ApiProvider,
    bool IsActive,
    string? LogoUrl,
    int ShopCount,
    int AccountCount
);

public record PlatformSlimResponse(Guid Id, string Name, string ApiProvider, bool IsActive, string? LogoUrl);

// ── PlatformShop Responses ────────────────────────────────────────────────────
public record PlatformShopResponse(
    Guid Id,
    Guid PlatformId,
    string PlatformName,
    string ShopIdOnPlatform,
    string ShopName,
    string? ShopUrl,
    decimal InternalRating,
    int TotalProductsCrawled,
    decimal? AvgShipDays,
    decimal DisputeRate,
    bool IsBlacklisted,
    string? BlacklistReason,
    DateTime CreatedAt
);

// ── PlatformAccount Responses — KHÔNG bao giờ trả ApiKey/Secret ──────────────
public record PlatformAccountSummaryResponse(
    Guid Id,
    Guid PlatformId,
    string PlatformName,
    string Username,
    decimal AlipayBalance,
    decimal DailySpendLimit,
    decimal DailySpentToday,
    decimal RemainingTodayCapacity,
    bool IsFrozen,
    bool IsActive,
    DateTime? LastLoginAt
);

// ── Requests ──────────────────────────────────────────────────────────────────
public record CreatePlatformRequest(
    [Required, MaxLength(50)] string Name,
    [Required, MaxLength(255)] string BaseUrl,
    [Required] string ApiProvider,   // "Apify" | "PublicApi" | "Manual"
    [MaxLength(500)] string? LogoUrl
);

public record UpdatePlatformRequest(
    [Required, MaxLength(50)] string Name,
    [Required, MaxLength(255)] string BaseUrl,
    [Required] string ApiProvider,
    bool IsActive,
    [MaxLength(500)] string? LogoUrl
);

public record SetCredentialsRequest(
    [Required, MaxLength(500)] string ApiKey,
    [MaxLength(500)] string? ApiSecret
);

public record BlacklistShopRequest(
    [Required, MaxLength(500)] string Reason
);

public record CreatePlatformAccountRequest(
    [Required] Guid PlatformId,
    [Required, MaxLength(100)] string Username,
    [Required, MaxLength(500)] string PasswordEncrypted,
    [Range(0, 999999999)] decimal DailySpendLimit
);

public record UpdateAccountBalanceRequest(
    [Range(0, 999999999)] decimal AlipayBalance
);

// ── Mappers ───────────────────────────────────────────────────────────────────
public static class PlatformMapper
{
    public static PlatformResponse ToResponse(Domain.Entities.Platform p) => new(
        p.Id, p.Name, p.BaseUrl, p.ApiProvider.ToString(), p.IsActive, p.LogoUrl,
        ShopCount: p.Shops.Count,
        AccountCount: p.Accounts.Count
    );

    public static PlatformSlimResponse ToSlim(Domain.Entities.Platform p) =>
        new(p.Id, p.Name, p.ApiProvider.ToString(), p.IsActive, p.LogoUrl);

    public static PlatformShopResponse ToShopResponse(PlatformShop s, string platformName) => new(
        s.Id, s.PlatformId, platformName,
        s.ShopIdOnPlatform, s.ShopName, s.ShopUrl,
        s.InternalRating, s.TotalProductsCrawled, s.AvgShipDays, s.DisputeRate,
        s.IsBlacklisted, s.BlacklistReason, s.CreatedAt
    );

    public static PlatformAccountSummaryResponse ToAccountResponse(PlatformAccount a, string platformName) => new(
        a.Id, a.PlatformId, platformName,
        a.Username,
        a.AlipayBalance,
        a.DailySpendLimit,
        a.DailySpentToday,
        RemainingTodayCapacity: Math.Max(0, a.DailySpendLimit - a.DailySpentToday),
        a.IsFrozen, a.IsActive, a.LastLoginAt
    );
}