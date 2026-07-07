using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using LG.Module2.ApplicationServices.DTOs.Carrier;
using LG.Module2.ApplicationServices.DTOs.Delivery;
using LG.Module2.ApplicationServices.Interfaces;
using LG.Module2.Domain.Entities;
using Microsoft.Extensions.Logging;

namespace LG.Module2.ApplicationServices.Services.Carrier;

/// Tích hợp API GHTK thật (services.giaohangtietkiem.vn).
/// Docs: https://api.ghtk.vn/en/docs/submit-order/
public class GhtkCarrierGateway(
    HttpClient httpClient,
    GhtkOptions options,
    ILogger<GhtkCarrierGateway> logger
) : ICarrierGateway
{
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNamingPolicy   = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    public bool IsFallback => false;

    // Chỉ nhận GHTK khi đã cấu hình Token/ClientSource; chưa cấu hình → để stub lo (dev).
    public bool Supports(string carrierName) =>
        options.Enabled && carrierName.Trim().Equals("GHTK", StringComparison.OrdinalIgnoreCase);

    // ── Báo giá: GET /services/shipment/fee ──────────────────────────────────────
    public async Task<CarrierQuote> QuoteAsync(CarrierShipmentContext ctx, CancellationToken ct = default)
    {
        var weightGram = Math.Max(1, (int)Math.Ceiling(ctx.WeightKg * 1000));
        var query = new Dictionary<string, string?>
        {
            ["pick_province"] = options.PickProvince,
            ["pick_district"] = options.PickDistrict,
            ["province"]      = ctx.Province,
            ["district"]      = ctx.District,
            ["address"]       = ctx.Address,
            ["weight"]        = weightGram.ToString(),
            ["value"]         = ((long)ctx.ValueVnd).ToString(),
            ["transport"]     = "road",
        };
        var url = "/services/shipment/fee" + ToQueryString(query);

        using var req = new HttpRequestMessage(HttpMethod.Get, url);
        AddAuthHeaders(req);

        var res  = await httpClient.SendAsync(req, ct);
        var body = await res.Content.ReadAsStringAsync(ct);
        var dto  = Deserialize<GhtkFeeResponse>(body);

        if (dto is not { Success: true } || dto.Fee is null)
            throw new InvalidOperationException($"GHTK báo giá thất bại: {dto?.Message ?? body}");

        logger.LogInformation("[GHTK] quote {Weight}g → fee={Fee}, insurance={Ins}",
            weightGram, dto.Fee.Fee, dto.Fee.InsuranceFee);

        return new CarrierQuote(dto.Fee.Fee, dto.Fee.InsuranceFee);
    }

    // ── Tạo đơn: POST /services/shipment/order/?ver=1.5 ──────────────────────────
    public async Task<CarrierWaybillResult> CreateWaybillAsync(CarrierShipmentContext ctx, CancellationToken ct = default)
    {
        var payload = new GhtkOrderRequest
        {
            Products = ctx.Items.Select(i => new GhtkProduct
            {
                Name     = i.Name,
                Weight   = i.WeightKg,
                Quantity = i.Quantity,
            }).ToList(),
            Order = new GhtkOrder
            {
                Id           = ctx.PartnerOrderCode,
                PickName     = options.PickName,
                PickAddress  = options.PickAddress,
                PickProvince = options.PickProvince,
                PickDistrict = options.PickDistrict,
                PickWard     = string.IsNullOrWhiteSpace(options.PickWard) ? null : options.PickWard,
                PickTel      = options.PickTel,
                Name         = ctx.RecipientName,
                Address      = ctx.Address,
                Province     = ctx.Province,
                District     = ctx.District,
                Ward         = ctx.Ward,
                Hamlet       = "Khác",
                Tel          = ctx.RecipientTel,
                IsFreeship   = 0,
                PickMoney    = (long)(ctx.CodAmount ?? 0m),
                Value        = (long)ctx.ValueVnd,
                Transport    = "road",
            },
        };

        using var req = new HttpRequestMessage(HttpMethod.Post, "/services/shipment/order/?ver=1.5")
        {
            Content = JsonContent.Create(payload, options: JsonOpts),
        };
        AddAuthHeaders(req);

        var res  = await httpClient.SendAsync(req, ct);
        var body = await res.Content.ReadAsStringAsync(ct);
        var dto  = Deserialize<GhtkOrderResponse>(body);

        if (dto is not { Success: true } || dto.Order is null || string.IsNullOrWhiteSpace(dto.Order.Label))
            throw new InvalidOperationException($"GHTK tạo đơn thất bại: {dto?.Message ?? body}");

        logger.LogInformation("[GHTK] order created: label={Label}, fee={Fee}", dto.Order.Label, dto.Order.Fee);

        decimal? fee = decimal.TryParse(dto.Order.Fee, out var f) ? f : null;
        return new CarrierWaybillResult(dto.Order.Label!, fee, dto.Order.EstimatedDeliverTime);
    }

    // ── Map status_id GHTK → enum nội bộ ─────────────────────────────────────────
    // Bảng mã GHTK: -1 huỷ, 1-2 tiếp nhận, 3 đã lấy, 4 đang giao, 5-6 đã giao,
    // 7-8 lỗi lấy hàng, 9 giao thất bại, 10 hoãn giao, 11/13/20/21 trả hàng, 12 đang lấy.
    public DomesticWaybillStatus MapStatus(string rawStatus) => rawStatus.Trim() switch
    {
        "-1"               => DomesticWaybillStatus.Cancelled,
        "1" or "2"         => DomesticWaybillStatus.Created,
        "12"               => DomesticWaybillStatus.PickedUp,
        "3"                => DomesticWaybillStatus.PickedUp,
        "4"                => DomesticWaybillStatus.OutForDelivery,
        "5" or "6"         => DomesticWaybillStatus.Delivered,
        "9"                => DomesticWaybillStatus.DeliveryFailed,
        "7" or "8" or "10" => DomesticWaybillStatus.InTransit,
        "11" or "13" or "20" or "21" => DomesticWaybillStatus.Returned,
        _ => DomesticWaybillStatus.InTransit,
    };

    // GHTK xác thực webhook bằng token (đặt ở partner). secret từ DB ưu tiên, fallback config.
    public bool VerifySignature(string? secret, CarrierWebhookRequest payload)
    {
        var expected = !string.IsNullOrEmpty(secret) ? secret : options.WebhookToken;
        if (string.IsNullOrEmpty(expected)) return true;   // chưa cấu hình → bỏ qua (dev)
        return string.Equals(expected, payload.Signature, StringComparison.Ordinal);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────────
    private void AddAuthHeaders(HttpRequestMessage req)
    {
        req.Headers.TryAddWithoutValidation("Token", options.Token);
        if (!string.IsNullOrWhiteSpace(options.ClientSource))
            req.Headers.TryAddWithoutValidation("X-Client-Source", options.ClientSource);
    }

    private static T? Deserialize<T>(string body)
    {
        try { return JsonSerializer.Deserialize<T>(body, JsonOpts); }
        catch (JsonException) { return default; }
    }

    private static string ToQueryString(Dictionary<string, string?> q)
    {
        var pairs = q.Where(kv => !string.IsNullOrEmpty(kv.Value))
                     .Select(kv => $"{Uri.EscapeDataString(kv.Key)}={Uri.EscapeDataString(kv.Value!)}");
        var s = string.Join("&", pairs);
        return s.Length > 0 ? "?" + s : "";
    }

    // ── GHTK JSON models ─────────────────────────────────────────────────────────
    private sealed class GhtkFeeResponse
    {
        public bool Success { get; set; }
        public string? Message { get; set; }
        public GhtkFee? Fee { get; set; }
    }
    private sealed class GhtkFee
    {
        public string? Name { get; set; }
        public decimal Fee { get; set; }
        [JsonPropertyName("insurance_fee")] public decimal InsuranceFee { get; set; }
    }

    private sealed class GhtkOrderRequest
    {
        public List<GhtkProduct> Products { get; set; } = new();
        public GhtkOrder Order { get; set; } = new();
    }
    private sealed class GhtkProduct
    {
        public string Name { get; set; } = "";
        public decimal Weight { get; set; }
        public int Quantity { get; set; }
    }
    private sealed class GhtkOrder
    {
        public string Id { get; set; } = "";
        [JsonPropertyName("pick_name")]     public string PickName { get; set; } = "";
        [JsonPropertyName("pick_address")]  public string PickAddress { get; set; } = "";
        [JsonPropertyName("pick_province")] public string PickProvince { get; set; } = "";
        [JsonPropertyName("pick_district")] public string PickDistrict { get; set; } = "";
        [JsonPropertyName("pick_ward")]     public string? PickWard { get; set; }
        [JsonPropertyName("pick_tel")]      public string PickTel { get; set; } = "";
        public string Name { get; set; } = "";
        public string Address { get; set; } = "";
        public string Province { get; set; } = "";
        public string District { get; set; } = "";
        public string Ward { get; set; } = "";
        public string Hamlet { get; set; } = "Khác";
        public string Tel { get; set; } = "";
        [JsonPropertyName("is_freeship")] public int IsFreeship { get; set; }
        [JsonPropertyName("pick_money")]  public long PickMoney { get; set; }
        public long Value { get; set; }
        public string Transport { get; set; } = "road";
    }

    private sealed class GhtkOrderResponse
    {
        public bool Success { get; set; }
        public string? Message { get; set; }
        public GhtkOrderInfo? Order { get; set; }
    }
    private sealed class GhtkOrderInfo
    {
        public string? Label { get; set; }
        public string? Fee { get; set; }
        [JsonPropertyName("estimated_deliver_time")] public string? EstimatedDeliverTime { get; set; }
    }
}
