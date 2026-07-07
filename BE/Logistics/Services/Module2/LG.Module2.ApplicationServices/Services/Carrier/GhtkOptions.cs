namespace LG.Module2.ApplicationServices.Services.Carrier;

/// Cấu hình tích hợp GHTK (bind từ section "Ghtk" trong appsettings / env).
public class GhtkOptions
{
    public string BaseUrl      { get; set; } = "https://services.giaohangtietkiem.vn";
    public string? Token        { get; set; }   // API Token lấy ở khachhang.giaohangtietkiem.vn
    public string? ClientSource { get; set; }   // X-Client-Source (partner code)
    public string? WebhookToken { get; set; }   // token tự đặt để xác thực webhook GHTK

    // Địa chỉ kho lấy hàng (pick_*)
    public string PickName     { get; set; } = "Kho MuaHo";
    public string PickTel      { get; set; } = "";
    public string PickAddress  { get; set; } = "";
    public string PickProvince { get; set; } = "";
    public string PickDistrict { get; set; } = "";
    public string PickWard     { get; set; } = "";

    /// Đã cấu hình đủ để gọi API thật chưa.
    public bool Enabled => !string.IsNullOrWhiteSpace(Token) && !string.IsNullOrWhiteSpace(ClientSource);
}
