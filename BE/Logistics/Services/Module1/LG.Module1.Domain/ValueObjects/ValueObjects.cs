namespace LG.Module1.Domain.ValueObjects;

/// Tiền tệ với đơn vị — immutable, không có Id riêng.<
public record Money(decimal Amount, Currency Currency)
{
    public Money Add(Money other)
    {
        if (other.Currency != Currency)
            throw new ArgumentException($"Cannot add {other.Currency} to {Currency}.");
        return this with { Amount = Amount + other.Amount };
    }

    public Money Multiply(decimal factor) => this with { Amount = Amount * factor };

    public Money To(Currency target, decimal rate)
    {
        if (Currency == target) return this;
        return new Money(Math.Round(Amount * rate, 0), target);
    }

    public static Money Zero(Currency currency) => new(0, currency);
}

public enum Currency { VND, CNY, USD }

// ─────────────────────────────────────────────────────────────────────────────

/// Trọng lượng — enforce không âm, tối thiểu 0.3 kg khi dùng để tính cước.<
public record Weight
{
    public decimal Kg { get; }

    public Weight(decimal kg)
    {
        if (kg < 0)
            throw new ArgumentException("Weight cannot be negative.");
        Kg = kg;
    }

    public static Weight Zero => new(0m);
    public static Weight Minimum => new(0.3m);   // tối thiểu tính cước
}

// ─────────────────────────────────────────────────────────────────────────────

/// Kích thước kiện hàng để tính trọng lượng thể tích.<
public record Dimensions
{
    public decimal LengthCm { get; }
    public decimal WidthCm { get; }
    public decimal HeightCm { get; }

    public Dimensions(decimal lengthCm, decimal widthCm, decimal heightCm)
    {
        if (lengthCm <= 0 || widthCm <= 0 || heightCm <= 0)
            throw new ArgumentException("All dimensions must be positive.");
        LengthCm = lengthCm;
        WidthCm = widthCm;
        HeightCm = heightCm;
    }

    /// Trọng lượng thể tích = L × W × H / 8000 (chuẩn logistics quốc tế).<
    public Weight VolWeight() => new(Math.Round(LengthCm * WidthCm * HeightCm / 8000m, 3));
}

// ─────────────────────────────────────────────────────────────────────────────

/// Tỉ giá đã chốt cứng khi tạo đơn — không thay đổi sau khi lock.<
public record ExchangeRate
{
    public decimal VndPerCny { get; }
    public DateTime LockedAt { get; }

    public ExchangeRate(decimal vndPerCny, DateTime lockedAt)
    {
        if (vndPerCny <= 0)
            throw new ArgumentException("ExchangeRate must be positive.");
        VndPerCny = vndPerCny;
        LockedAt = lockedAt;
    }

    public decimal ConvertCnyToVnd(decimal cny) => Math.Round(cny * VndPerCny, 0);
}