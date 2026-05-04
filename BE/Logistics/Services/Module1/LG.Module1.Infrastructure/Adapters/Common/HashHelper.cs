using System.Security.Cryptography;
using System.Text;

namespace LG.Module1.Infrastructure.Adapters.Common;

public static class HashHelper
{
    /// Tính SHA-256 hash của URL — dùng để phát hiện ảnh trùng giữa các lần crawl.
    /// 2 sản phẩm khác nhau có thể dùng chung 1 ảnh stock → không lưu ảnh trùng.
    public static string ComputeUrlHash(string url)
    {
        if (string.IsNullOrEmpty(url)) return string.Empty;

        // Normalize: lowercase + bỏ query string không quan trọng
        var normalized = url.Trim().ToLowerInvariant();

        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(normalized));
        return Convert.ToHexString(bytes).ToLowerInvariant();   // 64 chars
    }
}