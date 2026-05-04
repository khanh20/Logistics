using System.Net.Http.Headers;
using System.Text;
using System.Text.Json.Serialization;
using LG.Module1.Domain.Exceptions;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace LG.Module1.Infrastructure.Adapters.Ebay;

/// Quản lý OAuth Application Access Token cho eBay.
/// Token sống 7200s (2 giờ) — cache lại để không gọi /token mỗi request.
/// Auto-refresh trước khi expire 5 phút để tránh race condition.
public interface IEbayTokenService
{
    Task<string> GetAccessTokenAsync(CancellationToken ct = default);
}

public class EbayTokenService : IEbayTokenService
{
    private const string CacheKey = "ebay_access_token";
    private const string TokenEndpoint = "/identity/v1/oauth2/token";
    private const string PublicScope = "https://api.ebay.com/oauth/api_scope";
    private static readonly TimeSpan ExpiryBuffer = TimeSpan.FromMinutes(5);

    private readonly HttpClient _http;
    private readonly EbayOptions _opts;
    private readonly IMemoryCache _cache;
    private readonly ILogger<EbayTokenService> _logger;
    private readonly SemaphoreSlim _refreshLock = new(1, 1);

    public EbayTokenService(
        HttpClient http,
        IOptions<EbayOptions> opts,
        IMemoryCache cache,
        ILogger<EbayTokenService> logger)
    {
        _http = http;
        _opts = opts.Value;
        _cache = cache;
        _logger = logger;

        if (_http.BaseAddress is null)
            _http.BaseAddress = new Uri(_opts.BaseUrl);
        _http.Timeout = TimeSpan.FromSeconds(_opts.TimeoutSeconds);
    }

    public async Task<string> GetAccessTokenAsync(CancellationToken ct = default)
    {
        if (string.IsNullOrEmpty(_opts.ClientId) || string.IsNullOrEmpty(_opts.ClientSecret))
            throw new AdapterNotConfiguredException("eBay");

        if (_cache.TryGetValue(CacheKey, out string? cached) && !string.IsNullOrEmpty(cached))
            return cached!;

        // Lock — tránh nhiều thread cùng gọi /token khi cache expire
        await _refreshLock.WaitAsync(ct);
        try
        {
            // Double-check sau khi acquire lock
            if (_cache.TryGetValue(CacheKey, out string? cachedAfter) && !string.IsNullOrEmpty(cachedAfter))
                return cachedAfter!;

            return await MintAndCacheAsync(ct);
        }
        finally
        {
            _refreshLock.Release();
        }
    }

    private async Task<string> MintAndCacheAsync(CancellationToken ct)
    {
        var creds = $"{_opts.ClientId}:{_opts.ClientSecret}";
        var basicAuth = Convert.ToBase64String(Encoding.UTF8.GetBytes(creds));

        using var req = new HttpRequestMessage(HttpMethod.Post, TokenEndpoint)
        {
            Content = new FormUrlEncodedContent(new[]
            {
                new KeyValuePair<string, string>("grant_type", "client_credentials"),
                new KeyValuePair<string, string>("scope",      PublicScope),
            })
        };
        req.Headers.Authorization = new AuthenticationHeaderValue("Basic", basicAuth);

        try
        {
            var response = await _http.SendAsync(req, ct);
            var body = await response.Content.ReadAsStringAsync(ct);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("eBay token mint failed: {Status} {Body}", response.StatusCode, body);
                throw new AdapterAuthException("eBay",
                    $"Không lấy được access token: HTTP {(int)response.StatusCode}");
            }

            var parsed = System.Text.Json.JsonSerializer.Deserialize<EbayTokenResponse>(body);
            if (parsed is null || string.IsNullOrEmpty(parsed.AccessToken))
                throw new AdapterAuthException("eBay", "Response không chứa access_token.");

            // Cache với buffer 5 phút trước khi thực sự hết hạn
            var ttl = TimeSpan.FromSeconds(parsed.ExpiresIn) - ExpiryBuffer;
            if (ttl <= TimeSpan.Zero) ttl = TimeSpan.FromMinutes(1);

            _cache.Set(CacheKey, parsed.AccessToken, ttl);

            _logger.LogInformation("eBay access token minted, valid for {Seconds}s", parsed.ExpiresIn);
            return parsed.AccessToken;
        }
        catch (TaskCanceledException) when (!ct.IsCancellationRequested)
        {
            throw new AdapterTimeoutException("eBay");
        }
    }

    private class EbayTokenResponse
    {
        [JsonPropertyName("access_token")] public string AccessToken { get; set; } = "";
        [JsonPropertyName("expires_in")] public int ExpiresIn { get; set; }
        [JsonPropertyName("token_type")] public string TokenType { get; set; } = "";
    }
}