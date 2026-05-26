namespace LG.Module2.Domain.Entities;

// ── SplitMergeAction ──────────────────────────────────────────────────────────
public enum SplitMergeAction { Split = 1, Merge = 2 }

// ── SplitMergeHistory ─────────────────────────────────────────────────────────
public class SplitMergeHistory
{
    public Guid             Id               { get; private set; } = Guid.NewGuid();
    public SplitMergeAction Action           { get; private set; }
    public Guid             ParentPackageId  { get; private set; }
    public string           ChildPackageIds  { get; private set; } = default!;  // JSON array of UUIDs
    public string?          Reason           { get; private set; }
    public Guid             DoneBy           { get; private set; }  // staff_id
    public DateTime         DoneAt           { get; private set; } = DateTime.UtcNow;

    private SplitMergeHistory() { }

    public static SplitMergeHistory Record(SplitMergeAction action, Guid parentPackageId,
                                            IEnumerable<Guid> childPackageIds, Guid doneBy,
                                            string? reason = null) =>
        new()
        {
            Action          = action,
            ParentPackageId = parentPackageId,
            ChildPackageIds = System.Text.Json.JsonSerializer.Serialize(childPackageIds),
            DoneBy          = doneBy,
            Reason          = reason?.Trim(),
        };
}

// ── MissingClaimStatus ────────────────────────────────────────────────────────
public enum MissingClaimStatus
{
    Submitted   = 1,
    Investigating = 2,
    Confirmed   = 3,   // Xác nhận thất lạc
    Resolved    = 4,
    Rejected    = 5,
}

// ── MissingClaimResolution ────────────────────────────────────────────────────
public enum MissingClaimResolution { Refund = 1, Reship = 2, Rejected = 3 }

// ── MissingClaim ──────────────────────────────────────────────────────────────
public class MissingClaim
{
    public Guid                   Id                    { get; private set; } = Guid.NewGuid();
    public Guid                   PackageId             { get; private set; }
    public Guid                   CustomerId            { get; private set; }
    public MissingClaimStatus     Status                { get; private set; } = MissingClaimStatus.Submitted;
    public decimal?               ClaimedValueVnd       { get; private set; }
    public decimal?               InsuranceCoveragePct  { get; private set; }  // 0.5 hoặc 1.0
    public decimal?               ResolvedAmountVnd     { get; private set; }
    public MissingClaimResolution? Resolution           { get; private set; }
    public string?                StaffNote             { get; private set; }
    public DateTime               CreatedAt             { get; private set; } = DateTime.UtcNow;
    public DateTime               UpdatedAt             { get; private set; } = DateTime.UtcNow;

    public Package Package { get; private set; } = default!;

    private MissingClaim() { }

    public static MissingClaim Submit(Guid packageId, Guid customerId,
                                       decimal? claimedValueVnd = null,
                                       decimal? insuranceCoveragePct = null) =>
        new()
        {
            PackageId            = packageId,
            CustomerId           = customerId,
            ClaimedValueVnd      = claimedValueVnd,
            InsuranceCoveragePct = insuranceCoveragePct,
        };

    public void Investigate(string? staffNote = null)
    {
        Status    = MissingClaimStatus.Investigating;
        StaffNote = staffNote;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Resolve(MissingClaimResolution resolution, decimal? resolvedAmount = null)
    {
        Status            = MissingClaimStatus.Resolved;
        Resolution        = resolution;
        ResolvedAmountVnd = resolvedAmount;
        UpdatedAt         = DateTime.UtcNow;
    }

    public void Reject(string reason)
    {
        Status    = MissingClaimStatus.Rejected;
        Resolution = MissingClaimResolution.Rejected;
        StaffNote = reason;
        UpdatedAt = DateTime.UtcNow;
    }
}

// ── InsuranceClaimStatus ──────────────────────────────────────────────────────
public enum InsuranceClaimStatus
{
    Submitted  = 1,
    UnderReview = 2,
    Approved   = 3,
    Rejected   = 4,
    Paid       = 5,
}

// ── InsuranceClaim ────────────────────────────────────────────────────────────
public class InsuranceClaim
{
    public Guid                  Id              { get; private set; } = Guid.NewGuid();
    public Guid                  PackageId       { get; private set; }
    public Guid                  OrderId         { get; private set; }
    public Guid?                 MissingClaimId  { get; private set; }
    public InsuranceClaimStatus  Status          { get; private set; } = InsuranceClaimStatus.Submitted;
    public string?               DamagePhotos    { get; private set; }  // JSON array of URLs
    public string?               AdjusterNote    { get; private set; }
    public decimal?              ApprovedAmount  { get; private set; }
    public DateTime              CreatedAt       { get; private set; } = DateTime.UtcNow;
    public DateTime              UpdatedAt       { get; private set; } = DateTime.UtcNow;

    public Package Package { get; private set; } = default!;

    private InsuranceClaim() { }

    public static InsuranceClaim Submit(Guid packageId, Guid orderId,
                                         Guid? missingClaimId = null,
                                         IEnumerable<string>? damagePhotoUrls = null) =>
        new()
        {
            PackageId      = packageId,
            OrderId        = orderId,
            MissingClaimId = missingClaimId,
            DamagePhotos   = damagePhotoUrls is not null
                ? System.Text.Json.JsonSerializer.Serialize(damagePhotoUrls)
                : null,
        };

    public void Approve(decimal approvedAmount, string? adjusterNote = null)
    {
        Status         = InsuranceClaimStatus.Approved;
        ApprovedAmount = approvedAmount;
        AdjusterNote   = adjusterNote;
        UpdatedAt      = DateTime.UtcNow;
    }

    public void Reject(string reason)
    {
        Status       = InsuranceClaimStatus.Rejected;
        AdjusterNote = reason;
        UpdatedAt    = DateTime.UtcNow;
    }

    public void MarkPaid()
    {
        Status    = InsuranceClaimStatus.Paid;
        UpdatedAt = DateTime.UtcNow;
    }
}

// ── StoragePenalty ────────────────────────────────────────────────────────────
public class StoragePenalty
{
    public Guid      Id             { get; private set; } = Guid.NewGuid();
    public Guid      PackageId      { get; private set; }
    public Guid      CustomerId     { get; private set; }
    public int       FreeDays       { get; private set; } = 7;    // Cấu hình theo VIP tier
    public int       TotalDays      { get; private set; }
    public decimal   DailyRateVnd   { get; private set; }
    public decimal   TotalFeeVnd    { get; private set; }
    public bool      IsCharged      { get; private set; }
    public DateTime? AutoChargedAt  { get; private set; }
    public DateTime  CreatedAt      { get; private set; } = DateTime.UtcNow;

    public Package Package { get; private set; } = default!;

    private StoragePenalty() { }

    public static StoragePenalty Calculate(Guid packageId, Guid customerId, int totalDays,
                                            decimal dailyRateVnd, int freeDays = 7)
    {
        var billableDays = Math.Max(0, totalDays - freeDays);
        return new()
        {
            PackageId    = packageId,
            CustomerId   = customerId,
            FreeDays     = freeDays,
            TotalDays    = totalDays,
            DailyRateVnd = dailyRateVnd,
            TotalFeeVnd  = billableDays * dailyRateVnd,
        };
    }

    public void MarkCharged()
    {
        IsCharged      = true;
        AutoChargedAt  = DateTime.UtcNow;
    }
}
