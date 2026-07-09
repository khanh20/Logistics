using Microsoft.ML.Data;

namespace LG.Module2.Trainer;

/// 1 mẫu train/eval — load thủ công từ CSV của Seeder (không dùng TextLoader để
/// tự kiểm soát parse + feature dẫn xuất). Features theo quyết định Bước 1:
/// border, province, carrier, season, month, weight_kg, is_bulk.
/// KHÔNG dùng: weekday, congestion_active (leakage — không khả dụng lúc predict),
/// is_tet_window (trùng season=="tet").
public class TransitSample
{
    public string Border   { get; set; } = "";
    public string Province { get; set; } = "";
    public string Carrier  { get; set; } = "";
    public string Season   { get; set; } = "";
    public float  WeightKg { get; set; }
    public float  Month    { get; set; }
    public float  IsBulk   { get; set; }   // dẫn xuất: weight_kg >= 500 (EDA: phân phối bimodal)

    [ColumnName("Label")]
    public float TransitDays { get; set; }

    // Không phải feature — chỉ dùng chia tập theo thời gian
    [NoColumn]
    public DateTime Departure { get; set; }
}

public class TransitPrediction
{
    [ColumnName("Score")]
    public float PredictedDays { get; set; }
}
