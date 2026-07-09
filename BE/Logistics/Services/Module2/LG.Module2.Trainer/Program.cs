using System.Globalization;
using LG.Module2.Trainer;
using Microsoft.ML;

// ── LG.Module2.Trainer — Bước 4-6 LeadTime.md ──────────────────────────────────
// Load CSV Seeder → time split → FastTree point estimate → conformal interval
// theo cửa khẩu → eval vs baseline heuristic → xuất models/leadtime.zip.
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
var trainEnd = new DateTime(2026, 1, 1);
var testFrom = new DateTime(2026, 4, 1);
var train = all.Where(s => s.Departure < trainEnd).ToList();
var calib = all.Where(s => s.Departure >= trainEnd && s.Departure < testFrom).ToList();
var test  = all.Where(s => s.Departure >= testFrom).ToList();
Console.WriteLine($"Dataset {all.Count} dòng → train {train.Count} | calib {calib.Count} | test {test.Count}");

// ── Pipeline ML.NET (Bước 4) ─────────────────────────────────────────────────
var ml = new MLContext(seed: 42);
var trainDv = ml.Data.LoadFromEnumerable(train);

var pipeline = ml.Transforms.Categorical.OneHotEncoding(new[]
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
        numberOfTrees: 400, numberOfLeaves: 32, minimumExampleCountPerLeaf: 20, learningRate: 0.05));

Console.WriteLine("Training FastTree (400 trees, 32 leaves, lr 0.05)...");
var model  = pipeline.Fit(trainDv);
var engine = ml.Model.CreatePredictionEngine<TransitSample, TransitPrediction>(model);

// ── Conformal theo cửa khẩu (Bước 6): q80 của residual trên calibration ─────
var qByBorder = calib
    .GroupBy(s => s.Border)
    .ToDictionary(g => g.Key, g =>
    {
        var res = g.Select(s => Math.Abs(engine.Predict(s).PredictedDays - s.TransitDays))
                   .OrderBy(x => x).ToArray();
        return res[(int)(0.80 * (res.Length - 1))];
    });
Console.WriteLine("Conformal q80 theo cửa khẩu: " +
    string.Join(", ", qByBorder.Select(kv => $"{kv.Key}=±{kv.Value:0.00}")));

// ── Đánh giá trên test (Bước 7 sơ bộ) — so với baseline heuristic Bước 2 ────
double sumAbs = 0, sumErr = 0, width = 0; int covered = 0;
var maeByBorder = test.GroupBy(s => s.Border).ToDictionary(g => g.Key, _ => (abs: 0.0, n: 0, cov: 0));

foreach (var s in test)
{
    var pred = engine.Predict(s).PredictedDays;
    var q    = qByBorder.GetValueOrDefault(s.Border, 2f);
    var (lo, hi) = (Math.Max(1, pred - q), pred + q);

    sumAbs += Math.Abs(pred - s.TransitDays);
    sumErr += s.TransitDays - pred;
    width  += hi - lo;
    var inside = s.TransitDays >= lo && s.TransitDays <= hi;
    if (inside) covered++;

    var b = maeByBorder[s.Border];
    maeByBorder[s.Border] = (b.abs + Math.Abs(pred - s.TransitDays), b.n + 1, b.cov + (inside ? 1 : 0));
}

var n = test.Count;
Console.WriteLine($"\n== KẾT QUẢ TEST (n={n}) — baseline heuristic: MAE 1.491, bias +1.03, PICP 58.9% ==");
Console.WriteLine($"  MAE  = {sumAbs / n:0.000} ngày");
Console.WriteLine($"  Bias = {sumErr / n:+0.000;-0.000} ngày");
Console.WriteLine($"  PICP = {(double)covered / n:P1}  (mục tiêu ≥80%)   width TB = {width / n:0.00} ngày");
foreach (var (border, v) in maeByBorder.OrderBy(kv => kv.Key))
    Console.WriteLine($"    {border,-8} MAE={v.abs / v.n:0.000}  PICP={(double)v.cov / v.n:P1}  n={v.n}");

// ── Xuất model + tham số conformal (Bước 8 sẽ dùng) ──────────────────────────
var outDir = Path.Combine(AppContext.BaseDirectory, "../../../models");
Directory.CreateDirectory(outDir);
ml.Model.Save(model, trainDv.Schema, Path.Combine(outDir, "leadtime.zip"));
File.WriteAllLines(Path.Combine(outDir, "conformal.csv"),
    new[] { "border,q80" }.Concat(qByBorder.Select(kv =>
        $"{kv.Key},{kv.Value.ToString("0.###", CultureInfo.InvariantCulture)}")));
Console.WriteLine($"\nĐã lưu model + conformal → {Path.GetFullPath(outDir)}");
return 0;
