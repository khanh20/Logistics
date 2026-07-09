using LG.Module2.Domain.Entities;

namespace LG.Module2.Seeder;

/// 1 dòng dataset mức kiện hàng — khớp 1:1 với input của TransitForecastRequest + label.
public record PackageRow(
    DateTime       DepartureDate,
    string         OriginProvinceCn,
    string         CarrierCn,
    BorderCrossing Border,
    double         WeightKg,
    string         Season,
    bool           IsTetWindow,       // LƯU Ý: tương đương season=="tet" — khi train chỉ dùng 1 trong 2
    bool           CongestionActive,  // ground truth tắc biên — KHÔNG dùng làm feature (leakage)
    bool           AlertActive,       // alert hệ thống bật (phát hiện TRỄ 2 ngày sau khi tắc bắt đầu)
                                      // — DÙNG ĐƯỢC làm feature: lúc predict có thật từ AIBorderAlert
    double         TransitDays        // LABEL: TOÀN HÀNH TRÌNH shop gửi hàng → nhập kho VN
                                      // (gồm cả chặng nội địa TQ — vì thế tỉnh gửi/carrier TQ mới là feature;
                                      //  ground truth thật sau này đo từ ChinaWaybill/CnWarehouseIn → VnWarehouseIn)
);

/// Sinh dữ liệu tổng hợp mô phỏng vận hành TQ→VN. Mọi hệ số dưới đây là "sự thật ngầm"
/// (ground truth) mà model sẽ phải học lại — chỉnh ở đây nếu muốn bài toán khó/dễ hơn.
public class TransitDataGenerator(int seed, DateTime from, DateTime to)
{
    private readonly Random _rng = new(seed);

    // ── Sự thật ngầm của thế giới mô phỏng ────────────────────────────────────────
    // Baseline khớp heuristic Phase 8 (Hữu Nghị 3-5 / Lào Cai 4-6 / Móng Cái 4-7 ngày)
    private static readonly Dictionary<BorderCrossing, (double Mean, double Std, double Share)> Borders = new()
    {
        [BorderCrossing.HuuNghi] = (3.8, 0.7, 0.55),
        [BorderCrossing.LaoCai]  = (4.7, 0.9, 0.25),
        [BorderCrossing.MongCai] = (5.3, 1.1, 0.20),
    };

    // Tỉnh gửi: xa cửa khẩu hơn = cộng ngày (chặng nội địa TQ)
    private static readonly (string Name, double Extra, double Share)[] Provinces =
    {
        ("Quảng Châu", 0.0, 0.40),
        ("Thâm Quyến", 0.2, 0.20),
        ("Nghĩa Ô",    0.5, 0.20),
        ("Hàng Châu",  0.6, 0.10),
        ("Bắc Kinh",   1.2, 0.06),
        ("Thành Đô",   1.5, 0.04),
    };

    private static readonly (string Name, double Extra, double Share)[] Carriers =
    {
        ("SF Express",   -0.4, 0.25),
        ("YTO",           0.1, 0.20),
        ("ZTO",           0.3, 0.30),
        ("Yunda",         0.4, 0.15),
        ("Best Express",  0.5, 0.10),
    };

    // Tết âm lịch (cửa khẩu nghỉ + dồn hàng): cửa sổ -14..+7 ngày quanh mùng 1
    private static readonly DateTime[] TetDates =
    {
        new(2024, 2, 10), new(2025, 1, 29), new(2026, 2, 17), new(2027, 2, 6),
    };

    // Đợt tắc biên ngẫu nhiên theo từng cửa khẩu (~8 đợt/năm, kéo dài 3-10 ngày, chậm 1.3-2.5×)
    private readonly Dictionary<BorderCrossing, List<(DateTime Start, DateTime End, double Multiplier)>>
        _congestions = new();

    public List<PackageRow> GeneratePackageRows(int count)
    {
        EnsureCongestionEpisodes();
        var rows = new List<PackageRow>(count);
        for (var i = 0; i < count; i++)
        {
            var departure = RandomDate();
            var border    = PickBorder();
            var province  = Pick(Provinces);
            var carrier   = Pick(Carriers);
            var weight    = Math.Round(Math.Exp(_rng.NextDouble() * 3.5) * 0.8, 2); // ~0.8-26kg, đuôi dài
            if (_rng.NextDouble() < 0.03) weight = Math.Round(500 + _rng.NextDouble() * 1500, 2); // 3% hàng lô lớn

            var days = TransitDaysFor(departure, border, province.Extra, carrier.Extra, weight,
                                      out var isTet, out var congested, out var alertActive);

            rows.Add(new PackageRow(departure, province.Name, carrier.Name, border, weight,
                SeasonOf(departure, isTet), isTet, congested, alertActive, days));
        }
        return rows;
    }

    /// ContainerTrip lịch sử (Departed→ArrivedVn) — cho scan tắc biên (bài toán 2) và train từ DB sau này.
    public List<ContainerTrip> GenerateTrips(int count)
    {
        EnsureCongestionEpisodes();
        var trips = new List<ContainerTrip>(count);
        for (var i = 0; i < count; i++)
        {
            var departure = RandomDate().AddHours(6 + _rng.NextDouble() * 12);
            var border    = PickBorder();
            var days      = TransitDaysFor(departure, border, provinceExtra: 0, carrierExtra: 0,
                                           weightKg: 0, out _, out _, out _);

            var trip = ContainerTrip.Create(
                tripCode:       $"SEED{i:D5}",
                borderCrossing: border,
                vehiclePlate:   $"29C-{_rng.Next(10000, 99999)}",
                driverPhone:    $"09{_rng.Next(10000000, 99999999)}",
                etaVn:          departure.AddDays(4));
            trip.Depart(departure);
            trip.ReachBorder();
            trip.ArriveVietnam(departure.AddDays(days));
            trips.Add(trip);
        }
        return trips;
    }

    // Alert nội bộ phát hiện tắc biên TRỄ vài ngày (cần chuyến chậm tích luỹ mới bật)
    private const int AlertDetectionLagDays = 2;

    // ── Công thức sinh label ──────────────────────────────────────────────────────
    private double TransitDaysFor(DateTime departure, BorderCrossing border,
                                  double provinceExtra, double carrierExtra, double weightKg,
                                  out bool isTet, out bool congested, out bool alertActive)
    {
        var (mean, std, _) = Borders[border];
        var days = Gaussian(mean, std);

        days += provinceExtra + carrierExtra;
        if (weightKg >= 500) days += 0.8;                       // hàng lô lớn bốc xếp lâu hơn

        isTet = TetDates.Any(t => departure >= t.AddDays(-14) && departure <= t.AddDays(7));
        if (isTet) days += Gaussian(3.5, 1.0);                  // cận Tết: nghỉ lễ + dồn hàng

        if (departure.Month == 10 && departure.Day <= 7) days += 1.5;   // Golden Week TQ
        if (departure.Month is 6 or 7 or 8) days += 0.3;                // hè: mưa lũ nhẹ
        if (departure.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday) days += 0.4;

        var episode = _congestions[border]
            .FirstOrDefault(e => departure >= e.Start && departure <= e.End);
        congested   = episode != default;
        alertActive = congested && departure >= episode.Start.AddDays(AlertDetectionLagDays);
        if (congested) days *= episode.Multiplier;              // đợt tắc biên: nhân hệ số

        days += Gaussian(0, 0.5);                               // nhiễu vận hành
        if (_rng.NextDouble() < 0.02) days += 2 + _rng.NextDouble() * 4;  // 2% outlier (giữ hàng lẻ tẻ)

        return Math.Round(Math.Max(1.0, days), 1);
    }

    private void EnsureCongestionEpisodes()
    {
        if (_congestions.Count > 0) return;
        foreach (var border in Borders.Keys)
        {
            var list = new List<(DateTime, DateTime, double)>();
            var episodesPerYear = 8;
            var totalDays = (to - from).TotalDays;
            var episodeCount = (int)(episodesPerYear * totalDays / 365.0);
            for (var i = 0; i < episodeCount; i++)
            {
                var start = from.AddDays(_rng.NextDouble() * totalDays);
                var end   = start.AddDays(3 + _rng.NextDouble() * 7);
                var mult  = 1.3 + _rng.NextDouble() * 1.2;
                list.Add((start, end, mult));
            }
            _congestions[border] = list;
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────────
    private DateTime RandomDate() => from.AddDays(_rng.NextDouble() * (to - from).TotalDays).Date;

    private BorderCrossing PickBorder()
    {
        var roll = _rng.NextDouble();
        var acc  = 0.0;
        foreach (var (border, cfg) in Borders)
        {
            acc += cfg.Share;
            if (roll <= acc) return border;
        }
        return BorderCrossing.MongCai;
    }

    private (string Name, double Extra, double Share) Pick((string, double, double)[] options)
    {
        var roll = _rng.NextDouble();
        var acc  = 0.0;
        foreach (var o in options)
        {
            acc += o.Item3;
            if (roll <= acc) return o;
        }
        return options[^1];
    }

    private double Gaussian(double mean, double std)
    {
        // Box-Muller
        var u1 = 1.0 - _rng.NextDouble();
        var u2 = _rng.NextDouble();
        return mean + std * Math.Sqrt(-2.0 * Math.Log(u1)) * Math.Sin(2.0 * Math.PI * u2);
    }

    private static string SeasonOf(DateTime d, bool isTet) => isTet ? "tet" : d.Month switch
    {
        3 or 4 or 5   => "spring",
        6 or 7 or 8   => "summer",
        9 or 10 or 11 => "autumn",
        _             => "winter",
    };
}

// ── Arg parsing ──────────────────────────────────────────────────────────────────
public record SeederOptions(
    int Rows, int Trips, string OutPath, bool WriteDb, string Conn,
    int Seed, DateTime From, bool ForceRemote)
{
    public static SeederOptions Parse(string[] args)
    {
        string Get(string name, string fallback)
        {
            var i = Array.IndexOf(args, "--" + name);
            return i >= 0 && i + 1 < args.Length ? args[i + 1] : fallback;
        }
        bool Has(string name) => Array.IndexOf(args, "--" + name) >= 0;

        return new SeederOptions(
            Rows:        int.Parse(Get("rows", "20000")),
            Trips:       int.Parse(Get("trips", "3000")),
            OutPath:     Get("out", "transit_dataset.csv"),
            WriteDb:     Has("db"),
            Conn:        Get("conn", Environment.GetEnvironmentVariable("DATABASE_URL")
                                     ?? "Host=localhost;Port=5432;Database=muaho_mod2;Username=postgres;Password=postgres"),
            Seed:        int.Parse(Get("seed", "42")),
            From:        DateTime.Parse(Get("from", "2024-01-01")),
            ForceRemote: Has("force-remote"));
    }
}
