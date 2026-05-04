namespace LG.Module1.Infrastructure.Adapters.Rakuten;

/// Options cấu hình cho Rakuten Ichiba API.
/// Bind từ appsettings: "Adapters:Rakuten:ApplicationId"
/// hoặc env var: ADAPTERS__RAKUTEN__APPLICATIONID
public class RakutenOptions
{
    public const string SectionName = "Adapters:Rakuten";
    /// Rakuten App ID — đăng ký free tại webservice.rakuten.co.jp
    /// Pass qua query param "applicationId" trong mọi request.
    public string ApplicationId { get; set; } = string.Empty;

    /// Optional — affiliate ID nếu muốn earn commission.
    public string? AffiliateId { get; set; }

    /// Base URL
    public string BaseUrl { get; set; } = "https://openapi.rakuten.co.jp/";

    /// Timeout cho mỗi HTTP request (giây).
    public int TimeoutSeconds { get; set; } = 15;
}