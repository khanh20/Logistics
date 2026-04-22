namespace LG.Module1.Domain.Exceptions;

public abstract class Module1DomainException(string message, string code) : Exception(message)
{
    public string Code { get; } = code;
}

public class ForbiddenProductException(string productTitle, string categoryName)
    : Module1DomainException(
        $"Sản phẩm '{productTitle}' thuộc danh mục hàng cấm '{categoryName}'.",
        "FORBIDDEN_PRODUCT");

public class InvalidWeightException(string message)
    : Module1DomainException(message, "INVALID_WEIGHT");

public class InvalidDepositAmountException(string message)
    : Module1DomainException(message, "INVALID_DEPOSIT");

public class InvalidOrderTransitionException(string from, string to)
    : Module1DomainException($"Không thể chuyển trạng thái đơn từ '{from}' sang '{to}'.", "INVALID_ORDER_TRANSITION");

public class ProductNotFoundException(object id)
    : Module1DomainException($"Không tìm thấy sản phẩm: {id}.", "PRODUCT_NOT_FOUND");

public class CartItemNotFoundException(object id)
    : Module1DomainException($"Không tìm thấy giỏ hàng: {id}.", "CART_ITEM_NOT_FOUND");

public class InvalidQuantityException(int qty)
    : Module1DomainException($"Số lượng không hợp lệ: {qty}.", "INVALID_QUANTITY");

public class InsufficientStockException(string variant)
    : Module1DomainException($"Hàng '{variant}' hiện không đủ tồn kho.", "INSUFFICIENT_STOCK");

public class PlatformNotFoundException(object id)
    : Module1DomainException($"Không tìm thấy sàn thương mại: {id}.", "PLATFORM_NOT_FOUND");
