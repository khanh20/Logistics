using System;
using System.IO;
using System.Threading.Tasks;
using LG.Core.ApplicationServices.Finance.DTOs.Customer;
using Microsoft.AspNetCore.Http;

namespace LG.Core.ApplicationServices.Finance.Interfaces
{
    /// <summary>
    /// Service xử lý nghiệp vụ Customer KYC
    /// </summary>
    public interface ICustomerKycService
    {
        /// <summary>
        /// Đọc ảnh CCCD mặt trước bằng OCR và trả về dữ liệu đã trích xuất, đồng thời lưu cả 2 ảnh
        /// </summary>
        Task<ScanIDResult> ScanCccdAsync(IFormFile frontImage, IFormFile? backImage);

        /// <summary>
        /// Lấy KYC theo customerId (Id của CustomerProfile)
        /// </summary>
        Task<CustomerKycDto?> GetKycAsync(Guid customerId);

        /// <summary>
        /// Lấy KYC theo userId (Id của User trong Auth service — từ JWT sub claim)
        /// </summary>
        Task<CustomerKycDto?> GetKycByUserIdAsync(Guid userId);

        /// <summary>
        /// Submit KYC theo customerId
        /// </summary>
        Task<CustomerKycDto> SubmitKycAsync(Guid customerId, UpdateKycFromOcrRequest request);

        /// <summary>
        /// Submit KYC theo userId (từ JWT)
        /// </summary>
        Task<CustomerKycDto> SubmitKycByUserIdAsync(Guid userId, UpdateKycFromOcrRequest request);
    }
}
