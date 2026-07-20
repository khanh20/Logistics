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

    /// Cân bằng ý định tức thời (phiên hiện tại) và sở thích ổn định (lịch sử cũ).
    public BehaviorHorizonOptions Horizon { get; set; } = new();

    // Tham số lấy theo tài liệu session-based recommendation; xem ghi chú từng mục.
    public sealed class BehaviorHorizonOptions
    {
        /// Khoảng lặng (phút) để coi là sang phiên mới. 30' là mặc định của Google
        /// Analytics, gốc từ Catledge & Pitkow 1995 (9.3' trung bình + 1.5σ ≈ 25.5').
        public double SessionGapMinutes { get; set; } = 30.0;

        /// Bán rã (ngày) của seed dài hạn. 60 vì dữ liệu hành vi còn quá ít để vứt sớm.
        public double LongTermHalflifeDays { get; set; } = 60.0;

        /// Bỏ hẳn tương tác cũ hơn mốc này.
        public double LongTermCutoffDays { get; set; } = 180.0;

        /// Suy giảm theo VỊ TRÍ trong phiên: w = exp(-(n - i) / λ). λ = 3.54 là mặc
        /// định của STAN (Garg et al., SIGIR 2019) — lùi ~3.5 bước còn ~37% trọng số.
        public double SessionPositionLambda { get; set; } = 3.54;

        /// Trần của α (tỉ trọng ngắn hạn) khi ý định đã rất rõ.
        public double AlphaMax { get; set; } = 0.8;

        /// α = AlphaMax·(1 - exp(-n_phiên / τ)). τ = 2 → phiên 1 item α≈0.31, 5 item α≈0.73.
        public double AlphaTau { get; set; } = 2.0;

        /// β = 1 - exp(-n_lịch_sử / τ_h); lịch sử mỏng thì β→0 và α tự đẩy về 1.
        public double HistoryTau { get; set; } = 5.0;

        /// Số sự kiện thô đọc lên để dựng seed.
        public int MaxEventsScanned { get; set; } = 120;

        /// Trần số seed đưa vào truy vấn vector.
        public int MaxSeeds { get; set; } = 20;
    }

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
