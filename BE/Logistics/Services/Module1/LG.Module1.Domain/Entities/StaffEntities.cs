namespace LG.Module1.Domain.Entities;

// ── StaffWorkSetting — cấu hình vận hành của 1 nhân viên (keyed theo StaffId) ──
// Module 1 KHÔNG sở hữu User (Auth sở hữu). Bảng này chỉ lưu dữ liệu vận hành
// của NV trong phạm vi Module 1: trạng thái online, năng lực, ca làm.
public class StaffWorkSetting
{
    public Guid     Id                 { get; private set; } = Guid.NewGuid();
    public Guid     StaffId            { get; private set; }
    /// NV đang sẵn sàng nhận đơn (bật/tắt thủ công trên portal).
    public bool     IsAvailable        { get; private set; } = true;
    /// Có tham gia hàng đợi auto-assign không.
    public bool     AutoAssignEnabled  { get; private set; } = true;
    /// Số đơn active tối đa được phép gán đồng thời.
    public int      MaxConcurrentOrders { get; private set; } = 10;
    /// Giờ bắt đầu ca (local VN). null = không giới hạn theo ca.
    public TimeOnly? ShiftStartLocal   { get; private set; }
    public TimeOnly? ShiftEndLocal     { get; private set; }
    public DateTime? LastActiveAt      { get; private set; }
    public DateTime  CreatedAt         { get; private set; } = DateTime.UtcNow;
    public DateTime  UpdatedAt         { get; private set; } = DateTime.UtcNow;

    private StaffWorkSetting() { }

    public static StaffWorkSetting CreateDefault(Guid staffId) =>
        new() { StaffId = staffId };

    public void GoOnline()
    {
        IsAvailable  = true;
        LastActiveAt = DateTime.UtcNow;
        Touch();
    }

    public void GoOffline()
    {
        IsAvailable = false;
        Touch();
    }

    public void Heartbeat()
    {
        LastActiveAt = DateTime.UtcNow;
    }

    public void UpdateSettings(bool isAvailable, bool autoAssignEnabled, int maxConcurrent,
                               TimeOnly? shiftStart, TimeOnly? shiftEnd)
    {
        IsAvailable         = isAvailable;
        AutoAssignEnabled   = autoAssignEnabled;
        MaxConcurrentOrders = maxConcurrent < 1 ? 1 : maxConcurrent;
        ShiftStartLocal     = shiftStart;
        ShiftEndLocal       = shiftEnd;
        Touch();
    }

    /// NV có đang trong ca tại thời điểm localNow không.
    /// Không cấu hình ca → coi như luôn trong ca.
    public bool IsWithinShift(TimeOnly localNow)
    {
        if (ShiftStartLocal is null || ShiftEndLocal is null) return true;
        var start = ShiftStartLocal.Value;
        var end   = ShiftEndLocal.Value;
        // Ca qua nửa đêm (vd 22:00 → 06:00).
        return start <= end
            ? localNow >= start && localNow <= end
            : localNow >= start || localNow <= end;
    }

    private void Touch() => UpdatedAt = DateTime.UtcNow;
}

// ── StaffPerformanceDaily — tổng hợp KPI theo ngày (job aggregate ghi vào) ─────
public class StaffPerformanceDaily
{
    public Guid     Id                  { get; private set; } = Guid.NewGuid();
    public Guid     StaffId             { get; private set; }
    /// Ngày (UTC, phần date) mà bản ghi tổng hợp.
    public DateOnly Date                { get; private set; }
    public int      OrdersAssigned      { get; private set; }
    public int      OrdersCompleted     { get; private set; }
    public int      OnTimeCount         { get; private set; }
    public int      OverdueCount        { get; private set; }
    public int      CancelledCount      { get; private set; }
    public int      TotalHandlingMinutes { get; private set; }
    public DateTime UpdatedAt           { get; private set; } = DateTime.UtcNow;

    private StaffPerformanceDaily() { }

    public static StaffPerformanceDaily Create(Guid staffId, DateOnly date) =>
        new() { StaffId = staffId, Date = date };

    /// Ghi đè toàn bộ số liệu của ngày (job tính lại từ assignment).
    public void SetCounters(int assigned, int completed, int onTime, int overdue,
                            int cancelled, int totalHandlingMinutes)
    {
        OrdersAssigned       = assigned;
        OrdersCompleted      = completed;
        OnTimeCount          = onTime;
        OverdueCount         = overdue;
        CancelledCount       = cancelled;
        TotalHandlingMinutes = totalHandlingMinutes;
        UpdatedAt            = DateTime.UtcNow;
    }

    public int     AvgHandlingMinutes => OrdersCompleted > 0 ? TotalHandlingMinutes / OrdersCompleted : 0;
    public decimal OnTimeRate         => OrdersCompleted > 0 ? Math.Round((decimal)OnTimeCount / OrdersCompleted, 4) : 0m;
}

// ── StaffNotification — thông báo in-app cho NV ──────────────────────────────
public enum StaffNotificationType
{
    OrderAssigned   = 1,
    SlaWarning      = 2,
    SlaOverdue      = 3,
    ComplaintAssigned = 4,
    System          = 5,
}

public class StaffNotification
{
    public Guid     Id         { get; private set; } = Guid.NewGuid();
    public Guid     StaffId    { get; private set; }
    public StaffNotificationType Type { get; private set; }
    public string   Title      { get; private set; } = default!;
    public string   Body       { get; private set; } = default!;
    public Guid?    RefOrderId { get; private set; }
    public bool     IsRead     { get; private set; }
    public DateTime CreatedAt  { get; private set; } = DateTime.UtcNow;

    private StaffNotification() { }

    public static StaffNotification Create(Guid staffId, StaffNotificationType type,
                                           string title, string body, Guid? refOrderId = null) =>
        new()
        {
            StaffId    = staffId,
            Type       = type,
            Title      = title.Trim(),
            Body       = body.Trim(),
            RefOrderId = refOrderId,
        };

    public void MarkRead() => IsRead = true;
}
