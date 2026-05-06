namespace LG.Module1.Domain.Exceptions;

/// Lỗi gốc cho tất cả lỗi liên quan đến adapter ngoài.
public abstract class AdapterException(string platformName, string message, string code, Exception? inner = null)
    : Module1DomainException(message, code)
{
    public string PlatformName { get; } = platformName;
}

public class AdapterAuthException(string platformName, string message)
    : AdapterException(platformName, message, "ADAPTER_AUTH_FAILED");

public class AdapterRateLimitException(string platformName, int? retryAfterSeconds = null)
    : AdapterException(platformName,
        $"Sàn '{platformName}' đã đạt giới hạn rate limit." +
        (retryAfterSeconds.HasValue ? $" Thử lại sau {retryAfterSeconds}s." : ""),
        "ADAPTER_RATE_LIMIT")
{
    public int? RetryAfterSeconds { get; } = retryAfterSeconds;
}

public class AdapterNotFoundException(string platformName, string id)
    : AdapterException(platformName, $"Không tìm thấy sản phẩm '{id}' trên sàn {platformName}.", "ADAPTER_PRODUCT_NOT_FOUND");

public class AdapterTimeoutException(string platformName)
    : AdapterException(platformName, $"Sàn '{platformName}' trả lời quá chậm (timeout).", "ADAPTER_TIMEOUT");

public class AdapterUpstreamException(string platformName, string message, Exception? inner = null)
    : AdapterException(platformName, $"Lỗi từ phía sàn {platformName}: {message}", "ADAPTER_UPSTREAM_ERROR", inner);

public class AdapterNotConfiguredException(string platformName)
    : AdapterException(platformName, $"Adapter '{platformName}' chưa được cấu hình API key/secret.", "ADAPTER_NOT_CONFIGURED");