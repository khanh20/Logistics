using LG.Module1.ApplicationServices.DTOs.Ingestion;
using LG.Module1.ApplicationServices.DTOs.Product;
using LG.Module1.ApplicationServices.Interfaces;
using LG.Module1.Domain.Adapters;
using LG.Module1.Domain.Entities;
using LG.Module1.Domain.Exceptions;
using LG.Module1.Domain.Repositories;
using LG.Module1.Infrastructure.Adapters.Common;
using Microsoft.Extensions.Configuration.UserSecrets;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Logging;

namespace LG.Module1.ApplicationServices.Services;

public class ProductIngestionService(
    IEnumerable<IPlatformAdapter> adapters,
    IPlatformRepository platformRepo,
    IPlatformShopRepository shopRepo,
    IProductCategoryRepository categoryRepo,
    IProductRepository productRepo,
    IProductService productService,
    IModule1UnitOfWork uow,
    ILogger<ProductIngestionService> logger
) : IProductIngestionService
{
    ///Lookup adapter theo PlatformName, case-insensitive.
    private readonly Dictionary<string, IPlatformAdapter> _adapterByName =
        adapters.ToDictionary(a => a.PlatformName, StringComparer.OrdinalIgnoreCase);

    public List<string> GetAvailablePlatforms() =>
        _adapterByName.Keys.OrderBy(n => n).ToList();

    // ── Crawl by keyword ──────────────────────────────────────────────────────
    public async Task<CrawlResultResponse> CrawlByKeywordAsync(
        CrawlByKeywordRequest req, CancellationToken ct = default)
    {
        if (!_adapterByName.TryGetValue(req.PlatformName, out var adapter))
            throw new ArgumentException(
                $"Không có adapter cho platform '{req.PlatformName}'. " +
                $"Các platform khả dụng: {string.Join(", ", GetAvailablePlatforms())}");

        // Lookup Platform entity trong DB (cần để mapping shop)
        var platforms = await platformRepo.GetAllActiveAsync(ct);
        var platform = platforms.FirstOrDefault(p =>
            p.Name.Equals(req.PlatformName, StringComparison.OrdinalIgnoreCase))
            ?? throw new PlatformNotFoundException(req.PlatformName);

        // Validate category (nếu có) hoặc dùng default category đầu tiên
        var categoryId = await ResolveCategoryAsync(req.CategoryId, ct);

        // Gọi adapter
        logger.LogInformation("Crawling '{Platform}' for keyword '{Keyword}', max {Max}",
            req.PlatformName, req.Keyword, req.MaxResults);

        List<RawProductResult> rawResults;
        try
        {
            rawResults = await adapter.SearchAsync(req.Keyword, page: 1, pageSize: req.MaxResults, ct);
        }
        catch (AdapterException ex)
        {
            logger.LogError(ex, "Adapter '{Platform}' search failed", req.PlatformName);
            throw;   // Re-throw để middleware trả 4xx phù hợp
        }

        // Process từng raw result
        var items = new List<CrawlItemResult>();
        foreach (var raw in rawResults)
        {
            ct.ThrowIfCancellationRequested();
            var result = await ProcessSingleAsync(raw, platform, categoryId, ct);
            items.Add(result);
        }

        var saved = items.Count(i => i.Status is "Created" or "Updated");
        var forbidden = items.Count(i => i.Status == "Forbidden");
        var skipped = items.Count(i => i.Status is "Skipped" or "Error");

        logger.LogInformation(
            "Crawl done: {Found} found, {Saved} saved, {Forbidden} forbidden, {Skipped} skipped",
            rawResults.Count, saved, forbidden, skipped);

        return new CrawlResultResponse(
            PlatformName: req.PlatformName,
            Keyword: req.Keyword,
            TotalFound: rawResults.Count,
            Saved: saved,
            Skipped: skipped,
            Forbidden: forbidden,
            Items: items);
    }

    // ── Crawl by URL ──────────────────────────────────────────────────────────
    public async Task<CrawlUrlResultResponse> CrawlByUrlAsync(
        CrawlByUrlRequest req, CancellationToken ct = default)
    {
        // Detect platform — adapter nào extract được ID thì là platform đó
        IPlatformAdapter? adapter = null;
        string? platformProductId = null;

        foreach (var a in _adapterByName.Values)
        {
            var id = a.ExtractIdFromUrl(req.Url);
            if (id is not null)
            {
                adapter = a;
                platformProductId = id;
                break;
            }
        }

        if (adapter is null || platformProductId is null)
            throw new ArgumentException(
                $"URL không thuộc bất kỳ sàn nào hỗ trợ. " +
                $"Các sàn khả dụng: {string.Join(", ", GetAvailablePlatforms())}");

        var platforms = await platformRepo.GetAllActiveAsync(ct);
        var platform = platforms.FirstOrDefault(p =>
            p.Name.Equals(adapter.PlatformName, StringComparison.OrdinalIgnoreCase))
            ?? throw new PlatformNotFoundException(adapter.PlatformName);

        var categoryId = await ResolveCategoryAsync(req.CategoryId, ct);

        var raw = await adapter.GetDetailAsync(platformProductId, ct);
        if (raw is null)
            return new CrawlUrlResultResponse(adapter.PlatformName, platformProductId,
                null, "Skipped", "Adapter trả về null.");

        var result = await ProcessSingleAsync(raw, platform, categoryId, ct);

        return new CrawlUrlResultResponse(
            PlatformName: adapter.PlatformName,
            PlatformProductId: result.PlatformProductId,
            SavedProductId: result.SavedProductId,
            Status: result.Status,
            Reason: result.Reason);
    }

    // ── Core processing — 1 raw result → DB ──────────────────────────────────
    private async Task<CrawlItemResult> ProcessSingleAsync(
        RawProductResult raw, Platform platform, Guid categoryId, CancellationToken ct)
    {
        try
        {
            // 1. Resolve hoặc tạo PlatformShop
            var shop = await ResolveOrCreateShopAsync(platform, raw, ct);

            if (shop.IsBlacklisted)
            {
                logger.LogInformation("Skip product from blacklisted shop: {Shop}", shop.ShopName);
                return new CrawlItemResult(raw.PlatformProductId, raw.Title,
                    null, "Skipped", $"Shop '{shop.ShopName}' đang trong blacklist.");
            }

            // 2. Build UpsertProductRequest từ raw
            var slug = SlugHelper.GenerateSlug(raw.Title, raw.PlatformProductId);

            var upsertReq = new UpsertProductRequest(
                ShopId: shop.Id,
                CategoryId: categoryId,
                PlatformProductId: raw.PlatformProductId,
                OriginalTitle: raw.Title,
                Slug: slug,
                OriginalUrl: raw.ProductUrl,
                TranslatedTitle: null,                  
                SeoDescription: raw.Description,
                CrawlTaskId: null,
                Variants: new List<UpsertVariantRequest>
                {
                    // Mỗi sản phẩm tối thiểu 1 variant default chứa giá gốc
                    new(
                        VariantName:    "Default",
                        TranslatedName: null,
                        PriceCny:        ConvertToCny(raw.PriceOriginal, raw.CurrencyCode),
                        SkuIdOnPlatform: raw.PlatformProductId,
                        StockRaw:        null,
                        ImageUrl:        raw.ImageUrls.FirstOrDefault(),
                        SortOrder:       0,
                        PriceTiers:      new List<UpsertPriceTierRequest>())
                },
                Images: raw.ImageUrls.Select((url, idx) => new UpsertImageRequest(
                    SourceUrl: url,
                    IsPrimary: idx == 0,
                    SortOrder: idx,
                    SourceUrlHash: HashHelper.ComputeUrlHash(url))).ToList(),
                Attributes: BuildAttributesFromRaw(raw)
            );

            // 3. Check sản phẩm tồn tại chưa? Để phân biệt Created vs Updated
            var existing = await productRepo.GetByPlatformProductIdAsync(
                shop.Id, raw.PlatformProductId, ct);
            var isNew = existing is null;

            // 4. Upsert
            var saved = await productService.UpsertFromRawAsync(upsertReq, ct);

            // Forbidden được set bởi UpsertFromRawAsync nếu match keyword cấm
            if (saved.IsForbidden)
            {
                return new CrawlItemResult(raw.PlatformProductId, raw.Title,
                    saved.Id, "Forbidden",
                    $"Sản phẩm vi phạm danh mục cấm: {saved.ForbiddenReason}");
            }

            return new CrawlItemResult(raw.PlatformProductId, raw.Title,
                saved.Id, isNew ? "Created" : "Updated", null);
        }
        catch (AdapterException)
        {
            throw;   // Adapter exceptions bubble up
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Process raw product failed: {Id}", raw.PlatformProductId);
            return new CrawlItemResult(raw.PlatformProductId, raw.Title,
                null, "Error", ex.Message);
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    private async Task<Guid> ResolveCategoryAsync(Guid? categoryId, CancellationToken ct)
    {
        if (categoryId.HasValue)
        {
            var cat = await categoryRepo.GetByIdAsync(categoryId.Value, ct)
                      ?? throw new ArgumentException($"Category '{categoryId}' không tồn tại.");
            return cat.Id;
        }

        // Fallback: lấy category đầu tiên active
        var all = await categoryRepo.GetAllAsync(activeOnly: true, ct);
        var fallback = all.FirstOrDefault()
            ?? throw new InvalidOperationException("Không có category nào active.");
        return fallback.Id;
    }

    private async Task<PlatformShop> ResolveOrCreateShopAsync(
        Platform platform, RawProductResult raw, CancellationToken ct)
    {
        var shop = await shopRepo.GetByExternalIdAsync(platform.Id, raw.ShopIdOnPlatform, ct);
        if (shop is not null) return shop;

        // Auto-create shop khi gặp lần đầu
        shop = PlatformShop.Create(platform.Id, raw.ShopIdOnPlatform, raw.ShopName, raw.ShopUrl);
        await shopRepo.AddAsync(shop, ct);
        await uow.SaveChangesAsync(ct);

        logger.LogInformation("Auto-created shop: {Name} ({ExtId}) on {Platform}",
            raw.ShopName, raw.ShopIdOnPlatform, platform.Name);
        return shop;
    }

    ///
    /// Convert giá từ currency gốc → CNY (đơn vị chuẩn của catalog).
    /// VND/USD/JPY/EUR → CNY qua tỉ giá cứng. Production nên dùng exchange rate service.
    
    private static decimal ConvertToCny(decimal price, string currency)
    {
        // Tỉ giá xấp xỉ — chỉ cho ingestion, đơn hàng thật dùng ExchangeRateService
        var rate = currency.ToUpperInvariant() switch
        {
            "CNY" => 1m,
            "USD" => 7.2m,        // 1 USD ≈ 7.2 CNY
            "JPY" => 0.048m,      // 1 JPY ≈ 0.048 CNY
            "EUR" => 7.8m,
            "GBP" => 9.1m,
            "VND" => 0.000295m,   // 1 VND ≈ 0.000295 CNY
            _ => 1m,
        };
        return Math.Round(price * rate, 2);
    }

    private static List<UpsertAttributeRequest> BuildAttributesFromRaw(RawProductResult raw)
    {
        var attrs = new List<UpsertAttributeRequest>();
        var order = 0;

        if (raw.Rating.HasValue)
            attrs.Add(new UpsertAttributeRequest(
                KeyCn: null, KeyVn: "Đánh giá",
                ValueCn: null, ValueVn: $"{raw.Rating.Value:F1}/5",
                SortOrder: order++));

        if (raw.ReviewCount.HasValue)
            attrs.Add(new UpsertAttributeRequest(
                KeyCn: null, KeyVn: "Số đánh giá",
                ValueCn: null, ValueVn: raw.ReviewCount.Value.ToString(),
                SortOrder: order++));

        if (raw.SoldCount.HasValue)
            attrs.Add(new UpsertAttributeRequest(
                KeyCn: null, KeyVn: "Đã bán",
                ValueCn: null, ValueVn: raw.SoldCount.Value.ToString(),
                SortOrder: order++));

        if (raw.ShipsInternationally is true)
            attrs.Add(new UpsertAttributeRequest(
                KeyCn: null, KeyVn: "Ship quốc tế",
                ValueCn: null, ValueVn: "Có",
                SortOrder: order++));

        if (!string.IsNullOrEmpty(raw.CategoryNameOriginal))
            attrs.Add(new UpsertAttributeRequest(
                KeyCn: null, KeyVn: "Danh mục gốc",
                ValueCn: null, ValueVn: raw.CategoryNameOriginal,
                SortOrder: order++));

        return attrs;
    }
}