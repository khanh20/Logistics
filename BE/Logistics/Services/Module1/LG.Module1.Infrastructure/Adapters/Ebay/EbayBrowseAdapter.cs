using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.RegularExpressions;
using LG.Module1.Domain.Adapters;
using LG.Module1.Domain.Entities;
using LG.Module1.Domain.Exceptions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace LG.Module1.Infrastructure.Adapters.Ebay;


/// Adapter cho eBay Browse API.
/// API doc: https://developer.ebay.com/api-docs/buy/browse/overview.html
/// Đăng ký App: https://developer.ebay.com → Application Keys

public partial class EbayBrowseAdapter : IPlatformAdapter
{
    private readonly HttpClient _http;
    private readonly IEbayTokenService _tokenService;
    private readonly EbayOptions _opts;
    private readonly ILogger<EbayBrowseAdapter> _logger;

    private const string SearchEndpoint = "/buy/browse/v1/item_summary/search";
    private const string ItemEndpoint = "/buy/browse/v1/item";

    public EbayBrowseAdapter(
        HttpClient http,
        IEbayTokenService tokenService,
        IOptions<EbayOptions> opts,
        ILogger<EbayBrowseAdapter> logger)
    {
        _http = http;
        _tokenService = tokenService;
        _opts = opts.Value;
        _logger = logger;

        if (_http.BaseAddress is null)
            _http.BaseAddress = new Uri(_opts.BaseUrl);
        _http.Timeout = TimeSpan.FromSeconds(_opts.TimeoutSeconds);
    }

    public string PlatformName => "eBay";
    public ApiProvider Provider => ApiProvider.PublicApi;

    // ── Search ────────────────────────────────────────────────────────────────
    public async Task<List<RawProductResult>> SearchAsync(
        string keyword, int page, int pageSize, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(keyword))
            return [];

        // eBay limit cap = 200
        var limit = Math.Min(Math.Max(pageSize, 1), 200);
        var offset = Math.Max(page - 1, 0) * limit;

        var url = $"{SearchEndpoint}?q={Uri.EscapeDataString(keyword)}&limit={limit}&offset={offset}";

        var response = await SendAsync(url, ct);
        var parsed = await ParseAsync<EbaySearchResponse>(response, ct);

        if (parsed?.ItemSummaries is null || parsed.ItemSummaries.Count == 0)
            return [];

        return parsed.ItemSummaries
            .Select(MapSummaryToRaw)
            .Where(r => r is not null)
            .ToList()!;
    }

    // ── Get Detail ────────────────────────────────────────────────────────────
    public async Task<RawProductResult?> GetDetailAsync(
        string platformProductId, CancellationToken ct = default)
    {
        // eBay item ID có format: v1|123456789|0
        // Phải URL-encode pipe character
        var encodedId = Uri.EscapeDataString(platformProductId);
        var url = $"{ItemEndpoint}/{encodedId}";

        var response = await SendAsync(url, ct);

        if (response.StatusCode == HttpStatusCode.NotFound)
            throw new AdapterNotFoundException(PlatformName, platformProductId);

        var parsed = await ParseAsync<EbayItemDetailResponse>(response, ct);
        if (parsed is null)
            throw new AdapterNotFoundException(PlatformName, platformProductId);

        return MapDetailToRaw(parsed);
    }

    // ── Extract ID from URL ───────────────────────────────────────────────────
    public string? ExtractIdFromUrl(string url)
    {
        if (string.IsNullOrWhiteSpace(url)) return null;

        // eBay URL: https://www.ebay.com/itm/123456789012
        // hoặc      https://www.ebay.com/itm/Title-Words-Here/123456789012?...
        var match = EbayUrlRegex().Match(url);
        if (!match.Success) return null;

        var legacyId = match.Groups["id"].Value;

        // Browse API dùng ID format: v1|{legacyId}|0
        return $"v1|{legacyId}|0";
    }

    [GeneratedRegex(@"ebay\.com/itm/(?:[^/]+/)?(?<id>\d{10,15})", RegexOptions.IgnoreCase)]
    private static partial Regex EbayUrlRegex();

    // ── Mapping ───────────────────────────────────────────────────────────────
    private RawProductResult? MapSummaryToRaw(EbayItemSummary item)
    {
        if (string.IsNullOrEmpty(item.ItemId) || string.IsNullOrEmpty(item.Title))
        {
            _logger.LogWarning("eBay item thiếu ItemId hoặc Title, bỏ qua.");
            return null;
        }

        var images = new List<string>();
        if (!string.IsNullOrEmpty(item.Image?.ImageUrl))
            images.Add(item.Image.ImageUrl);
        if (item.AdditionalImages is not null)
            images.AddRange(item.AdditionalImages
                .Select(i => i.ImageUrl)
                .Where(u => !string.IsNullOrEmpty(u)));

        if (images.Count == 0)
        {
            _logger.LogWarning("eBay item {Id} không có ảnh, bỏ qua.", item.ItemId);
            return null;
        }

        var category = item.Categories?.FirstOrDefault()?.CategoryName;

        // Rating: eBay Browse trả feedbackPercentage cho seller, không phải product rating
        // Tạm dùng làm proxy cho product quality
        decimal? rating = null;
        if (decimal.TryParse(item.Seller?.FeedbackPercentage,
            System.Globalization.NumberStyles.Any,
            System.Globalization.CultureInfo.InvariantCulture, out var fb))
        {
            rating = Math.Round(fb / 20m, 2);   // 100% → 5.0
        }

        return new RawProductResult(
            PlatformProductId: item.ItemId,
            Title: item.Title,
            PriceOriginal: item.Price?.AsDecimal() ?? 0m,
            CurrencyCode: item.Price?.Currency ?? "USD",
            ProductUrl: item.AffiliateUrl ?? item.ItemWebUrl,
            ImageUrls: images,
            ShopIdOnPlatform: item.Seller?.Username ?? "unknown",
            ShopName: item.Seller?.Username ?? "Unknown Seller",
            ShopUrl: null,
            CategoryNameOriginal: category,
            Rating: rating,
            ReviewCount: item.Seller?.FeedbackScore,
            SoldCount: null,
            ShipsInternationally: null,
            Description: null,    // Summary không có description
            Variants: null
        );
    }

    private RawProductResult? MapDetailToRaw(EbayItemDetailResponse item)
    {
        var summary = MapSummaryToRaw(item);
        if (summary is null) return null;

        // Detail có thêm description
        return summary with { Description = item.Description ?? item.ShortDescription };
    }

    // ── HTTP helpers ──────────────────────────────────────────────────────────
    private async Task<HttpResponseMessage> SendAsync(string relativeUrl, CancellationToken ct)
    {
        var token = await _tokenService.GetAccessTokenAsync(ct);

        using var req = new HttpRequestMessage(HttpMethod.Get, relativeUrl);
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        req.Headers.Add("X-EBAY-C-MARKETPLACE-ID", _opts.MarketplaceId);

        if (!string.IsNullOrEmpty(_opts.AffiliateCampaignId))
            req.Headers.Add("X-EBAY-C-ENDUSERCTX",
                $"affiliateCampaignId={_opts.AffiliateCampaignId}");

        try
        {
            var response = await _http.SendAsync(req, ct);

            if (response.StatusCode == HttpStatusCode.TooManyRequests)
            {
                int? retryAfter = null;
                if (response.Headers.TryGetValues("Retry-After", out var values)
                    && int.TryParse(values.FirstOrDefault(), out var ra))
                    retryAfter = ra;
                throw new AdapterRateLimitException(PlatformName, retryAfter);
            }

            if (response.StatusCode == HttpStatusCode.Unauthorized)
            {
                _logger.LogError("eBay 401 — token có thể đã expire hoặc không hợp lệ.");
                throw new AdapterAuthException(PlatformName,
                    "Access token bị từ chối. Kiểm tra ClientId/ClientSecret.");
            }

            if (response.StatusCode == HttpStatusCode.NotFound)
                return response;   // Caller xử lý 404

            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync(ct);
                throw new AdapterUpstreamException(PlatformName,
                    $"HTTP {(int)response.StatusCode}: {body[..Math.Min(body.Length, 500)]}");
            }

            return response;
        }
        catch (TaskCanceledException) when (!ct.IsCancellationRequested)
        {
            throw new AdapterTimeoutException(PlatformName);
        }
        catch (HttpRequestException ex)
        {
            throw new AdapterUpstreamException(PlatformName, ex.Message, ex);
        }
    }

    private static async Task<T?> ParseAsync<T>(HttpResponseMessage response, CancellationToken ct)
    {
        if (response.StatusCode == HttpStatusCode.NotFound)
            return default;

        var stream = await response.Content.ReadAsStreamAsync(ct);
        return await JsonSerializer.DeserializeAsync<T>(stream,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true },
            ct);
    }
}