using LG.Module1.ApplicationServices.DTOs.Platform;
using LG.Module1.ApplicationServices.Interfaces;
using LG.Module1.Domain.Entities;
using LG.Module1.Domain.Exceptions;
using LG.Module1.Domain.Repositories;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.Extensions.Logging;

namespace LG.Module1.ApplicationServices.Services;

public class PlatformService(
    IPlatformRepository platformRepo,
    IPlatformShopRepository shopRepo,
    IPlatformAccountRepository accountRepo,
    IModule1UnitOfWork uow,
    IDataProtectionProvider dataProtection,
    ILogger<PlatformService> logger
) : IPlatformService
{
    private IDataProtector Protector =>
        dataProtection.CreateProtector("LG.Module1.PlatformCredentials");

    // ── Platform ──────────────────────────────────────────────────────────────

    public async Task<List<PlatformResponse>> GetAllAsync(CancellationToken ct = default)
    {
        var platforms = await platformRepo.GetAllAsync(ct);
        return platforms.Select(PlatformMapper.ToResponse).ToList();
    }

    public async Task<List<PlatformSlimResponse>> GetAllActiveAsync(CancellationToken ct = default)
    {
        var platforms = await platformRepo.GetAllActiveAsync(ct);
        return platforms.Select(PlatformMapper.ToSlim).ToList();
    }

    public async Task<PlatformResponse> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var platform = await platformRepo.GetByIdAsync(id, ct)
                       ?? throw new PlatformNotFoundException(id);
        return PlatformMapper.ToResponse(platform);
    }

    public async Task<PlatformResponse> CreateAsync(CreatePlatformRequest req, CancellationToken ct = default)
    {
        if (!Enum.TryParse<ApiProvider>(req.ApiProvider, ignoreCase: true, out var provider))
            throw new ArgumentException($"ApiProvider không hợp lệ: {req.ApiProvider}. Dùng: Apify, PublicApi, Manual");

        var platform = Platform.Create(req.Name, req.BaseUrl, provider, logoUrl: req.LogoUrl);
        await platformRepo.AddAsync(platform, ct);
        await uow.SaveChangesAsync(ct);

        logger.LogInformation("Platform created: {Name}", platform.Name);
        return PlatformMapper.ToResponse(platform);
    }

    public async Task<PlatformResponse> UpdateAsync(Guid id, UpdatePlatformRequest req, CancellationToken ct = default)
    {
        var platform = await platformRepo.GetByIdAsync(id, ct)
                       ?? throw new PlatformNotFoundException(id);

        if (!Enum.TryParse<ApiProvider>(req.ApiProvider, ignoreCase: true, out var provider))
            throw new ArgumentException($"ApiProvider không hợp lệ: {req.ApiProvider}");

        platform.Update(req.Name, req.BaseUrl, provider, req.IsActive);
        platform.SetLogoUrl(req.LogoUrl);

        await platformRepo.UpdateAsync(platform, ct);
        await uow.SaveChangesAsync(ct);

        logger.LogInformation("Platform updated: {Id} → {Name}", id, req.Name);
        return PlatformMapper.ToResponse(platform);
    }

    public async Task SetCredentialsAsync(Guid id, SetCredentialsRequest req, CancellationToken ct = default)
    {
        var platform = await platformRepo.GetByIdAsync(id, ct)
                       ?? throw new PlatformNotFoundException(id);

        // Encrypt trước khi lưu — không bao giờ lưu plaintext vào DB
        var encryptedKey = Protector.Protect(req.ApiKey);
        var encryptedSecret = req.ApiSecret is not null
            ? Protector.Protect(req.ApiSecret)
            : null;

        platform.SetCredentials(encryptedKey, encryptedSecret);
        await platformRepo.UpdateAsync(platform, ct);
        await uow.SaveChangesAsync(ct);

        // Log KHÔNG ghi key/secret — chỉ ghi platformId
        logger.LogInformation("Credentials updated for platform: {Id}", id);
    }

    // ── PlatformShop ──────────────────────────────────────────────────────────

    public async Task<List<PlatformShopResponse>> GetShopsByPlatformAsync(Guid platformId, CancellationToken ct = default)
    {
        var platform = await platformRepo.GetByIdAsync(platformId, ct)
                       ?? throw new PlatformNotFoundException(platformId);

        var shops = await shopRepo.GetByPlatformAsync(platformId, ct);
        return shops.Select(s => PlatformMapper.ToShopResponse(s, platform.Name)).ToList();
    }

    public async Task<PlatformShopResponse> GetShopByIdAsync(Guid shopId, CancellationToken ct = default)
    {
        var shop = await shopRepo.GetByIdAsync(shopId, ct)
                   ?? throw new PlatformNotFoundException(shopId);
        var platformName = shop.Platform?.Name ?? string.Empty;
        return PlatformMapper.ToShopResponse(shop, platformName);
    }

    public async Task BlacklistShopAsync(Guid shopId, BlacklistShopRequest req, Guid staffId, CancellationToken ct = default)
    {
        var shop = await shopRepo.GetByIdAsync(shopId, ct)
                   ?? throw new PlatformNotFoundException(shopId);

        if (shop.IsBlacklisted)
        {
            logger.LogWarning("Shop {ShopId} is already blacklisted.", shopId);
            return;  // idempotent
        }

        shop.Blacklist(req.Reason);
        await shopRepo.UpdateAsync(shop, ct);
        await uow.SaveChangesAsync(ct);

        logger.LogInformation("Shop blacklisted: {ShopId} ({ShopName}) by staff {StaffId}. Reason: {Reason}",
            shopId, shop.ShopName, staffId, req.Reason);
    }

    public async Task UnblacklistShopAsync(Guid shopId, CancellationToken ct = default)
    {
        var shop = await shopRepo.GetByIdAsync(shopId, ct)
                   ?? throw new PlatformNotFoundException(shopId);

        if (!shop.IsBlacklisted) return;  // idempotent

        shop.Unblacklist();
        await shopRepo.UpdateAsync(shop, ct);
        await uow.SaveChangesAsync(ct);

        logger.LogInformation("Shop unblacklisted: {ShopId} ({ShopName})", shopId, shop.ShopName);
    }

    public async Task UpdateShopRatingAsync(Guid shopId, decimal rating, CancellationToken ct = default)
    {
        var shop = await shopRepo.GetByIdAsync(shopId, ct)
                   ?? throw new PlatformNotFoundException(shopId);

        shop.UpdateRating(rating);
        await shopRepo.UpdateAsync(shop, ct);
        await uow.SaveChangesAsync(ct);
    }

    // ── PlatformAccount ───────────────────────────────────────────────────────

    public async Task<List<PlatformAccountSummaryResponse>> GetAccountsByPlatformAsync(Guid platformId, CancellationToken ct = default)
    {
        var platform = await platformRepo.GetByIdAsync(platformId, ct)
                       ?? throw new PlatformNotFoundException(platformId);

        var accounts = await accountRepo.GetByPlatformAsync(platformId, ct);
        return accounts.Select(a => PlatformMapper.ToAccountResponse(a, platform.Name)).ToList();
    }

    public async Task<PlatformAccountSummaryResponse?> GetAvailableAccountAsync(
        Guid platformId, decimal requiredAmountCny, CancellationToken ct = default)
    {
        var platform = await platformRepo.GetByIdAsync(platformId, ct)
                       ?? throw new PlatformNotFoundException(platformId);

        // Repo đã sort theo DailySpentToday asc — account ít dùng nhất được ưu tiên
        var account = await accountRepo.GetAvailableAccountAsync(platformId, requiredAmountCny, ct);
        if (account is null) return null;

        return PlatformMapper.ToAccountResponse(account, platform.Name);
    }

    public async Task<PlatformAccountSummaryResponse> CreateAccountAsync(
        CreatePlatformAccountRequest req, CancellationToken ct = default)
    {
        var platform = await platformRepo.GetByIdAsync(req.PlatformId, ct)
                       ?? throw new PlatformNotFoundException(req.PlatformId);

        // Encrypt password trước khi lưu — không lưu plaintext
        var encryptedPassword = Protector.Protect(req.PasswordEncrypted);

        var account = PlatformAccount.Create(
            req.PlatformId, req.Username, req.DailySpendLimit, encryptedPassword);

        await accountRepo.AddAsync(account, ct);
        await uow.SaveChangesAsync(ct);

        logger.LogInformation("Platform account created: {Username} for platform {PlatformId}",
            req.Username, req.PlatformId);

        return PlatformMapper.ToAccountResponse(account, platform.Name);
    }

    public async Task FreezeAccountAsync(Guid accountId, CancellationToken ct = default)
    {
        var account = await GetAccountOrThrowAsync(accountId, ct);
        if (account.IsFrozen) return;  // idempotent
        account.Freeze();
        await accountRepo.UpdateAsync(account, ct);
        await uow.SaveChangesAsync(ct);
        logger.LogInformation("Account frozen: {AccountId}", accountId);
    }

    public async Task UnfreezeAccountAsync(Guid accountId, CancellationToken ct = default)
    {
        var account = await GetAccountOrThrowAsync(accountId, ct);
        if (!account.IsFrozen) return;  // idempotent
        account.Unfreeze();
        await accountRepo.UpdateAsync(account, ct);
        await uow.SaveChangesAsync(ct);
        logger.LogInformation("Account unfrozen: {AccountId}", accountId);
    }

    public async Task UpdateBalanceAsync(Guid accountId, UpdateAccountBalanceRequest req, CancellationToken ct = default)
    {
        var account = await GetAccountOrThrowAsync(accountId, ct);
        account.UpdateBalance(req.AlipayBalance);
        await accountRepo.UpdateAsync(account, ct);
        await uow.SaveChangesAsync(ct);
        logger.LogInformation("Account balance updated: {AccountId} → {Balance} CNY",
            accountId, req.AlipayBalance);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private async Task<PlatformAccount> GetAccountOrThrowAsync(Guid accountId, CancellationToken ct)
    {
        var accounts = await accountRepo.GetByIdAsync(accountId, ct);
        return accounts ?? throw new PlatformNotFoundException(accountId);
    }
}