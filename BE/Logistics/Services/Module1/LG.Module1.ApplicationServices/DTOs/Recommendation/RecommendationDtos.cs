using LG.Module1.ApplicationServices.DTOs.Product;
using LG.Module1.Domain.Entities;

namespace LG.Module1.ApplicationServices.DTOs.Recommendation;

// Một "dải" gợi ý (mỗi dải = 1 thuật toán). Key để FE map tiêu đề qua i18n
// (vd: trending, featured, recently_viewed, similar_to_viewed, for_you).
public record RecSection(string Key, List<ProductListItemResponse> Products);

// Kết quả gợi ý theo phân khúc khách (first_time | returning | loyal).
public record RecommendationResponse(string Segment, List<RecSection> Sections);

// Ghi nhận hành vi (View/Search/AddToCart/Purchase). SessionKey cho khách ẩn danh.
public record TrackActivityRequest(
    ActivityEventType Type,
    Guid?   ProductId  = null,
    Guid?   CategoryId = null,
    string? Keyword    = null,
    string? SessionKey = null
);
