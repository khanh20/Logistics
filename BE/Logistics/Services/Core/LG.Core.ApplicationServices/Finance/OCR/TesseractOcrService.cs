using System;
using System.IO;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Tesseract;

namespace LG.Core.ApplicationServices.Finance.OCR
{
    /// <summary>
    /// Triển khai OCR đọc CCCD Việt Nam bằng Tesseract 5
    /// </summary>
    public class TesseractOcrService : ITesseractOcrService
    {
        private readonly string _tessDataPath;
        private readonly string _languages;
        private readonly ILogger<TesseractOcrService> _logger;

        public TesseractOcrService(IConfiguration configuration, ILogger<TesseractOcrService> logger)
        {
            _logger = logger;

            // Mặc định: thư mục tessdata của Tesseract cài sẵn trên Windows
            _tessDataPath = configuration["Tesseract:TessDataPath"]
                ?? @"C:\Program Files\Tesseract-OCR\tessdata";

            _languages = configuration["Tesseract:Languages"] ?? "vie+eng";
        }

        public Task<CccdOcrResult> ExtractCccdDataAsync(Stream imageStream)
        {
            try
            {
                // Đọc toàn bộ stream vào byte array để tránh vấn đề seek
                byte[] imageBytes;
                using (var ms = new MemoryStream())
                {
                    imageStream.CopyTo(ms);
                    imageBytes = ms.ToArray();
                }

                string rawText;
                using var engine = new TesseractEngine(_tessDataPath, _languages, EngineMode.Default);
                using var img = Pix.LoadFromMemory(imageBytes);
                using var page = engine.Process(img);
                rawText = page.GetText();

                _logger.LogDebug("Tesseract OCR raw text:\n{RawText}", rawText);

                var result = ParseCccdText(rawText);
                result.RawText = rawText;
                result.Success = true;
                return Task.FromResult(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi thực hiện OCR ảnh CCCD");
                return Task.FromResult(new CccdOcrResult
                {
                    Success = false,
                    ErrorMessage = $"Không thể đọc ảnh: {ex.Message}"
                });
            }
        }

        // ─── Parse text từ OCR ───────────────────────────────────────────────────

        private static CccdOcrResult ParseCccdText(string text)
        {
            var result = new CccdOcrResult();

            // Chuẩn hoá: loại bỏ ký tự thừa, trim các dòng
            var lines = text
                .Replace("\r\n", "\n")
                .Replace("\r", "\n")
                .Split('\n');

            // ── Số CCCD: 12 chữ số liên tiếp ────────────────────────────────────
            var idMatch = Regex.Match(text, @"\b(\d{12})\b");
            if (idMatch.Success)
                result.IdNumber = idMatch.Groups[1].Value;

            // ── Họ và tên ────────────────────────────────────────────────────────
            result.FullName = ExtractLineAfterKeyword(lines,
                new[] { "Họ và tên", "Ho va ten", "Full name", "Fullname" });

            // ── Ngày sinh ────────────────────────────────────────────────────────
            var dobRaw = ExtractLineAfterKeyword(lines,
                new[] { "Ngày sinh", "Ngay sinh", "Date of birth" });
            result.DateOfBirth = ParseDate(dobRaw ?? ExtractDateFromText(text, skipFirst: false));

            // ── Giới tính ────────────────────────────────────────────────────────
            result.Gender = ExtractLineAfterKeyword(lines,
                new[] { "Giới tính", "Gioi tinh", "Sex" });
            if (!string.IsNullOrEmpty(result.Gender))
                result.Gender = NormalizeGender(result.Gender);

            // ── Quê quán ─────────────────────────────────────────────────────────
            result.PlaceOfOrigin = ExtractLineAfterKeyword(lines,
                new[] { "Quê quán", "Que quan", "Place of origin" });

            // ── Nơi thường trú ───────────────────────────────────────────────────
            result.PlaceOfResidence = ExtractLineAfterKeyword(lines,
                new[] { "Nơi thường trú", "Noi thuong tru", "Place of residence" });

            // ── Ngày hết hạn ─────────────────────────────────────────────────────
            // Thường là ngày cuối cùng có dạng dd/MM/yyyy trên CCCD
            var expiryRaw = ExtractLineAfterKeyword(lines,
                new[] { "Có giá trị đến", "Co gia tri den", "Date of expiry", "Ngày hết hạn" });
            result.ExpiryDate = ParseDate(expiryRaw);

            return result;
        }

        /// <summary>
        /// Tìm nội dung dòng ngay sau dòng chứa keyword (hoặc trên cùng dòng sau dấu ':')
        /// </summary>
        private static string? ExtractLineAfterKeyword(string[] lines, string[] keywords)
        {
            for (int i = 0; i < lines.Length; i++)
            {
                var line = lines[i].Trim();
                foreach (var kw in keywords)
                {
                    if (line.Contains(kw, StringComparison.OrdinalIgnoreCase))
                    {
                        // Trường hợp "Họ và tên: Nguyễn Văn A" — cùng dòng
                        var colonIdx = line.IndexOf(':', StringComparison.Ordinal);
                        if (colonIdx >= 0 && colonIdx < line.Length - 1)
                        {
                            var value = line[(colonIdx + 1)..].Trim();
                            if (!string.IsNullOrWhiteSpace(value))
                                return CleanText(value);
                        }

                        // Trường hợp keyword riêng 1 dòng, value nằm dòng kế
                        if (i + 1 < lines.Length)
                        {
                            var nextLine = lines[i + 1].Trim();
                            if (!string.IsNullOrWhiteSpace(nextLine))
                                return CleanText(nextLine);
                        }
                        break;
                    }
                }
            }
            return null;
        }

        /// <summary>Lấy ngày đầu tiên tìm thấy trong chuỗi dạng dd/MM/yyyy</summary>
        private static string? ExtractDateFromText(string text, bool skipFirst)
        {
            var matches = Regex.Matches(text, @"\b(\d{2}/\d{2}/\d{4})\b");
            int idx = skipFirst && matches.Count > 1 ? 1 : 0;
            return matches.Count > idx ? matches[idx].Groups[1].Value : null;
        }

        private static DateTime? ParseDate(string? raw)
        {
            if (string.IsNullOrWhiteSpace(raw)) return null;

            // Tìm pattern dd/MM/yyyy trong chuỗi
            var m = Regex.Match(raw, @"\b(\d{2}/\d{2}/\d{4})\b");
            if (!m.Success) return null;

            if (DateTime.TryParseExact(m.Groups[1].Value, "dd/MM/yyyy",
                System.Globalization.CultureInfo.InvariantCulture,
                System.Globalization.DateTimeStyles.None,
                out var dt))
                return dt;

            return null;
        }

        private static string CleanText(string s)
            => Regex.Replace(s.Trim(), @"\s+", " ");

        private static string NormalizeGender(string raw)
        {
            var lower = raw.Trim().ToLowerInvariant();
            if (lower.Contains("nam") || lower.Contains("male")) return "Nam";
            if (lower.Contains("nữ") || lower.Contains("nu") || lower.Contains("female")) return "Nữ";
            return raw.Trim();
        }
    }
}
