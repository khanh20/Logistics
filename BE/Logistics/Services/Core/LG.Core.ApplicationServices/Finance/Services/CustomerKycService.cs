using System;
using System.IO;
using System.Threading.Tasks;
using LG.Core.ApplicationServices.Finance.DTOs.Customer;
using LG.Core.ApplicationServices.Finance.Interfaces;
using LG.Core.ApplicationServices.Finance.OCR;
using LG.Core.Domain.Finance;
using LG.Core.Infrastructure;
using LG.Untils.EnumFinance;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace LG.Core.ApplicationServices.Finance.Services
{
    public class CustomerKycService : ICustomerKycService
    {
        private readonly ITesseractOcrService _ocrService;
        private readonly CoreDbContext _db;
        private readonly ILogger<CustomerKycService> _logger;

        public CustomerKycService(
            ITesseractOcrService ocrService,
            CoreDbContext db,
            ILogger<CustomerKycService> logger)
        {
            _ocrService = ocrService;
            _db = db;
            _logger = logger;
        }

        // ── Scan CCCD ────────────────────────────────────────────────────────────
        /// <summary>
        /// Đọc ảnh CCCD bằng OCR và trả về data preview — chưa lưu DB
        /// </summary>
        public async Task<CccdOcrResult> ScanCccdAsync(Stream frontImageStream)
        {
            _logger.LogInformation("Bắt đầu OCR ảnh CCCD");
            var result = await _ocrService.ExtractCccdDataAsync(frontImageStream);

            if (!result.Success)
                _logger.LogWarning("OCR thất bại: {Error}", result.ErrorMessage);
            else
                _logger.LogInformation("OCR thành công: CCCD={Id}, FullName={Name}", result.IdNumber, result.FullName);

            return result;
        }

        // ── Get KYC ──────────────────────────────────────────────────────────────
        public async Task<CustomerKycDto?> GetKycAsync(int customerId)
        {
            var kyc = await _db.CustomerKycs
                .AsNoTracking()
                .FirstOrDefaultAsync(k => k.CustomerId == customerId);

            return kyc == null ? null : MapToDto(kyc);
        }

        // ── Submit KYC ───────────────────────────────────────────────────────────
        /// <summary>
        /// Tạo mới hoặc cập nhật KYC sau khi user review dữ liệu OCR
        /// </summary>
        public async Task<CustomerKycDto> SubmitKycAsync(int customerId, UpdateKycFromOcrRequest request)
        {
            var kyc = await _db.CustomerKycs
                .FirstOrDefaultAsync(k => k.CustomerId == customerId);

            if (kyc == null)
            {
                // Tạo mới
                kyc = new CustomerKYC
                {
                    // Id = int.Newint(),
                    CustomerId = customerId,
                    KycLevel = KycLevel.Basic,
                    Status = KycStatus.Pending,
                    CreatedDate = DateTime.UtcNow
                };
                await _db.CustomerKycs.AddAsync(kyc);
                _logger.LogInformation("Tạo mới CustomerKYC cho customer {CustomerId}", customerId);
            }
            else
            {
                _logger.LogInformation("Cập nhật CustomerKYC cho customer {CustomerId}", customerId);
            }

            // Cập nhật thông tin từ OCR (đã được user review)
            kyc.IdNumber = request.IdNumber?.Trim();
            kyc.FullNameOnId = request.FullNameOnId?.Trim();
            kyc.DateOfBirthOnId = request.DateOfBirthOnId;
            kyc.Status = KycStatus.Pending; // Reset về Pending chờ duyệt

            // Cập nhật URL ảnh nếu có
            if (!string.IsNullOrWhiteSpace(request.IdFrontUrl))
                kyc.IdFrontUrl = request.IdFrontUrl;
            if (!string.IsNullOrWhiteSpace(request.IdBackUrl))
                kyc.IdBackUrl = request.IdBackUrl;
            if (!string.IsNullOrWhiteSpace(request.SelfieUrl))
                kyc.SelfieUrl = request.SelfieUrl;

            kyc.ModifiedDate = DateTime.UtcNow;

            await _db.SaveChangesAsync();

            return MapToDto(kyc);
        }

        // ── Mapper ───────────────────────────────────────────────────────────────
        private static CustomerKycDto MapToDto(CustomerKYC kyc) => new()
        {
            Id = kyc.Id,
            CustomerId = kyc.CustomerId,
            IdNumber = kyc.IdNumber,
            FullNameOnId = kyc.FullNameOnId,
            DateOfBirthOnId = kyc.DateOfBirthOnId,
            IdFrontUrl = kyc.IdFrontUrl,
            IdBackUrl = kyc.IdBackUrl,
            SelfieUrl = kyc.SelfieUrl,
            Status = kyc.Status.ToString(),
            KycLevel = kyc.KycLevel.ToString(),
            RejectionReason = kyc.RejectionReason,
            ReviewedAt = kyc.ReviewedAt,
            KycExpiresAt = kyc.KycExpiresAt,
            CreatedDate = kyc.CreatedDate,
            ModifiedDate = kyc.ModifiedDate
        };
    }
}
