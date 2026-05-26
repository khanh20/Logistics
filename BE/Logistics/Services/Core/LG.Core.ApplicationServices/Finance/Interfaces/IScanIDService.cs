using LG.Core.ApplicationServices.Finance.DTOs.Customer;
using System.IO;
using System.Threading.Tasks;

namespace LG.Core.ApplicationServices.Finance.Interfaces
{
    /// <summary>
    /// Service đọc và trích xuất thông tin từ ảnh CCCD bằng FptAi
    /// </summary>
    public interface IScanIDService
    {
        /// <summary>
        /// Đọc ảnh từ stream và trích xuất thông tin CCCD
        /// </summary>
        /// <param name="imageStream">Stream của ảnh CCCD (jpg/png)</param>
        /// <returns>Kết quả trích xuất dữ liệu</returns>
        Task<ScanIDResult> ExtractCccdDataAsync(Stream imageStream);
    }
}
