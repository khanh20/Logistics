using LG.Module2.Domain.Entities;
using LG.Module2.Infrastructure.Data;
using LG.Module2.Seeder;
using Microsoft.EntityFrameworkCore;

// ── LG.Module2.Seeder — sinh dữ liệu tổng hợp cho bài toán ML dự báo lead time ──
// Dữ liệu mang PATTERN thật (baseline theo cửa khẩu, mùa/Tết, đợt tắc biên, tỉnh gửi,
// carrier TQ, cân nặng) để model có tín hiệu học được — KHÔNG phải noise thuần.
//
// Cách dùng:
//   dotnet run -- --rows 20000 --out transit_dataset.csv          # CSV cho dev ML (mặc định)
//   dotnet run -- --db --trips 3000 --conn "Host=localhost;..."   # ghi ContainerTrip vào DB local
//                                                                 #   (test scan tắc biên — bài toán 2)
//   Tuỳ chọn: --seed 42 (tái lập), --from 2024-01-01 (đầu khoảng thời gian), --force-remote

var opts = SeederOptions.Parse(args);
var gen  = new TransitDataGenerator(opts.Seed, opts.From, DateTime.UtcNow.Date);

if (opts.WriteDb)
{
    if (!opts.ForceRemote &&
        !opts.Conn.Contains("localhost", StringComparison.OrdinalIgnoreCase) &&
        !opts.Conn.Contains("127.0.0.1"))
    {
        Console.Error.WriteLine("TỪ CHỐI: connection string không phải localhost. " +
                                "Seed vào DB chung của team sẽ làm bẩn dữ liệu — dùng --force-remote nếu chắc chắn.");
        return 1;
    }

    var dbOpts = new DbContextOptionsBuilder<Module2DbContext>().UseNpgsql(opts.Conn).Options;
    await using var db = new Module2DbContext(dbOpts);

    var trips = gen.GenerateTrips(opts.Trips);
    db.Set<ContainerTrip>().AddRange(trips);
    await db.SaveChangesAsync();
    Console.WriteLine($"Đã ghi {trips.Count} ContainerTrip (SEED*) vào DB.");
    return 0;
}

var rows = gen.GeneratePackageRows(opts.Rows);
await using (var w = new StreamWriter(opts.OutPath))
{
    await w.WriteLineAsync("departure_date,origin_province_cn,carrier_cn,border_crossing," +
                           "weight_kg,month,season,is_tet_window,congestion_active,alert_active,transit_days");
    foreach (var r in rows)
        await w.WriteLineAsync(
            $"{r.DepartureDate:yyyy-MM-dd},{r.OriginProvinceCn},{r.CarrierCn},{r.Border}," +
            $"{r.WeightKg:0.##},{r.DepartureDate.Month},{r.Season},{(r.IsTetWindow ? 1 : 0)}," +
            $"{(r.CongestionActive ? 1 : 0)},{(r.AlertActive ? 1 : 0)},{r.TransitDays:0.#}");
}

Console.WriteLine($"Đã sinh {rows.Count} dòng → {opts.OutPath}");

// Thống kê nhanh để mắt thường kiểm tra tín hiệu có đúng thiết kế không
foreach (var g in rows.GroupBy(r => r.Border).OrderBy(g => g.Key))
    Console.WriteLine($"  {g.Key,-8}: n={g.Count(),6}, avg={g.Average(r => r.TransitDays):0.00} ngày");
Console.WriteLine($"  Tết      : avg={rows.Where(r => r.IsTetWindow).Average(r => r.TransitDays):0.00} " +
                  $"vs thường {rows.Where(r => !r.IsTetWindow).Average(r => r.TransitDays):0.00}");
Console.WriteLine($"  Tắc biên : avg={rows.Where(r => r.CongestionActive).Average(r => r.TransitDays):0.00} " +
                  $"vs thường {rows.Where(r => !r.CongestionActive).Average(r => r.TransitDays):0.00}");
return 0;
