namespace LG.Module1.Domain.Entities;

// ─── ProductCategory ──────────────────────────────────────────────────────────
public class ProductCategory
{
    public Guid    Id        { get; private set; } = Guid.NewGuid();
    public Guid?   ParentId  { get; private set; }
    public string  NameVn    { get; private set; } = default!;
    public string? NameCn    { get; private set; }
    public string  Slug      { get; private set; } = default!;
    public string? IconUrl   { get; private set; }
    public int     SortOrder { get; private set; }
    public bool    IsActive  { get; private set; } = true;
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;

    // Navigation
    public ProductCategory?             Parent   { get; private set; }
    public ICollection<ProductCategory> Children { get; private set; } = new List<ProductCategory>();
    public ICollection<ProductMaster>   Products { get; private set; } = new List<ProductMaster>();

    private ProductCategory() { }

    public static ProductCategory Create(string nameVn, string slug,
                                          string? nameCn = null, Guid? parentId = null,
                                          string? iconUrl = null, int sortOrder = 0) =>
        new()
        {
            NameVn = nameVn.Trim(), NameCn = nameCn?.Trim(),
            Slug = slug.Trim().ToLowerInvariant(), ParentId = parentId,
            IconUrl = iconUrl, SortOrder = sortOrder,
        };

    public void Update(string nameVn, string? nameCn, string slug, int sortOrder, bool isActive)
    {
        NameVn    = nameVn.Trim();
        NameCn    = nameCn?.Trim();
        Slug      = slug.Trim().ToLowerInvariant();
        SortOrder = sortOrder;
        IsActive  = isActive;
    }
}

// ─── ForbiddenCategory ────────────────────────────────────────────────────────
public class ForbiddenCategory
{
    public Guid    Id          { get; private set; } = Guid.NewGuid();
    public string  Name        { get; private set; } = default!;
    /// Từ khóa tiếng Trung, phân cách dấu phẩy. VD: "锂电池,锂电"
    public string? KeywordsCn  { get; private set; }
    /// Từ khóa tiếng Việt, phân cách dấu phẩy. VD: "pin lithium,pin lipo"
    public string? KeywordsVn  { get; private set; }
    public string  Reason      { get; private set; } = default!;
    /// Block = không cho vào giỏ. Warn = cảnh báo nhưng vẫn cho tiếp.
    public ForbiddenSeverity Severity { get; private set; } = ForbiddenSeverity.Block;
    public bool    IsActive    { get; private set; } = true;
    public Guid?   CreatedBy   { get; private set; }
    public DateTime CreatedAt  { get; private set; } = DateTime.UtcNow;

    private ForbiddenCategory() { }

    public static ForbiddenCategory Create(string name, string reason,
                                            string? keywordsCn = null, string? keywordsVn = null,
                                            ForbiddenSeverity severity = ForbiddenSeverity.Block,
                                            Guid? createdBy = null) =>
        new()
        {
            Name = name.Trim(), Reason = reason.Trim(),
            KeywordsCn = keywordsCn, KeywordsVn = keywordsVn,
            Severity = severity, CreatedBy = createdBy,
        };

    public void Update(string name, string reason, string? keywordsCn, string? keywordsVn,
                       ForbiddenSeverity severity, bool isActive)
    {
        Name = name.Trim(); Reason = reason.Trim();
        KeywordsCn = keywordsCn; KeywordsVn = keywordsVn;
        Severity = severity; IsActive = isActive;
    }

    /// Kiểm tra một tiêu đề có vi phạm danh mục này không.
    public bool MatchesTitle(string title)
    {
        if (!IsActive) return false;
        if (KeywordsCn is not null && Rules.ForbiddenChecker.IsMatch(title, KeywordsCn)) return true;
        if (KeywordsVn is not null && Rules.ForbiddenChecker.IsMatch(title, KeywordsVn)) return true;
        return false;
    }
}

public enum ForbiddenSeverity { Warn, Block }

// ─── CancelReason ─────────────────────────────────────────────────────────────
public class CancelReason
{
    public Guid   Id              { get; private set; } = Guid.NewGuid();
    public string Code            { get; private set; } = default!;
    public string Description     { get; private set; } = default!;
    /// Customer = khách chủ động hủy. Staff = NV hủy do vấn đề mua hàng. System = hủy tự động.
    public CancelInitiator InitiatedBy   { get; private set; }
    /// Nếu true → tính phí phạt theo quy định (ví dụ đã mua xong bị hủy).
    public bool   PenaltyApplies  { get; private set; }
    public bool   IsActive        { get; private set; } = true;
    public DateTime CreatedAt     { get; private set; } = DateTime.UtcNow;

    private CancelReason() { }

    public static CancelReason Create(string code, string description,
                                       CancelInitiator initiatedBy, bool penaltyApplies) =>
        new()
        {
            Code = code.Trim().ToUpperInvariant(),
            Description = description.Trim(),
            InitiatedBy = initiatedBy,
            PenaltyApplies = penaltyApplies,
        };
}

public enum CancelInitiator { Customer, Staff, System }

// ─── DepositConfig ────────────────────────────────────────────────────────────
public class DepositConfig
{
    public Guid    Id          { get; private set; } = Guid.NewGuid();
    public string  Name        { get; private set; } = default!;
    public Guid?   VipTierId   { get; private set; }
    /// % cọc (0.0–1.0). Mặc định 0.65 = 65%.
    public decimal DepositPct  { get; private set; }
    public DepositAppliesTo AppliesTo { get; private set; }
    public bool    IsActive    { get; private set; } = true;
    public Guid?   CreatedBy   { get; private set; }
    public DateTime CreatedAt  { get; private set; } = DateTime.UtcNow;

    private DepositConfig() { }

    public static DepositConfig Create(string name, decimal depositPct,
                                        DepositAppliesTo appliesTo,
                                        Guid? vipTierId = null, Guid? createdBy = null)
    {
        if (depositPct is < 0 or > 1)
            throw new ArgumentException("depositPct must be between 0 and 1.");
        return new()
        {
            Name = name.Trim(), DepositPct = depositPct,
            AppliesTo = appliesTo, VipTierId = vipTierId, CreatedBy = createdBy,
        };
    }

    public void Update(string name, decimal depositPct, DepositAppliesTo appliesTo, bool isActive)
    {
        if (depositPct is < 0 or > 1)
            throw new ArgumentException("depositPct must be between 0 and 1.");
        Name = name.Trim(); DepositPct = depositPct; AppliesTo = appliesTo; IsActive = isActive;
    }
}

public enum DepositAppliesTo { All, NewCustomer, VipOnly }

// ─── ExchangeRateHistory ──────────────────────────────────────────────────────
public class ExchangeRateHistory
{
    public Guid    Id            { get; private set; } = Guid.NewGuid();
    /// VNĐ/CNY. VD: 3480 = 1 CNY = 3480 VNĐ.
    public decimal RateVndPerCny { get; private set; }
    public string  Source        { get; private set; } = default!;
    public DateTime EffectiveFrom { get; private set; }
    public DateTime? EffectiveTo { get; private set; }
    public bool    IsCurrent     { get; private set; }
    public Guid?   SetBy         { get; private set; }

    private ExchangeRateHistory() { }

    public static ExchangeRateHistory Create(decimal rateVndPerCny, string source,
                                              DateTime effectiveFrom, Guid? setBy = null)
    {
        if (rateVndPerCny <= 0) throw new ArgumentException("Rate must be positive.");
        return new()
        {
            RateVndPerCny = rateVndPerCny, Source = source.Trim(),
            EffectiveFrom = effectiveFrom, IsCurrent = true, SetBy = setBy,
        };
    }

    public void Deactivate(DateTime effectiveTo)
    {
        IsCurrent   = false;
        EffectiveTo = effectiveTo;
    }

    /// Chốt tỉ giá thành ValueObject để gắn vào đơn hàng.
    public ValueObjects.ExchangeRate ToValueObject() => new(RateVndPerCny, EffectiveFrom);
}
