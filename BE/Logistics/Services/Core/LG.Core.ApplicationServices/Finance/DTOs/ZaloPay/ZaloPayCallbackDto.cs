using System.Text.Json.Serialization;

namespace LG.Core.ApplicationServices.Finance.DTOs.ZaloPay
{
    /// <summary>
    /// Dữ liệu ZaloPay gửi về khi người dùng thanh toán thành công (Callback / Webhook).
    /// </summary>
    public class ZaloPayCallbackDto
    {
        [JsonPropertyName("data")]
        public string Data { get; set; } = string.Empty;

        [JsonPropertyName("mac")]
        public string Mac { get; set; } = string.Empty;

        [JsonPropertyName("type")]
        public int Type { get; set; }
    }

    /// <summary>
    /// Cấu trúc dữ liệu bên trong trường "data" (sau khi parse JSON).
    /// </summary>
    public class ZaloPayCallbackData
    {
        [JsonPropertyName("app_id")]
        public int AppId { get; set; }

        [JsonPropertyName("app_trans_id")]
        public string AppTransId { get; set; } = string.Empty;

        [JsonPropertyName("app_time")]
        public long AppTime { get; set; }

        [JsonPropertyName("app_user")]
        public string AppUser { get; set; } = string.Empty;

        [JsonPropertyName("amount")]
        public long Amount { get; set; }

        [JsonPropertyName("embed_data")]
        public string EmbedData { get; set; } = string.Empty;

        [JsonPropertyName("item")]
        public string Item { get; set; } = string.Empty;

        [JsonPropertyName("zp_trans_id")]
        public long ZpTransId { get; set; }

        [JsonPropertyName("server_time")]
        public long ServerTime { get; set; }

        [JsonPropertyName("channel")]
        public int Channel { get; set; }

        [JsonPropertyName("merchant_user_id")]
        public string MerchantUserId { get; set; } = string.Empty;

        [JsonPropertyName("user_fee_amount")]
        public long UserFeeAmount { get; set; }

        [JsonPropertyName("discount_amount")]
        public long DiscountAmount { get; set; }
    }
}
