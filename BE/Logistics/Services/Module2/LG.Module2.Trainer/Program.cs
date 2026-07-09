using System.Globalization;
using LG.Module2.Trainer;
using Microsoft.ML;

// ── LG.Module2.Trainer — Bước 4-6 LeadTime.md ──────────────────────────────────
// Load CSV Seeder → tune FastTree trên validation tách từ train (KHÔNG đụng test)
// → retrain config tốt nhất → Mondrian conformal (cửa khẩu × chế-độ-Tết)
// → eval test vs baseline heuristic → xuất models/leadtime.zip + conformal.csv.
//
// Chạy:  dotnet run [-- <csv>]      (mặc định ../LG.Module2.Seeder/data/transit_50k.csv)

var csvPath = args.Length > 0 ? args[0]
    : Path.Combine(AppContext.BaseDirectory, "../../../../LG.Module2.Seeder/data/transit_50k.csv");
if (!File.Exists(csvPath))
{
    Console.Error.WriteLine($"Không thấy dataset: {csvPath} — chạy Seeder trước (xem README).");
    return 1;
}

// ── Load + feature dẫn xuất ──────────────────────────────────────────────────
var all = File.ReadLines(csvPath).Skip(1).Select(line =>
{
    var c = line.Split(',');
    var weight = float.Parse(c[4], CultureInfo.InvariantCulture);
    return new TransitSample
    {
        Departure = DateTime.ParseExact(c[0], "yyyy-MM-dd", CultureInfo.InvariantCulture),
        Province  = c[1],
        Carrier   = c[2],
        Border    = c[3],
        WeightKg  = weight,
        Month     = int.Parse(c[5]),
        Season    = c[6],
        IsBulk    = weight >= 500 ? 1 : 0,
        TransitDays = float.Parse(c[9], CultureInfo.InvariantCulture),
    };
}).ToList();

// ── Time split (Bước 3 — không shuffle) ──────────────────────────────────────
// Tune: trainSub → val (Q4/2025, mùa thường — cùng chế độ với test).
// Final: trainFull (<2026) → calib (Q1/26, Mondrian) → test (≥T4/26, chấm 1 lần duy nhất).
var valFrom   = new DateTime(2025, 10, 1);
var trainEnd  = new DateTime(2026, 1, 1);
var testFrom  = new DateTime(2026, 4, 1);

var trainSub  = all.Where(s => s.Departure < valFrom).ToList();
var val       = all.Where(s => s.Departure >= valFrom && s.Departure < trainEnd).ToList();
var trainFull = all.Where(s => s.Departure < trainEnd).ToList();
var calib     = all.Where(s => s.Departure >= trainEnd && s.Departure < testFrom).ToList();
var test      = all.Where(s => s.Departure >= testFrom).ToList();
Console.WriteLine($"Dataset {all.Count} → tune: {trainSub.Count}/{val.Count} (train/val) · " +
                  $"final: {trainFull.Count}/{calib.Count}/{test.Count} (train/calib/test)");

var ml = new MLContext(seed: 42);

IEstimator<ITransformer> BuildPipeline(int trees, int leaves, double lr) =>
    ml.Transforms.Categorical.OneHotEncoding(new[]
        {
            new InputOutputColumnPair("BorderEnc",   nameof(TransitSample.Border)),
            new InputOutputColumnPair("ProvinceEnc", nameof(TransitSample.Province)),
            new InputOutputColumnPair("CarrierEnc",  nameof(TransitSample.Carrier)),
            new InputOutputColumnPair("SeasonEnc",   nameof(TransitSample.Season)),
        })
        .Append(ml.Transforms.Concatenate("Features",
            "BorderEnc", "ProvinceEnc", "CarrierEnc", "SeasonEnc",
            nameof(TransitSample.WeightKg), nameof(TransitSample.Month), nameof(TransitSample.IsBulk)))
        .Append(ml.Regression.Trainers.FastTree(
            numberOfTrees: trees, numberOfLeaves: leaves,
            minimumExampleCountPerLeaf: 20, learningRate: lr));

float[] Predict(ITransformer m, List<TransitSample> data)
{
    var scored = m.Transform(ml.Data.LoadFromEnumerable(data));
    return ml.Data.CreateEnumerable<TransitPrediction>(scored, reuseRowObject: false)
             .Select(p => p.PredictedDays).ToArray();
}

double Mae(ITransformer m, List<TransitSample> data)
{
    var preds = Predict(m, data);
    return data.Zip(preds, (s, p) => Math.Abs(s.TransitDays - p)).Average();
}

// ── Bước 5 — Tune trên validation (grid nhỏ, không đụng test) ────────────────
Console.WriteLine("\n== BƯỚC 5: tune trên val Q4/2025 ==");
var trainSubDv = ml.Data.LoadFromEnumerable(trainSub);
var results = new List<(int Trees, int Leaves, double Lr, double ValMae)>();
foreach (var trees in new[] { 200, 400, 800 })
foreach (var leaves in new[] { 16, 32, 64 })
foreach (var lr in new[] { 0.03, 0.05, 0.10 })
{
    var m = BuildPipeline(trees, leaves, lr).Fit(trainSubDv);
    var mae = Mae(m, val);
    results.Add((trees, leaves, lr, mae));
}
foreach (var r in results.OrderBy(r => r.ValMae).Take(5))
    Console.WriteLine($"  trees={r.Trees,3} leaves={r.Leaves,2} lr={r.Lr:0.00} → val MAE={r.ValMae:0.000}");
var best = results.MinBy(r => r.ValMae);
Console.WriteLine($"  CHỌN: trees={best.Trees} leaves={best.Leaves} lr={best.Lr:0.00}");

// ── Retrain config tốt nhất trên trainFull ────────────────────────────────────
var trainFullDv = ml.Data.LoadFromEnumerable(trainFull);
var model = BuildPipeline(best.Trees, best.Leaves, best.Lr).Fit(trainFullDv);

// ── Bước 6 — Mondrian conformal: (cửa khẩu × chế-độ-Tết) ─────────────────────
// Calib Q1/26 chứa cửa sổ Tết → residual Tết to bất thường thổi phồng q80 nếu gộp
// chung (bài học Bước 4). Tách nhóm; nhóm <MinGroup → fallback theo cửa khẩu → global.
const int MinGroup = 80;
string RegimeOf(TransitSample s) => s.Season == "tet" ? "tet" : "normal";

var calibPreds = Predict(model, calib);
var calibRes = calib.Zip(calibPreds, (s, p) => (s.Border, Regime: RegimeOf(s),
                                                Res: (double)Math.Abs(s.TransitDays - p))).ToList();

double Q80(IEnumerable<double> xs)
{
    var a = xs.OrderBy(x => x).ToArray();
    return a[(int)(0.80 * (a.Length - 1))];
}

var qGroup  = calibRes.GroupBy(r => (r.Border, r.Regime))
                      .Where(g => g.Count() >= MinGroup)
                      .ToDictionary(g => g.Key, g => Q80(g.Select(x => x.Res)));
var qBorder = calibRes.GroupBy(r => r.Border)
                      .ToDictionary(g => g.Key, g => Q80(g.Select(x => x.Res)));
var qGlobal = Q80(calibRes.Select(x => x.Res));

double QFor(string border, string regime) =>
    qGroup.TryGetValue((border, regime), out var q) ? q
    : qBorder.TryGetValue(border, out var qb) ? qb
    : qGlobal;

Console.WriteLine("\n== BƯỚC 6: Mondrian conformal q80 (cửa khẩu × chế độ) ==");
foreach (var kv in qGroup.OrderBy(k => k.Key.Border).ThenBy(k => k.Key.Regime))
    Console.WriteLine($"  {kv.Key.Border,-8} × {kv.Key.Regime,-6} → ±{kv.Value:0.00}  (n={calibRes.Count(r => (r.Border, r.Regime) == kv.Key)})");

// ── Đánh giá test (chấm 1 lần) — baseline heuristic Bước 2: MAE 1.491, PICP 58.9% ──
var testPreds = Predict(model, test);
double sumAbs = 0, sumErr = 0, width = 0; int covered = 0;
var byBorder = test.Select(s => s.Border).Distinct()
                   .ToDictionary(b => b, _ => (abs: 0.0, n: 0, cov: 0));
for (var i = 0; i < test.Count; i++)
{
    var s = test[i];
    var pred = testPreds[i];
    var q = QFor(s.Border, RegimeOf(s));
    var (lo, hi) = (Math.Max(1, pred - q), pred + q);

    sumAbs += Math.Abs(pred - s.TransitDays);
    sumErr += s.TransitDays - pred;
    width  += hi - lo;
    var inside = s.TransitDays >= lo && s.TransitDays <= hi;
    if (inside) covered++;

    var b = byBorder[s.Border];
    byBorder[s.Border] = (b.abs + Math.Abs(pred - s.TransitDays), b.n + 1, b.cov + (inside ? 1 : 0));
}

var n = test.Count;
Console.WriteLine($"\n== KẾT QUẢ TEST (n={n}) — baseline: MAE 1.491, bias +1.03, PICP 58.9%, width 2.22 ==");
Console.WriteLine($"  MAE  = {sumAbs / n:0.000} ngày (mốc ≤1.27)");
Console.WriteLine($"  Bias = {sumErr / n:+0.000;-0.000} ngày");
Console.WriteLine($"  PICP = {(double)covered / n:P1} (mốc ≥80%)   width TB = {width / n:0.00} ngày (mốc ≤3.5)");
foreach (var (border, v) in byBorder.OrderBy(kv => kv.Key))
    Console.WriteLine($"    {border,-8} MAE={v.abs / v.n:0.000}  PICP={(double)v.cov / v.n:P1}  n={v.n}");

// ── Xuất model + tham số conformal (Bước 8 dùng) ─────────────────────────────
var outDir = Path.Combine(AppContext.BaseDirectory, "../../../models");
Directory.CreateDirectory(outDir);
ml.Model.Save(model, trainFullDv.Schema, Path.Combine(outDir, "leadtime.zip"));
File.WriteAllLines(Path.Combine(outDir, "conformal.csv"),
    new[] { "border,regime,q80" }
        .Concat(qGroup.Select(kv =>
            $"{kv.Key.Border},{kv.Key.Regime},{kv.Value.ToString("0.###", CultureInfo.InvariantCulture)}"))
        .Concat(qBorder.Select(kv =>
            $"{kv.Key},*,{kv.Value.ToString("0.###", CultureInfo.InvariantCulture)}"))
        .Append($"*,*,{qGlobal.ToString("0.###", CultureInfo.InvariantCulture)}"));
Console.WriteLine($"\nĐã lưu model + conformal → {Path.GetFullPath(outDir)}");
return 0;
