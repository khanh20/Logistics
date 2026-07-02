using LG.Module2.ApplicationServices.DTOs.AI;
using LG.Module2.ApplicationServices.Interfaces;
using LG.Module2.Domain.Entities;
using LG.Module2.Domain.Exceptions;
using LG.Module2.Domain.Repositories;
using Microsoft.Extensions.Logging;

namespace LG.Module2.ApplicationServices.Services;

/// Phase 8 — STUB rule-based. API contract giữ nguyên khi thay ruột:
/// forecast → ML.NET train trên ContainerTrip/TrackingEvent lịch sử;
/// border alert nguồn NewsScrape → Claude API structured outputs.
public class AIForecastService(
    IAITransitForecastRepository forecastRepo,
    IAIBorderAlertRepository     alertRepo,
    IContainerTripRepository     tripRepo,
    IPackageRepository           packageRepo,
    INotificationService         notifier,
    IModule2UnitOfWork           uow,
    ILogger<AIForecastService>   logger
) : IAIForecastService
{
    // Baseline lead time (ngày) theo cửa khẩu — số liệu vận hành ước tính, sẽ thay bằng model thật
    private static readonly Dictionary<BorderCrossing, (int Min, int Max)> BorderBaseline = new()
    {
        [BorderCrossing.HuuNghi] = (3, 5),
        [BorderCrossing.LaoCai]  = (4, 6),
        [BorderCrossing.MongCai] = (4, 7),
    };

    // Ngưỡng phát hiện tắc biên từ dữ liệu nội bộ
    private const int    ScanRecentDays    = 7;
    private const int    ScanBaselineDays  = 30;
    private const int    ScanMinRecentTrips = 3;
    private const double ScanSlowdownRatio = 1.5;   // recent avg > 1.5× baseline → alert

    // ── Transit forecast ──────────────────────────────────────────────────────
    public async Task<TransitForecastResponse> ForecastTransitAsync(TransitForecastRequest req, CancellationToken ct = default)
    {
        var season = string.IsNullOrWhiteSpace(req.Season) ? InferSeason(DateTime.UtcNow) : req.Season.Trim().ToLower();

        var (min, max) = BorderBaseline.TryGetValue(req.BorderCrossing, out var baseline) ? baseline : (4, 7);
        var confidence = 0.60m;

        // Mùa cao điểm
        switch (season)
        {
            case "tet":    min += 3; max += 5; confidence -= 0.10m; break;
            case "winter": min += 1; max += 1; confidence -= 0.02m; break;
        }

        // Hàng nặng/cồng kềnh đi chậm hơn (chờ gom đủ chuyến)
        if (req.WeightKg >= 500m) max += 1;

        // Cảnh báo tắc biên đang active trên cửa khẩu này
        var activeAlerts = await alertRepo.GetActiveByBorderAsync(req.BorderCrossing, ct);
        var alertApplied = activeAlerts.Count > 0;
        if (alertApplied)
        {
            var delay = activeAlerts.Max(a => a.EstimatedDelayDays) ?? 2;
            min += delay;
            max += delay;
            confidence -= 0.10m;
        }

        confidence = Math.Clamp(confidence, 0.30m, 0.90m);

        var forecast = AITransitForecast.Create(
            req.OriginProvinceCn, req.WeightKg, req.CarrierCn, req.BorderCrossing,
            min, max, confidence, season);

        await forecastRepo.AddAsync(forecast, ct);
        await uow.SaveChangesAsync(ct);

        logger.LogInformation("[AI-STUB] Forecast {Origin}→VN via {Border} ({Season}): {Min}-{Max} days, conf={Conf}",
            req.OriginProvinceCn, req.BorderCrossing, season, min, max, confidence);

        return MapForecast(forecast, alertApplied);
    }

    public async Task<List<TransitForecastResponse>> GetRecentForecastsAsync(int limit = 20, CancellationToken ct = default)
    {
        var list = await forecastRepo.GetRecentAsync(Math.Clamp(limit, 1, 100), ct);
        return list.Select(f => MapForecast(f, alertApplied: false)).ToList();
    }

    // ── Border alerts ─────────────────────────────────────────────────────────
    public async Task<BorderAlertResponse> CreateBorderAlertAsync(CreateBorderAlertRequest req, CancellationToken ct = default)
    {
        var alert = AIBorderAlert.Create(req.AffectedBorder, req.Severity, AlertSource.InternalData,
                                          req.EstimatedDelayDays, req.Description);
        await alertRepo.AddAsync(alert, ct);
        await NotifyAffectedCustomersAsync(alert, ct);
        await uow.SaveChangesAsync(ct);
        return MapAlert(alert);
    }

    public async Task<List<BorderAlertResponse>> GetActiveBorderAlertsAsync(CancellationToken ct = default)
    {
        var list = await alertRepo.GetActiveAsync(ct);
        return list.Select(MapAlert).ToList();
    }

    public async Task<BorderAlertResponse> GetBorderAlertAsync(Guid id, CancellationToken ct = default)
    {
        var alert = await alertRepo.GetByIdAsync(id, ct) ?? throw new BorderAlertNotFoundException(id);
        return MapAlert(alert);
    }

    public async Task<BorderAlertResponse> ResolveBorderAlertAsync(Guid id, CancellationToken ct = default)
    {
        var alert = await alertRepo.GetByIdAsync(id, ct) ?? throw new BorderAlertNotFoundException(id);
        if (!alert.IsActive) throw new BorderAlertAlreadyResolvedException(id);

        alert.Resolve();
        await alertRepo.UpdateAsync(alert, ct);
        await uow.SaveChangesAsync(ct);
        return MapAlert(alert);
    }

    // ── Congestion scan (nguồn InternalData) ──────────────────────────────────
    public async Task<CongestionScanResult> ScanBorderCongestionAsync(CancellationToken ct = default)
    {
        var now     = DateTime.UtcNow;
        var created = new List<AIBorderAlert>();
        var borders = Enum.GetValues<BorderCrossing>();

        foreach (var border in borders)
        {
            // Cửa khẩu đã có cảnh báo active → không tạo trùng
            var existing = await alertRepo.GetActiveByBorderAsync(border, ct);
            if (existing.Count > 0) continue;

            var recent   = await tripRepo.GetArrivedBetweenAsync(border, now.AddDays(-ScanRecentDays), now, ct);
            var baseline = await tripRepo.GetArrivedBetweenAsync(border, now.AddDays(-(ScanRecentDays + ScanBaselineDays)), now.AddDays(-ScanRecentDays), ct);

            var recentHours   = AvgTransitHours(recent);
            var baselineHours = AvgTransitHours(baseline);
            if (recentHours is null || baselineHours is null || recent.Count < ScanMinRecentTrips) continue;

            var ratio = recentHours.Value / baselineHours.Value;
            if (ratio < ScanSlowdownRatio) continue;

            var severity = ratio switch
            {
                >= 3.0 => AlertSeverity.Critical,
                >= 2.0 => AlertSeverity.High,
                _      => AlertSeverity.Medium,
            };
            var delayDays = (int)Math.Ceiling((recentHours.Value - baselineHours.Value) / 24.0);

            var alert = AIBorderAlert.Create(border, severity, AlertSource.InternalData, delayDays,
                $"Phát hiện từ dữ liệu nội bộ: thời gian qua biên trung bình {recentHours:F0}h "
              + $"(baseline {baselineHours:F0}h, chậm {ratio:F1}×) trên {recent.Count} chuyến {ScanRecentDays} ngày gần nhất.");

            await alertRepo.AddAsync(alert, ct);
            await NotifyAffectedCustomersAsync(alert, ct);
            created.Add(alert);

            logger.LogWarning("[AI-STUB] Border congestion detected at {Border}: {Recent:F0}h vs baseline {Baseline:F0}h ({Ratio:F1}x)",
                border, recentHours, baselineHours, ratio);
        }

        if (created.Count > 0) await uow.SaveChangesAsync(ct);

        return new CongestionScanResult(borders.Length, created.Count, created.Select(MapAlert).ToList());
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    private static double? AvgTransitHours(List<ContainerTrip> trips)
    {
        var durations = trips
            .Where(t => t.DepartureCnAt != null && t.ArrivedVnAt != null && t.ArrivedVnAt > t.DepartureCnAt)
            .Select(t => (t.ArrivedVnAt!.Value - t.DepartureCnAt!.Value).TotalHours)
            .ToList();
        return durations.Count == 0 ? null : durations.Average();
    }

    /// Notify khách có kiện đang trên đường (InTransit/Customs) khi cảnh báo mức High trở lên.
    private async Task NotifyAffectedCustomersAsync(AIBorderAlert alert, CancellationToken ct)
    {
        if (alert.Severity < AlertSeverity.High) return;

        var inTransit = await packageRepo.GetByStatusAsync(PackageStatus.InTransit, ct);
        var inCustoms = await packageRepo.GetByStatusAsync(PackageStatus.Customs, ct);
        var customers = inTransit.Concat(inCustoms).Select(p => p.CustomerId).Distinct().ToList();

        foreach (var customerId in customers)
            await notifier.SendBorderAlertAsync(customerId, alert.AffectedBorder.ToString(),
                alert.Severity.ToString(), alert.EstimatedDelayDays, ct);

        alert.MarkNotified(customers.Count);
    }

    private static string InferSeason(DateTime utcNow) => utcNow.Month switch
    {
        1 or 2       => "tet",
        3 or 4 or 5  => "spring",
        6 or 7 or 8  => "summer",
        9 or 10 or 11 => "autumn",
        _            => "winter",
    };

    private static TransitForecastResponse MapForecast(AITransitForecast f, bool alertApplied) => new(
        Id:                 f.Id,
        OriginProvinceCn:   f.OriginProvinceCn,
        WeightKg:           f.WeightKg,
        CarrierCn:          f.CarrierCn,
        BorderCrossing:     f.BorderCrossing.ToString(),
        Season:             f.Season,
        EstDaysMin:         f.EstDaysMin,
        EstDaysMax:         f.EstDaysMax,
        ConfidencePct:      f.ConfidencePct,
        BorderAlertApplied: alertApplied,
        ForecastedAt:       f.ForecastedAt
    );

    private static BorderAlertResponse MapAlert(AIBorderAlert a) => new(
        Id:                     a.Id,
        AffectedBorder:         a.AffectedBorder.ToString(),
        Severity:               a.Severity.ToString(),
        Source:                 a.Source.ToString(),
        EstimatedDelayDays:     a.EstimatedDelayDays,
        Description:            a.Description,
        NotifiedCustomersCount: a.NotifiedCustomersCount,
        IsActive:               a.IsActive,
        CreatedAt:              a.CreatedAt,
        ResolvedAt:             a.ResolvedAt
    );
}
