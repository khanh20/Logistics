using System.Globalization;
using LG.Module2.Domain.Entities;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.ML;
using Microsoft.ML.Data;

namespace LG.Module2.ApplicationServices.Services.Ml;

/// Kết quả model: khoảng ngày + confidence (coverage nominal đo từ calibration).
public record LeadTimePrediction(int EstDaysMin, int EstDaysMax, decimal ConfidencePct);

/// Model ML dự báo lead time (Bước 8 LeadTime.md). null = model không khả dụng
/// → caller (AIForecastService) tự fallback heuristic.
public interface ILeadTimeModel
{
    LeadTimePrediction? Predict(string originProvinceCn, string carrierCn, BorderCrossing border,
                                decimal weightKg, string season, bool alertActive);
}

/// Nạp models/leadtime.zip + conformal.csv do LG.Module2.Trainer xuất ra.
/// Đăng ký singleton; PredictionEngine không thread-safe → khoá quanh Predict
/// (chấp nhận được: kiến trúc chính là precompute, QPS trực tiếp thấp).
public class LeadTimeModelService : ILeadTimeModel
{
    private readonly ILogger<LeadTimeModelService> _logger;
    private readonly object _lock = new();
    private readonly PredictionEngine<ModelInput, ModelOutput>? _engine;
    private readonly ConformalTable? _conformal;

    public LeadTimeModelService(IConfiguration config, ILogger<LeadTimeModelService> logger)
    {
        _logger = logger;
        var dir = config["Ai:ModelDirectory"]
               ?? Environment.GetEnvironmentVariable("AI__MODELDIRECTORY");
        if (string.IsNullOrWhiteSpace(dir))
        {
            logger.LogInformation("[ML] Ai:ModelDirectory chưa cấu hình — forecast dùng heuristic");
            return;
        }

        var modelPath     = Path.Combine(dir, "leadtime.zip");
        var conformalPath = Path.Combine(dir, "conformal.csv");
        if (!File.Exists(modelPath) || !File.Exists(conformalPath))
        {
            logger.LogWarning("[ML] Không thấy {Model} hoặc {Conformal} — forecast dùng heuristic",
                modelPath, conformalPath);
            return;
        }

        try
        {
            var ml    = new MLContext();
            var model = ml.Model.Load(modelPath, out _);
            _engine    = ml.Model.CreatePredictionEngine<ModelInput, ModelOutput>(model);
            _conformal = ConformalTable.Parse(File.ReadLines(conformalPath));
            logger.LogInformation("[ML] Đã nạp model lead time từ {Dir}", dir);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "[ML] Nạp model lead time thất bại — forecast dùng heuristic");
            _engine = null;
        }
    }

    public LeadTimePrediction? Predict(string originProvinceCn, string carrierCn, BorderCrossing border,
                                       decimal weightKg, string season, bool alertActive)
    {
        if (_engine is null || _conformal is null) return null;

        try
        {
            var input = new ModelInput
            {
                Border      = border.ToString(),
                Province    = originProvinceCn,
                Carrier     = carrierCn,
                Season      = season,
                WeightKg    = (float)weightKg,
                Month       = DateTime.UtcNow.Month,
                IsBulk      = weightKg >= 500m ? 1 : 0,
                AlertActive = alertActive ? 1 : 0,
            };

            float point;
            lock (_lock) point = _engine.Predict(input).Score;

            var regime = season == "tet" ? "tet" : "normal";
            var q      = _conformal.QFor(border.ToString(), regime);

            var min = Math.Max(1, (int)Math.Floor(point - q));
            var max = Math.Max(min + 1, (int)Math.Ceiling(point + q));
            return new LeadTimePrediction(min, max, ConformalTable.NominalConfidence);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[ML] Predict lỗi — fallback heuristic");
            return null;
        }
    }

    // ── Schema phải khớp CHÍNH XÁC TransitSample lúc train (LG.Module2.Trainer) ──
    private class ModelInput
    {
        public string Border   { get; set; } = "";
        public string Province { get; set; } = "";
        public string Carrier  { get; set; } = "";
        public string Season   { get; set; } = "";
        public float  WeightKg { get; set; }
        public float  Month    { get; set; }
        public float  IsBulk   { get; set; }
        public float  AlertActive { get; set; }

        [ColumnName("Label")]
        public float TransitDays { get; set; }   // không dùng lúc predict, cần cho schema
    }

    private class ModelOutput
    {
        [ColumnName("Score")]
        public float Score { get; set; }
    }
}

/// Bảng q80 conformal theo (cửa khẩu × chế độ) với fallback `*` — parse từ conformal.csv.
/// Tách riêng để unit-test được không cần model.
public class ConformalTable
{
    /// Coverage nominal của phân vị dùng khi calibrate (q80) — đo được 80.9% trên test.
    public const decimal NominalConfidence = 0.80m;

    private readonly Dictionary<(string Border, string Regime), double> _q = new();

    public static ConformalTable Parse(IEnumerable<string> csvLines)
    {
        var table = new ConformalTable();
        foreach (var line in csvLines.Skip(1))
        {
            var c = line.Split(',');
            if (c.Length != 3) continue;
            table._q[(c[0], c[1])] = double.Parse(c[2], CultureInfo.InvariantCulture);
        }
        if (table._q.Count == 0) throw new InvalidDataException("conformal.csv rỗng");
        return table;
    }

    public double QFor(string border, string regime) =>
        _q.TryGetValue((border, regime), out var q) ? q
        : _q.TryGetValue((border, "*"), out var qb) ? qb
        : _q.TryGetValue(("*", "*"), out var qg) ? qg
        : 2.0;   // không nên xảy ra (Parse đảm bảo có dòng *,*) — an toàn tuyệt đối
}

/// Suy mùa từ thời điểm — dùng CỬA SỔ TẾT ÂM LỊCH THẬT (−14..+7 ngày quanh mùng 1),
/// thay cho quy tắc cũ "cả tháng 1+2 là tet" (sai ~6 tuần/năm, làm hỏng feature model).
public static class SeasonHelper
{
    // Mùng 1 Tết âm lịch — cập nhật khi thêm năm mới
    private static readonly DateTime[] TetDates =
    {
        new(2024, 2, 10), new(2025, 1, 29), new(2026, 2, 17),
        new(2027, 2, 6),  new(2028, 1, 26),
    };

    public static bool IsTetWindow(DateTime date) =>
        TetDates.Any(t => date >= t.AddDays(-14) && date <= t.AddDays(7));

    public static string InferSeason(DateTime date) => IsTetWindow(date) ? "tet" : date.Month switch
    {
        3 or 4 or 5   => "spring",
        6 or 7 or 8   => "summer",
        9 or 10 or 11 => "autumn",
        _             => "winter",
    };
}
