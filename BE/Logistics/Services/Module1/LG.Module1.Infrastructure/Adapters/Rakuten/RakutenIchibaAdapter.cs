using LG.Module1.Domain.Adapters;
using LG.Module1.Domain.Entities;
using LG.Module1.Domain.Exceptions;
using LG.Module1.Infrastructure.Adapters.Common;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System.Net;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace LG.Module1.Infrastructure.Adapters.Rakuten;

/// Adapter cho Rakuten Ichiba — chỉ cần ApplicationId, không cần OAuth.
/// API doc: https://webservice.rakuten.co.jp/documentation/ichiba-item-search
public partial class RakutenIchibaAdapter : IPlatformAdapter
{
    private readonly HttpClient _http;
    private readonly RakutenOptions _opts;
    private readonly ILogger<RakutenIchibaAdapter> _logger;

    private const string SearchEndpoint = "/IchibaItem/Search/20260401";

    public RakutenIchibaAdapter(
        HttpClient http,
        IOptions<RakutenOptions> opts,
        ILogger<RakutenIchibaAdapter> logger)
    {
        _http = http;
        _opts = opts.Value;
        _logger = logger;

        if (_http.BaseAddress is null)
            _http.BaseAddress = new Uri(_opts.BaseUrl);

        _http.Timeout = TimeSpan.FromSeconds(_opts.TimeoutSeconds);
    }

    public string PlatformName => "Rakuten";
    public ApiProvider Provider => ApiProvider.PublicApi;

    // ── Search ────────────────────────────────────────────────────────────────
    public async Task<List<RawProductResult>> SearchAsync(
        string keyword, int page, int pageSize, CancellationToken ct = default)
    {
        EnsureConfigured();

        if (string.IsNullOrWhiteSpace(keyword))
            return [];

        // Rakuten cap pageSize = 30
        var hits = Math.Min(Math.Max(pageSize, 1), 30);
        var pg = Math.Max(page, 1);

        var url = $"{SearchEndpoint}?applicationId={_opts.ApplicationId}" +
                  $"&keyword={Uri.EscapeDataString(keyword)}" +
                  $"&hits={hits}&page={pg}&format=json";

        if (!string.IsNullOrEmpty(_opts.AffiliateId))
            url += $"&affiliateId={_opts.AffiliateId}";

        var response = await SendAsync(url, ct);
        var parsed = await ParseAsync<RakutenSearchResponse>(response, ct);

        if (parsed?.Items is null || parsed.Items.Count == 0)
            return [];

        return parsed.Items
            .Select(w => MapToRaw(w.Item))
            .Where(r => r is not null)
            .ToList()!;
    }

    // ── Get Detail ────────────────────────────────────────────────────────────
    public async Task<RawProductResult?> GetDetailAsync(
        string platformProductId, CancellationToken ct = default)
    {
        EnsureConfigured();

        // Rakuten không có endpoint detail riêng — search bằng itemCode
        var url = $"{SearchEndpoint}?applicationId={_opts.ApplicationId}" +
                  $"&itemCode={Uri.EscapeDataString(platformProductId)}&format=json";

        var response = await SendAsync(url, ct);
        var parsed = await ParseAsync<RakutenSearchResponse>(response, ct);

        var item = parsed?.Items?.FirstOrDefault()?.Item;
        if (item is null)
            throw new AdapterNotFoundException(PlatformName, platformProductId);

        return MapToRaw(item);
    }

    // ── Extract ID from URL ───────────────────────────────────────────────────
    public string? ExtractIdFromUrl(string url)
    {
        if (string.IsNullOrWhiteSpace(url)) return null;

        // Rakuten URL: https://item.rakuten.co.jp/{shopCode}/{itemCode}/
        // hoặc        https://item.rakuten.co.jp/{shopCode}/{itemCode}
        var match = RakutenUrlRegex().Match(url);
        if (!match.Success) return null;

        var shopCode = match.Groups["shop"].Value;
        var itemCode = match.Groups["item"].Value.TrimEnd('/');

        // ItemCode trong API có format: "shopCode:itemCode"
        return $"{shopCode}:{itemCode}";
    }

    [GeneratedRegex(@"item\.rakuten\.co\.jp/(?<shop>[^/]+)/(?<item>[^/?]+)", RegexOptions.IgnoreCase)]
    private static partial Regex RakutenUrlRegex();

    // ── Mapping ───────────────────────────────────────────────────────────────
    private RawProductResult? MapToRaw(RakutenItem item)
    {
        if (string.IsNullOrEmpty(item.ItemCode) || string.IsNullOrEmpty(item.ItemName))
        {
            _logger.LogWarning("Rakuten item thiếu ItemCode hoặc ItemName, bỏ qua.");
            return null;
        }

        // Ưu tiên medium > small. Mỗi loại trả nhiều ảnh.
        var images = item.MediumImages
            .Concat(item.SmallImages)
            .Select(w => w.ImageUrl)
            .Where(u => !string.IsNullOrEmpty(u))
            .Distinct()
            .ToList();

        if (images.Count == 0)
        {
            _logger.LogWarning("Rakuten item {Code} không có ảnh, bỏ qua.", item.ItemCode);
            return null;
        }

        return new RawProductResult(
            PlatformProductId: item.ItemCode,
            Title: item.ItemName,
            PriceOriginal: item.ItemPrice,
            CurrencyCode: "JPY",
            ProductUrl: item.ItemUrl,
            ImageUrls: images,
            ShopIdOnPlatform: item.ShopCode,
            ShopName: item.ShopName,
            ShopUrl: item.ShopUrl,
            CategoryNameOriginal: item.GenreId,
            Rating: item.ReviewAverage,
            ReviewCount: item.ReviewCount,
            SoldCount: null,   // Rakuten không trả sold count qua API
            ShipsInternationally: item.ShipOverseasFlag == 1,
            Description: item.ItemCaption,
            Variants: null    // Rakuten không trả variant qua search API
        );
    }

    // ── HTTP helpers ──────────────────────────────────────────────────────────
    private void EnsureConfigured()
    {
        if (string.IsNullOrEmpty(_opts.ApplicationId))
            throw new AdapterNotConfiguredException(PlatformName);
    }

    private async Task<HttpResponseMessage> SendAsync(string relativeUrl, CancellationToken ct)
    {
        try
        {
            var response = await _http.GetAsync(relativeUrl, ct);

            // 429 Too Many Requests
            if (response.StatusCode == HttpStatusCode.TooManyRequests)
            {
                int? retryAfter = null;
                if (response.Headers.TryGetValues("Retry-After", out var values)
                    && int.TryParse(values.FirstOrDefault(), out var ra))
                    retryAfter = ra;
                throw new AdapterRateLimitException(PlatformName, retryAfter);
            }

            if (response.StatusCode == HttpStatusCode.Unauthorized
             || response.StatusCode == HttpStatusCode.Forbidden)
                throw new AdapterAuthException(PlatformName,
                    $"Rakuten từ chối request. Status: {response.StatusCode}");

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
        var stream = await response.Content.ReadAsStreamAsync(ct);
        return await JsonSerializer.DeserializeAsync<T>(stream,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true },
            ct);
    }
}