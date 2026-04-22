using System;
using System.IO;
using System.Threading.Tasks;
using LG.Core.ApplicationServices.Finance.DTOs.Customer;
using LG.Core.ApplicationServices.Finance.OCR;

namespace LG.Core.ApplicationServices.Finance.Interfaces
{
    /// <summary>
    /// Service xử lý nghiệp vụ Customer KYC
    /// </summary>
    public interface ICustomerKycService
    {
        /// <summary>
        /// Đọc ảnh CCCD mặt trước bằng OCR và trả về dữ liệu đã trích xuất
        /// (chưa lưu vào DB — để FE preview và xác nhận)
        /// </summary>
        Task<CccdOcrResult> ScanCccdAsync(Stream frontImageStream);

        /// <summary>
        /// Lấy thông tin KYC hiện tại của customer
        /// </summary>
        Task<CustomerKycDto?> GetKycAsync(Guid customerId);

        /// <summary>
        /// Cập nhật/tạo mới KYC của customer từ dữ liệu đã review
        /// </summary>
        Task<CustomerKycDto> SubmitKycAsync(Guid customerId, UpdateKycFromOcrRequest request);
    }
}
