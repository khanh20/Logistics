using System.Globalization;
using LG.Module2.Trainer;
using Microsoft.ML;

// ── LG.Module2.Trainer — Bước 4-7 LeadTime.md ──────────────────────────────────
// Bước 7: (A) thử nghiệm feature alert_active (alert trễ 2 ngày — khả dụng lúc serve)
//         (B) fold walk-forward Tết (test Q1/26)  (C) permutation importance.
// Config từ Bước 5: FastTree 200 trees / 16 leaves / lr 0.03 (grid phẳng).
//
// Chạy:  dotnet run [-- <csv>]      (mặc định ../LG.Module2.Seeder/data/transit_50k.csv)

var csvPath = args.Length > 0 ? args[0]
    : Path.Combine(AppContext.BaseDirectory, "../../../../LG.Module2.Seeder/data/transit_50k.csv");
if (!File.Exists(csvPath))
{
    Console.Error.WriteLine($"Không thấy dataset: {csvPath} — chạy Seeder trước (xem README).");
    return 1;
}

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
        AlertActive = c[9] == "1" ? 1 : 0,   // alert trễ 2d — KHÔNG phải congestion_active (c[8], leakage)
        TransitDays = float.Parse(c[10], CultureInfo.InvariantCulture),
    };
}).ToList();

var ml = new MLContext(seed: 42);
string RegimeOf(TransitSample s) => s.Season == "tet" ? "tet" : "normal";

IEstimator<ITransformer> BuildPipeline(bool withAlert)
{
    var numeric = new List<string>
        { nameof(TransitSample.WeightKg), nameof(TransitSample.Month), nameof(TransitSample.IsBulk) };
    if (withAlert) numeric.Add(nameof(TransitSample.AlertActive));

    return ml.Transforms.Categorical.OneHotEncoding(new[]
        {
            new InputOutputColumnPair("BorderEnc",   nameof(TransitSample.Border)),
            new InputOutputColumnPair("ProvinceEnc", nameof(TransitSample.Province)),
            new InputOutputColumnPair("CarrierEnc",  nameof(TransitSample.Carrier)),
            new InputOutputColumnPair("SeasonEnc",   nameof(TransitSample.Season)),
        })
        .Append(ml.Transforms.Concatenate("Features",
            new[] { "BorderEnc", "ProvinceEnc", "CarrierEnc", "SeasonEnc" }.Concat(numeric).ToArray()))
        .Append(ml.Regression.Trainers.FastTree(
            numberOfTrees: 200, numberOfLeaves: 16, minimumExampleCountPerLeaf: 20, learningRate: 0.03));
}

float[] Predict(ITransformer m, List<TransitSample> data) =>
    ml.Data.CreateEnumerable<TransitPrediction>(m.Transform(ml.Data.LoadFromEnumerable(data)), false)
      .Select(p => p.PredictedDays).ToArray();

// Train + Mondrian conformal + eval — dùng cho mọi fold/variant
(ITransformer Model, Func<string, string, double> QFor, double Mae) RunVariant(
    string name, bool withAlert,
    List<TransitSample> train, List<TransitSample> calib, List<TransitSample> test)
{
    var model = BuildPipeline(withAlert).Fit(ml.Data.LoadFromEnumerable(train));

    var calibRes = calib.Zip(Predict(model, calib),
        (s, p) => (s.Border, Regime: RegimeOf(s), Res: (double)Math.Abs(s.TransitDays - p))).ToList();

    double Q80(IEnumerable<double> xs)
    {
        var a = xs.OrderBy(x => x).ToArray();
        return a[(int)(0.80 * (a.Length - 1))];
    }
    var qGroup  = calibRes.GroupBy(r => (r.Border, r.Regime)).Where(g => g.Count() >= 80)
                          .ToDictionary(g => g.Key, g => Q80(g.Select(x => x.Res)));
    var qBorder = calibRes.GroupBy(r => r.Border)
                          .ToDictionary(g => g.Key, g => Q80(g.Select(x => x.Res)));
    var qGlobal = Q80(calibRes.Select(x => x.Res));
    double QFor(string border, string regime) =>
        qGroup.TryGetValue((border, regime), out var q) ? q
        : qBorder.TryGetValue(border, out var qb) ? qb : qGlobal;

    var preds = Predict(model, test);
    double sumAbs = 0, sumErr = 0, width = 0; int covered = 0;
    var byRegime = new Dictionary<string, (double abs, int n, int cov)>
        { ["normal"] = default, ["tet"] = default };
    for (var i = 0; i < test.Count; i++)
    {
        var s = test[i];
        var q = QFor(s.Border, RegimeOf(s));
        var (lo, hi) = (Math.Max(1, preds[i] - q), preds[i] + q);
        var abs = Math.Abs(preds[i] - s.TransitDays);
        var inside = s.TransitDays >= lo && s.TransitDays <= hi;
        sumAbs += abs; sumErr += s.TransitDays - preds[i]; width += hi - lo;
        if (inside) covered++;
        var r = byRegime[RegimeOf(s)];
        byRegime[RegimeOf(s)] = (r.abs + abs, r.n + 1, r.cov + (inside ? 1 : 0));
    }

    var n = test.Count;
    Console.WriteLine($"  {name,-34} MAE={sumAbs / n:0.000}  bias={sumErr / n:+0.000;-0.000}  " +
                      $"PICP={(double)covered / n:P1}  width={width / n:0.00}");
    foreach (var (regime, v) in byRegime.Where(kv => kv.Value.n > 0))
        Console.WriteLine($"      {regime,-7} MAE={v.abs / v.n:0.000}  PICP={(double)v.cov / v.n:P1}  n={v.n}");
    return (model, QFor, sumAbs / n);
}

// Heuristic Phase 8 (V1 — không alert) để so trên fold bất kỳ
void RunHeuristic(string name, List<TransitSample> test)
{
    double sumAbs = 0, sumErr = 0, width = 0; int covered = 0;
    foreach (var s in test)
    {
        (double lo, double hi) = s.Border switch
        {
            "HuuNghi" => (3.0, 5.0), "LaoCai" => (4.0, 6.0), _ => (4.0, 7.0),
        };
        if (s.Season == "tet") { lo += 3; hi += 5; }
        else if (s.Season == "winter") { lo += 1; hi += 1; }
        if (s.WeightKg >= 500) hi += 1;
        var point = (lo + hi) / 2;
        sumAbs += Math.Abs(point - s.TransitDays); sumErr += s.TransitDays - point;
        width += hi - lo;
        if (s.TransitDays >= lo && s.TransitDays <= hi) covered++;
    }
    var n = test.Count;
    Console.WriteLine($"  {name,-34} MAE={sumAbs / n:0.000}  bias={sumErr / n:+0.000;-0.000}  " +
                      $"PICP={(double)covered / n:P1}  width={width / n:0.00}");
}

// ── FOLD 1 — test mùa thường (≥T4/26), baseline Bước 2: MAE 1.491 ────────────
var f1Train = all.Where(s => s.Departure < new DateTime(2026, 1, 1)).ToList();
var f1Calib = all.Where(s => s.Departure >= new DateTime(2026, 1, 1) && s.Departure < new DateTime(2026, 4, 1)).ToList();
var f1Test  = all.Where(s => s.Departure >= new DateTime(2026, 4, 1)).ToList();
Console.WriteLine($"== FOLD 1 (test mùa thường, n={f1Test.Count}) ==");
RunHeuristic("heuristic V1", f1Test);
RunVariant("model v2 (không alert)", withAlert: false, f1Train, f1Calib, f1Test);
var (v3Model, _, _) = RunVariant("model v3 (CÓ alert, trễ 2d)", withAlert: true, f1Train, f1Calib, f1Test);

// ── FOLD 2 — walk-forward test Q1/26 CHỨA TẾT (calib 12/25 không có tết → q tết fallback) ──
var f2Train = all.Where(s => s.Departure < new DateTime(2025, 12, 1)).ToList();
var f2Calib = all.Where(s => s.Departure >= new DateTime(2025, 12, 1) && s.Departure < new DateTime(2026, 1, 1)).ToList();
var f2Test  = all.Where(s => s.Departure >= new DateTime(2026, 1, 1) && s.Departure < new DateTime(2026, 4, 1)).ToList();
Console.WriteLine($"\n== FOLD 2 (test Q1/26 chứa Tết, n={f2Test.Count}, tết={f2Test.Count(s => RegimeOf(s) == "tet")}) ==");
RunHeuristic("heuristic V1", f2Test);
RunVariant("model v2 (không alert)", withAlert: false, f2Train, f2Calib, f2Test);
RunVariant("model v3 (CÓ alert, trễ 2d)", withAlert: true, f2Train, f2Calib, f2Test);

// ── PERMUTATION IMPORTANCE (fold 1, model v3) — sanity check "sự thật ngầm" ──
Console.WriteLine("\n== PERMUTATION IMPORTANCE (ΔMAE khi xáo trộn feature, fold 1 / v3) ==");
var basePreds = Predict(v3Model, f1Test);
var baseMae = f1Test.Zip(basePreds, (s, p) => Math.Abs(s.TransitDays - p)).Average();
var rng = new Random(42);

List<TransitSample> Shuffled(Action<TransitSample, TransitSample> copyFrom)
{
    var clone = f1Test.Select(s => new TransitSample
    {
        Border = s.Border, Province = s.Province, Carrier = s.Carrier, Season = s.Season,
        WeightKg = s.WeightKg, Month = s.Month, IsBulk = s.IsBulk, AlertActive = s.AlertActive,
        TransitDays = s.TransitDays, Departure = s.Departure,
    }).ToList();
    var perm = Enumerable.Range(0, clone.Count).OrderBy(_ => rng.Next()).ToArray();
    for (var i = 0; i < clone.Count; i++) copyFrom(clone[i], f1Test[perm[i]]);
    return clone;
}

var features = new (string Name, Action<TransitSample, TransitSample> Copy)[]
{
    ("Border",      (d, src) => d.Border = src.Border),
    ("Province",    (d, src) => d.Province = src.Province),
    ("Carrier",     (d, src) => d.Carrier = src.Carrier),
    ("Season",      (d, src) => d.Season = src.Season),
    ("Weight+Bulk", (d, src) => { d.WeightKg = src.WeightKg; d.IsBulk = src.IsBulk; }),
    ("Month",       (d, src) => d.Month = src.Month),
    ("AlertActive", (d, src) => d.AlertActive = src.AlertActive),
};
foreach (var (name, copy) in features)
{
    var shuffled = Shuffled(copy);
    var mae = f1Test.Zip(Predict(v3Model, shuffled), (s, p) => Math.Abs(s.TransitDays - p)).Average();
    Console.WriteLine($"  {name,-12} ΔMAE = +{mae - baseMae:0.000}");
}

// ── Xuất model production = v3 (serve với alert thật từ AIBorderAlert) ────────
var outDir = Path.Combine(AppContext.BaseDirectory, "../../../models");
Directory.CreateDirectory(outDir);
var f1TrainDv = ml.Data.LoadFromEnumerable(f1Train);
ml.Model.Save(v3Model, f1TrainDv.Schema, Path.Combine(outDir, "leadtime.zip"));

// conformal.csv của v3 (fold 1)
var v3CalibRes = f1Calib.Zip(Predict(v3Model, f1Calib),
    (s, p) => (s.Border, Regime: RegimeOf(s), Res: (double)Math.Abs(s.TransitDays - p))).ToList();
double Q80All(IEnumerable<double> xs) { var a = xs.OrderBy(x => x).ToArray(); return a[(int)(0.80 * (a.Length - 1))]; }
var lines = new List<string> { "border,regime,q80" };
lines.AddRange(v3CalibRes.GroupBy(r => (r.Border, r.Regime)).Where(g => g.Count() >= 80)
    .Select(g => $"{g.Key.Border},{g.Key.Regime},{Q80All(g.Select(x => x.Res)).ToString("0.###", CultureInfo.InvariantCulture)}"));
lines.AddRange(v3CalibRes.GroupBy(r => r.Border)
    .Select(g => $"{g.Key},*,{Q80All(g.Select(x => x.Res)).ToString("0.###", CultureInfo.InvariantCulture)}"));
lines.Add($"*,*,{Q80All(v3CalibRes.Select(x => x.Res)).ToString("0.###", CultureInfo.InvariantCulture)}");
File.WriteAllLines(Path.Combine(outDir, "conformal.csv"), lines);
Console.WriteLine($"\nĐã lưu model v3 + conformal → {Path.GetFullPath(outDir)}");
return 0;
