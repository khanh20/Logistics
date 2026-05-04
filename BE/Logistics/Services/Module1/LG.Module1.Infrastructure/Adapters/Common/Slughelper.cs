using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace LG.Module1.Infrastructure.Adapters.Common;

public static partial class SlugHelper
{
    
    /// Sinh slug từ title của bất kỳ ngôn ngữ nào.
    /// - Title tiếng Việt/Anh: Romanize (bỏ dấu) → lowercase → thay khoảng trắng = '-'
    /// - Title tiếng Trung/Nhật: dùng platformProductId làm fallback
    /// Append 6 ký tự cuối của platformProductId để đảm bảo unique.
    public static string GenerateSlug(string title, string platformProductId)
    {
        var slug = Romanize(title).ToLowerInvariant().Trim();
        slug = WhitespaceRegex().Replace(slug, "-");
        slug = NonAlphanumRegex().Replace(slug, "");

        // Cắt nếu dài hơn 200, để chỗ cho hash
        if (slug.Length > 200) slug = slug[..200].TrimEnd('-');

        // Title CJK sẽ bị strip hết → fallback về platform ID
        if (string.IsNullOrEmpty(slug))
            slug = "product";

        // Append hash để unique
        var hash = ComputeShortHash(platformProductId);
        return $"{slug}-{hash}";
    }

    private static string Romanize(string text)
    {
        var normalized = text.Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder(normalized.Length);
        foreach (var c in normalized)
        {
            var cat = CharUnicodeInfo.GetUnicodeCategory(c);
            if (cat != UnicodeCategory.NonSpacingMark) sb.Append(c);
        }
        return sb.ToString().Normalize(NormalizationForm.FormC);
    }

    private static string ComputeShortHash(string input)
    {
        using var md5 = System.Security.Cryptography.MD5.Create();
        var bytes = md5.ComputeHash(Encoding.UTF8.GetBytes(input));
        // Lấy 6 ký tự hex đầu — đủ unique cho phạm vi catalog
        return Convert.ToHexString(bytes)[..6].ToLowerInvariant();
    }

    [GeneratedRegex(@"\s+")]
    private static partial Regex WhitespaceRegex();

    [GeneratedRegex(@"[^a-z0-9-]")]
    private static partial Regex NonAlphanumRegex();
}