namespace LG.Core.ApplicationServices.Finance.DTOs.ZaloPay
{
    /// <summary>
    /// Cấu hình kết nối đến ZaloPay Sandbox / Production.
    /// Được bind từ section "ZaloPay" trong appsettings.json.
    /// </summary>
    public class ZaloPayConfig
    {
        public int AppId { get; set; }
        public string Key1 { get; set; } = string.Empty;
        public string Key2 { get; set; } = string.Empty;
        public string Endpoint { get; set; } = string.Empty;
        public string RedirectUrl { get; set; } = string.Empty;
        public string CallbackUrl { get; set; } = string.Empty;
    }
}
