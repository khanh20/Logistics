using System.Text.Json.Serialization;

namespace LG.Core.ApplicationServices.Finance.DTOs.ZaloPay
{
    /// <summary>
    /// Kết quả trả về từ ZaloPay khi tạo đơn thanh toán.
    /// </summary>
    public class ZaloPayCreateOrderResponseDto
    {
        [JsonPropertyName("return_code")]
        public int ReturnCode { get; set; }

        [JsonPropertyName("return_message")]
        public string ReturnMessage { get; set; } = string.Empty;

        [JsonPropertyName("sub_return_code")]
        public int SubReturnCode { get; set; }

        [JsonPropertyName("sub_return_message")]
        public string SubReturnMessage { get; set; } = string.Empty;

        [JsonPropertyName("order_url")]
        public string OrderUrl { get; set; } = string.Empty;

        [JsonPropertyName("zp_trans_token")]
        public string ZpTransToken { get; set; } = string.Empty;

        [JsonPropertyName("order_token")]
        public string OrderToken { get; set; } = string.Empty;
    }
}
