using System.IO;
using System.Threading.Tasks;

namespace LG.Core.ApplicationServices.Finance.OCR
{
    /// <summary>
    /// Service đọc và trích xuất thông tin từ ảnh CCCD bằng Tesseract OCR
    /// </summary>
    public interface ITesseractOcrService
    {
        /// <summary>
        /// Đọc ảnh từ stream và trích xuất thông tin CCCD
        /// </summary>
        /// <param name="imageStream">Stream của ảnh CCCD (jpg/png)</param>
        /// <returns>Kết quả trích xuất dữ liệu</returns>
        Task<CccdOcrResult> ExtractCccdDataAsync(Stream imageStream);
    }
}
