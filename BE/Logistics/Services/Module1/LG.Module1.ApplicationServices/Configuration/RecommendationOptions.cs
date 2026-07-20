namespace LG.Module1.ApplicationServices.Configuration;

// Toàn bộ tham số của engine gợi ý — bind từ appsettings mục "Recommendation".
// Default = đúng các giá trị từng hard-code, nên thiếu config vẫn chạy y hệt cũ.
// Trọng số/knob tại đây PHẢI đồng bộ với RECO_* của trainer Python (config.py).
public sealed class RecommendationOptions
{
    /// Số đơn hoàn tất tối thiểu để xếp khách vào phân khúc "loyal".
    public int LoyalMinOrders { get; set; } = 3;

    /// Pool ứng viên = PerSection × hệ số này (recall trước khi rank).
    public int CandidatePoolMultiplier { get; set; } = 4;

    /// Bật gọi reranker ML bên Python (fallback rank linear khi lỗi/thiếu model).
    public bool UseMlReranker { get; set; } = true;

    /// Trọng số tín hiệu khi dựng hồ sơ khách (mua / thích / xem).
    public SignalWeightsOptions SignalWeights { get; set; } = new();

    /// 7 trọng số của công thức rank linear (fallback + baseline đối chứng).
    public RankWeightsOptions RankWeights { get; set; } = new();

    /// Chu kỳ bán rã (ngày) cho tín hiệu recency của sản phẩm.
    public double RecencyHalflifeDays { get; set; } = 30.0;

    public sealed class SignalWeightsOptions
    {
        public double Purchase { get; set; } = 3.0;
        public double Favorite { get; set; } = 2.0;
        public double View     { get; set; } = 1.0;
    }

    public sealed class RankWeightsOptions
    {
        public double Sim      { get; set; } = 0.35;
        public double Category { get; set; } = 0.20;
        public double Pop      { get; set; } = 0.15;
        public double Recency  { get; set; } = 0.10;
        public double Price    { get; set; } = 0.10;
        public double Featured { get; set; } = 0.05;
        public double Shop     { get; set; } = 0.05;
    }
}
