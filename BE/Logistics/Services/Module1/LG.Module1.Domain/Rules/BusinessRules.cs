using LG.Module1.Domain.ValueObjects;

namespace LG.Module1.Domain.Rules;

/// Quy tắc tính trọng lượng tính cước — thuần pure static, không phụ thuộc gì.
public static class WeightCalculator
{
    private static readonly Weight MinChargedWeight = Weight.Minimum;   // 0.3 kg

    /// Trọng lượng thể tích = L × W × H / 8000.
    public static Weight CalcVolWeight(Dimensions dims) => dims.VolWeight();

    /// Trọng lượng tính cước = MAX(thực tế, thể tích), tối thiểu 0.3 kg.
    public static Weight CalcChargedWeight(Weight actual, Weight volWeight)
    {
        var heavier = actual.Kg >= volWeight.Kg ? actual : volWeight;
        return heavier.Kg < MinChargedWeight.Kg ? MinChargedWeight : heavier;
    }

    /// Overload tiện lợi nhận kích thước trực tiếp.
    public static Weight CalcChargedWeight(Weight actual, Dimensions dims)
        => CalcChargedWeight(actual, CalcVolWeight(dims));
}

// ─────────────────────────────────────────────────────────────────────────────

/// Quy tắc tính phí dịch vụ và tiền cọc.
public static class FeeCalculator
{
    /// Phí mua hộ = tổng tiền hàng × % phí.
    public static Money CalcServiceFee(Money goodsVnd, decimal feePct)
    {
        if (feePct is < 0 or > 1)
            throw new ArgumentException("feePct must be between 0 and 1.");
        return goodsVnd.Multiply(feePct);
    }

    /// Tiền cọc = (tiền hàng + phí mua hộ) × % cọc.
    public static Money CalcDepositAmount(Money goodsVnd, Money serviceFeeVnd, decimal depositPct)
    {
        if (depositPct is < 0 or > 1)
            throw new ArgumentException("depositPct must be between 0 and 1.");
        if (goodsVnd.Currency != Currency.VND || serviceFeeVnd.Currency != Currency.VND)
            throw new ArgumentException("Goods and service fee must be in VND.");
        var total = goodsVnd.Add(serviceFeeVnd);
        var deposit = Math.Round(total.Amount * depositPct, 0);
        return new Money(deposit, Currency.VND);
    }

    /// Phí ship quốc tế = trọng lượng tính cước × đơn giá/kg.
    public static Money CalcShipIntlFee(Weight chargedWeight, decimal ratePerKgVnd)
    {
        if (ratePerKgVnd < 0) throw new ArgumentException("ratePerKgVnd must be non-negative.");
        return new Money(Math.Round(chargedWeight.Kg * ratePerKgVnd, 0), Currency.VND);
    }

    /// Phí bảo hiểm = tổng tiền hàng VND × % bảo hiểm.
    public static Money CalcInsuranceFee(Money goodsVnd, decimal insurancePct)
    {
        if (insurancePct is < 0 or > 0.1m)
            throw new ArgumentException("insurancePct must be between 0 and 10%.");
        return goodsVnd.Multiply(insurancePct);
    }
}

// ─────────────────────────────────────────────────────────────────────────────

/// Kiểm tra hàng cấm theo keyword trong tên sản phẩm.
public static class ForbiddenChecker
{
    /// 
    /// Kiểm tra xem productTitle có chứa bất kỳ keyword cấm nào không.
    /// keywords: chuỗi phân tách bằng dấu phẩy, VD: "pin lithium,pin li-ion,lipo".
    /// 
    public static bool IsMatch(string productTitle, string keywords)
    {
        if (string.IsNullOrWhiteSpace(productTitle) || string.IsNullOrWhiteSpace(keywords))
            return false;

        var titleNorm = Normalize(productTitle);

        return keywords
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(Normalize)
            .Any(kw => !string.IsNullOrEmpty(kw) && titleNorm.Contains(kw, StringComparison.Ordinal));
    }

    private static string Normalize(string s) => RemoveDiacritics(s).ToLowerInvariant().Trim();

    private static string RemoveDiacritics(string text)
    {
        var normalized = text.Normalize(System.Text.NormalizationForm.FormD);
        var sb = new System.Text.StringBuilder(normalized.Length);
        foreach (var c in normalized)
        {
            var cat = System.Globalization.CharUnicodeInfo.GetUnicodeCategory(c);
            if (cat != System.Globalization.UnicodeCategory.NonSpacingMark)
                sb.Append(c);
        }
        return sb.ToString().Normalize(System.Text.NormalizationForm.FormC);
    }
}

// ─────────────────────────────────────────────────────────────────────────────

/// State machine hợp lệ cho trạng thái đơn hàng.
public static class OrderStateMachine
{
    private static readonly HashSet<(string from, string to)> ValidTransitions =
    [
        ("pending_deposit", "deposited"),
        ("deposited",       "purchasing"),
        ("purchasing",      "cn_warehouse"),
        ("cn_warehouse",    "in_transit"),
        ("in_transit",      "vn_warehouse"),
        ("vn_warehouse",    "delivering"),
        ("delivering",      "completed"),
        // Hủy từ bất kỳ trạng thái chưa hoàn thành
        ("pending_deposit", "cancelled"),
        ("deposited",       "cancelled"),
        ("purchasing",      "cancelled"),
    ];

    public static bool IsValid(string from, string to) =>
        ValidTransitions.Contains((from.ToLowerInvariant(), to.ToLowerInvariant()));

    public static void Validate(string from, string to)
    {
        if (!IsValid(from, to))
            throw new Exceptions.InvalidOrderTransitionException(from, to);
    }
}
