using System.Text.Json.Serialization;

namespace LG.Core.ApplicationServices.Finance.DTOs.ZaloPay
{
    public class ZaloPayEmbedData
    {
        [JsonPropertyName("redirecturl")]
        public string RedirectUrl { get; set; } = "";

        [JsonPropertyName("payment_type")]
        public string PaymentType { get; set; } = ""; // "TOPUP" hoặc "ORDER"

        [JsonPropertyName("reference_id")]
        public string ReferenceId { get; set; } = ""; // ID của TopupRequest hoặc Order
    }
}
