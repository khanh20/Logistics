using LG.Module1.Domain.Exceptions;

namespace LG.Module1.Domain.Entities;

// ── CartStatus ────────────────────────────────────────────────────────────────
public enum CartStatus
{
    Active    = 1,   // Đang dùng — khách add/sửa được
    Converted = 2,   // Đã checkout thành CustomerOrder(s)
    Abandoned = 3,   // Bỏ rơi > 7 ngày
}

// ── Cart ──────────────────────────────────────────────────────────────────────
public class Cart
{
    public Guid      Id           { get; private set; } = Guid.NewGuid();
    public Guid      CustomerId   { get; private set; }
    public CartStatus Status      { get; private set; } = CartStatus.Active;
    public DateTime  CreatedAt    { get; private set; } = DateTime.UtcNow;
    public DateTime  UpdatedAt    { get; private set; } = DateTime.UtcNow;
    public DateTime? ConvertedAt  { get; private set; }
    public DateTime? AbandonedAt  { get; private set; }

    // Navigation — mỗi user chỉ có 1 cart Active tại 1 thời điểm
    public ICollection<CartItem> Items { get; private set; } = new List<CartItem>();

    private Cart() { }

    public static Cart CreateForCustomer(Guid customerId) =>
        new() { CustomerId = customerId };

    // ── Mutators ──────────────────────────────────────────────────────────────

    /// Thêm item hoặc merge số lượng nếu cùng variant đã có trong cart.
    /// Trả về CartItem (mới hoặc đã merge).
    public CartItem AddOrUpdateItem(Guid productId, Guid variantId, Guid shopId,
                                    int quantity, decimal priceCnySnapshot,
                                    string productTitle, string? variantName, string? imageUrl)
    {
        var existing = Items.FirstOrDefault(i => i.VariantId == variantId);
        if (existing is not null)
        {
            existing.UpdateQuantity(existing.Quantity + quantity);
            Touch();
            return existing;
        }

        var item = CartItem.Create(Id, productId, variantId, shopId, quantity,
                                   priceCnySnapshot, productTitle, variantName, imageUrl);
        Items.Add(item);
        Touch();
        return item;
    }

    public void UpdateItemQuantity(Guid cartItemId, int newQuantity)
    {
        var item = Items.FirstOrDefault(i => i.Id == cartItemId)
                   ?? throw new CartItemNotFoundException(cartItemId);
        item.UpdateQuantity(newQuantity);
        Touch();
    }

    public void RemoveItem(Guid cartItemId)
    {
        var item = Items.FirstOrDefault(i => i.Id == cartItemId)
                   ?? throw new CartItemNotFoundException(cartItemId);
        Items.Remove(item);
        Touch();
    }

    public void Clear() { Items.Clear(); Touch(); }

    public void MarkConverted()
    {
        Status      = CartStatus.Converted;
        ConvertedAt = DateTime.UtcNow;
        Touch();
    }

    public void MarkAbandoned()
    {
        Status      = CartStatus.Abandoned;
        AbandonedAt = DateTime.UtcNow;
        Touch();
    }

    private void Touch() => UpdatedAt = DateTime.UtcNow;
}

// ── CartItem ──────────────────────────────────────────────────────────────────
public class CartItem
{
    public Guid     Id                   { get; private set; } = Guid.NewGuid();
    public Guid     CartId               { get; private set; }
    public Guid     ProductId            { get; private set; }
    public Guid     VariantId            { get; private set; }
    /// Denormalized để group theo shop mà không cần JOIN thêm bảng.
    public Guid     ShopId               { get; private set; }
    public int      Quantity             { get; private set; }
    /// Giá lúc add vào cart — không thay đổi, dùng khi checkout.
    public decimal  PriceCnySnapshot     { get; private set; }
    /// Cache để hiển thị cart mà không cần JOIN product.
    public string   ProductTitleSnapshot { get; private set; } = default!;
    public string?  VariantNameSnapshot  { get; private set; }
    public string?  ImageUrlSnapshot     { get; private set; }
    public DateTime AddedAt              { get; private set; } = DateTime.UtcNow;
    public DateTime UpdatedAt            { get; private set; } = DateTime.UtcNow;

    // Navigation
    public Cart           Cart    { get; private set; } = default!;
    public ProductMaster  Product { get; private set; } = default!;
    public ProductVariant Variant { get; private set; } = default!;
    public PlatformShop   Shop    { get; private set; } = default!;

    private CartItem() { }

    public static CartItem Create(Guid cartId, Guid productId, Guid variantId,
                                   Guid shopId, int quantity, decimal priceCny,
                                   string productTitle, string? variantName, string? imageUrl)
    {
        if (quantity <= 0) throw new InvalidQuantityException(quantity);
        return new()
        {
            CartId               = cartId,
            ProductId            = productId,
            VariantId            = variantId,
            ShopId               = shopId,
            Quantity             = quantity,
            PriceCnySnapshot     = priceCny,
            ProductTitleSnapshot = productTitle.Trim(),
            VariantNameSnapshot  = variantName?.Trim(),
            ImageUrlSnapshot     = imageUrl?.Trim(),
        };
    }

    public void UpdateQuantity(int newQty)
    {
        if (newQty <= 0) throw new InvalidQuantityException(newQty);
        Quantity  = newQty;
        UpdatedAt = DateTime.UtcNow;
    }
}
