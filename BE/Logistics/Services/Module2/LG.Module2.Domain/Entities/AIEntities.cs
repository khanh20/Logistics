namespace LG.Module2.Domain.Entities;

// ── AITransitForecast ─────────────────────────────────────────────────────────
public class AITransitForecast
{
    public Guid     Id                { get; private set; } = Guid.NewGuid();
    public string   OriginProvinceCn  { get; private set; } = default!;
    public decimal  WeightKg          { get; private set; }
    public string   CarrierCn         { get; private set; } = default!;
    public BorderCrossing BorderCrossing { get; private set; }
    public string?  Season            { get; private set; }  // spring / summer / autumn / winter / tet
    public int      EstDaysMin        { get; private set; }
    public int      EstDaysMax        { get; private set; }
    public decimal  ConfidencePct     { get; private set; }  // 0.0 – 1.0
    public DateTime ForecastedAt      { get; private set; } = DateTime.UtcNow;

    private AITransitForecast() { }

    public static AITransitForecast Create(string originProvinceCn, decimal weightKg,
                                            string carrierCn, BorderCrossing borderCrossing,
                                            int estDaysMin, int estDaysMax, decimal confidencePct,
                                            string? season = null) =>
        new()
        {
            OriginProvinceCn = originProvinceCn.Trim(),
            WeightKg         = weightKg,
            CarrierCn        = carrierCn.Trim(),
            BorderCrossing   = borderCrossing,
            Season           = season?.Trim().ToLower(),
            EstDaysMin       = estDaysMin,
            EstDaysMax       = estDaysMax,
            ConfidencePct    = confidencePct,
        };
}

// ── AlertSeverity ─────────────────────────────────────────────────────────────
public enum AlertSeverity { Low = 1, Medium = 2, High = 3, Critical = 4 }

// ── AlertSource ───────────────────────────────────────────────────────────────
public enum AlertSource { NewsScrape = 1, InternalData = 2 }

// ── AIBorderAlert ─────────────────────────────────────────────────────────────
public class AIBorderAlert
{
    public Guid           Id                      { get; private set; } = Guid.NewGuid();
    public BorderCrossing AffectedBorder          { get; private set; }
    public AlertSeverity  Severity                { get; private set; }
    public AlertSource    Source                  { get; private set; }
    public int?           EstimatedDelayDays      { get; private set; }
    public string?        Description             { get; private set; }
    public int            NotifiedCustomersCount  { get; private set; }
    public bool           IsActive                { get; private set; } = true;
    public DateTime       CreatedAt               { get; private set; } = DateTime.UtcNow;
    public DateTime?      ResolvedAt              { get; private set; }

    private AIBorderAlert() { }

    public static AIBorderAlert Create(BorderCrossing affectedBorder, AlertSeverity severity,
                                        AlertSource source, int? estimatedDelayDays = null,
                                        string? description = null) =>
        new()
        {
            AffectedBorder     = affectedBorder,
            Severity           = severity,
            Source             = source,
            EstimatedDelayDays = estimatedDelayDays,
            Description        = description?.Trim(),
        };

    public void MarkNotified(int customerCount)
    {
        NotifiedCustomersCount = customerCount;
    }

    public void Resolve()
    {
        IsActive   = false;
        ResolvedAt = DateTime.UtcNow;
    }
}
