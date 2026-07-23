using Pgvector;

namespace LG.Module1.Domain.Entities;

// Số chiều vector embedding (khớp model Qwen3-Embedding-0.6B / cấu hình).
public static class EmbeddingDims
{
    public const int Default = 1024;
}

// ── ProductEmbedding — vector ngữ nghĩa của sản phẩm (pgvector) ──────
public class ProductEmbedding
{
    public Guid     ProductId { get; private set; }   // PK + 1-1 với ProductMaster
    public Vector   Embedding { get; private set; } = default!;
    public string   Model     { get; private set; } = default!;
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;

    public ProductMaster Product { get; private set; } = default!;

    private ProductEmbedding() { }

    public static ProductEmbedding Create(Guid productId, Vector embedding, string model) =>
        new() { ProductId = productId, Embedding = embedding, Model = model.Trim() };

    public void Update(Vector embedding, string model)
    {
        Embedding = embedding;
        Model     = model.Trim();
        UpdatedAt = DateTime.UtcNow;
    }
}

// Loại sự kiện hành vi người dùng — nguồn cho recently-viewed, co-view, phân khúc khách.
public enum ActivityEventType
{
    View      = 1,
    Search    = 2,
    AddToCart = 3,
    Purchase  = 4,
}

// Trạng thái kiểm duyệt đánh giá sản phẩm.
public enum ReviewStatus
{
    Pending  = 1,
    Approved = 2,
    Rejected = 3,
}

// Điểm trending của 1 sản phẩm (kết quả tính của job, dùng để ghi cache).
public readonly record struct TrendingScore(Guid ProductId, double Score);

/// Một lượt tương tác thô — đủ dữ kiện để dựng seed có trọng số ngắn/dài hạn
/// (cần cả thời điểm lẫn phiên, nên không dùng lại danh sách id trần được).
public readonly record struct BehaviorEventRow(
    Guid ProductId, ActivityEventType EventType, DateTime CreatedAt, string? SessionKey);

/// Seed kèm trọng số đã tính: Weight gộp độ mới, loại sự kiện và cân bằng ngắn/dài hạn.
public readonly record struct WeightedSeed(Guid ProductId, double Weight, bool FromCurrentSession);

/// Một ứng viên kèm seed đã sinh ra nó — Score = Weight(seed) × Similarity.
/// SeedId để truy vết: gợi ý nào cũng phải chỉ ra được hành vi nào tạo ra nó.
public readonly record struct SeedMatch(Guid ProductId, double Score, double Similarity, Guid SeedId);

// ── TrendingProduct — cache "đang thịnh hành" do TrendingAggregationJob ghi ──
public class TrendingProduct
{
    public Guid     Id         { get; private set; } = Guid.NewGuid();
    public Guid     ProductId  { get; private set; }
    public double   Score      { get; private set; }
    public int      Rank       { get; private set; }
    public DateTime ComputedAt { get; private set; } = DateTime.UtcNow;

    private TrendingProduct() { }

    public static TrendingProduct Create(Guid productId, double score, int rank) =>
        new() { ProductId = productId, Score = score, Rank = rank };
}

// ── ProductCoView — "người xem X cũng xem Y" (item-to-item, do CoViewMatrixJob ghi) ──
public class ProductCoView
{
    public Guid     Id               { get; private set; } = Guid.NewGuid();
    public Guid     ProductId        { get; private set; }
    public Guid     RelatedProductId { get; private set; }
    public double   Score            { get; private set; }
    public DateTime ComputedAt       { get; private set; } = DateTime.UtcNow;

    private ProductCoView() { }

    public static ProductCoView Create(Guid productId, Guid relatedProductId, double score) =>
        new() { ProductId = productId, RelatedProductId = relatedProductId, Score = score };
}

// ── UserActivityEvent — log hành vi (theo CustomerId hoặc SessionKey cho khách ẩn danh) ──
public class UserActivityEvent
{
    public Guid              Id         { get; private set; } = Guid.NewGuid();
    public Guid?             CustomerId { get; private set; }
    public string?           SessionKey { get; private set; }   // dùng khi khách chưa đăng nhập
    public Guid?             ProductId  { get; private set; }
    public Guid?             CategoryId { get; private set; }
    public ActivityEventType EventType  { get; private set; }
    public string?           Keyword    { get; private set; }   // với EventType.Search
    public DateTime          CreatedAt  { get; private set; } = DateTime.UtcNow;

    private UserActivityEvent() { }

    public static UserActivityEvent Create(ActivityEventType type, Guid? customerId = null,
                                           string? sessionKey = null, Guid? productId = null,
                                           Guid? categoryId = null, string? keyword = null)
    {
        if (customerId is null && string.IsNullOrWhiteSpace(sessionKey))
            throw new ArgumentException("Cần CustomerId hoặc SessionKey để ghi nhận hành vi.");
        return new()
        {
            EventType  = type,
            CustomerId = customerId,
            SessionKey = sessionKey?.Trim(),
            ProductId  = productId,
            CategoryId = categoryId,
            Keyword    = keyword?.Trim(),
        };
    }
}

// ── UserFavorite — sản phẩm yêu thích của khách ──────────────────────────────
public class UserFavorite
{
    public Guid     Id         { get; private set; } = Guid.NewGuid();
    public Guid     CustomerId { get; private set; }
    public Guid     ProductId  { get; private set; }
    public DateTime CreatedAt  { get; private set; } = DateTime.UtcNow;

    // Navigation
    public ProductMaster Product { get; private set; } = default!;

    private UserFavorite() { }

    public static UserFavorite Create(Guid customerId, Guid productId) =>
        new() { CustomerId = customerId, ProductId = productId };
}

// ── ProductReview — đánh giá sản phẩm (có kiểm duyệt) ────────────────────────
public class ProductReview
{
    public Guid         Id                 { get; private set; } = Guid.NewGuid();
    public Guid         ProductId          { get; private set; }
    public Guid         CustomerId         { get; private set; }
    public Guid?        OrderId            { get; private set; }   // ràng buộc "đã mua mới được đánh giá"
    public int          Rating             { get; private set; }   // 1..5
    public string       Content            { get; private set; } = default!;
    public ReviewStatus Status             { get; private set; } = ReviewStatus.Pending;
    public string?      RejectReason       { get; private set; }
    public Guid?        ModeratedByStaffId { get; private set; }
    public DateTime?    ModeratedAt        { get; private set; }
    public DateTime     CreatedAt          { get; private set; } = DateTime.UtcNow;
    public DateTime     UpdatedAt          { get; private set; } = DateTime.UtcNow;

    // AI chỉ GẮN điểm và có thể TỰ DUYỆT, KHÔNG bao giờ tự từ chối — spam luôn để nhân viên.
    public double?      AiSpamScore        { get; private set; }
    public DateTime?    AiScannedAt        { get; private set; }

    // Navigation
    public ProductMaster Product { get; private set; } = default!;

    private ProductReview() { }

    public static ProductReview Create(Guid productId, Guid customerId, int rating,
                                       string content, Guid? orderId = null)
    {
        if (rating is < 1 or > 5) throw new ArgumentException("Rating phải từ 1 đến 5.");
        if (string.IsNullOrWhiteSpace(content)) throw new ArgumentException("Nội dung đánh giá không được rỗng.");
        return new()
        {
            ProductId  = productId,
            CustomerId = customerId,
            OrderId    = orderId,
            Rating     = rating,
            Content    = content.Trim(),
        };
    }

    // Kiểm duyệt: duyệt hiển thị công khai.
    public void Approve(Guid staffId)
    {
        Status             = ReviewStatus.Approved;
        ModeratedByStaffId = staffId;
        RejectReason       = null;
        ModeratedAt        = DateTime.UtcNow;
        Touch();
    }

    // Kiểm duyệt: từ chối kèm lý do.
    public void Reject(Guid staffId, string reason)
    {
        Status             = ReviewStatus.Rejected;
        ModeratedByStaffId = staffId;
        RejectReason       = reason?.Trim();
        ModeratedAt        = DateTime.UtcNow;
        Touch();
    }

    // Ghi điểm spam của mô hình. Không đổi trạng thái — chỉ là gợi ý cho nhân viên.
    public void ApplyAiSpamScore(double score)
    {
        AiSpamScore = score;
        AiScannedAt = DateTime.UtcNow;
        Touch();
    }

    // AI tự duyệt khi tin chắc là KHÔNG spam (ModeratedByStaffId = null -> hệ thống, không phải nhân viên).
    public void AutoApprove()
    {
        if (Status != ReviewStatus.Pending) return;
        Status             = ReviewStatus.Approved;
        ModeratedByStaffId = null;
        ModeratedAt        = DateTime.UtcNow;
        Touch();
    }

    private void Touch() => UpdatedAt = DateTime.UtcNow;
}
