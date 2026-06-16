using System;
using System.IO;
using System.Threading.Tasks;
using LG.Core.ApplicationServices.Common;
using LG.Core.ApplicationServices.Finance.DTOs.Customer;
using LG.Core.ApplicationServices.Finance.Interfaces;
using LG.Core.Domain.Finance;
using LG.Core.Infrastructure;
using LG.Untils.EnumFinance;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using AutoMapper;
using LG.ApplicationBase.Localization;
using LG.Core.ApplicationServices.Common.Interfaces;

namespace LG.Core.ApplicationServices.Finance.Services
{
    public class CustomerKycService :  CoreServiceBase,ICustomerKycService
    {
        private readonly IScanIDService _ocrService;
        private readonly ICloudinaryService _cloudinaryService;
        private readonly CoreDbContext _db;

        public CustomerKycService(
            IScanIDService ocrService,
            ICloudinaryService cloudinaryService,
            CoreDbContext db,
            IHttpContextAccessor httpContext,
            LocalizationBase localization,
            IMapper mapper,
            ILogger<CustomerKycService> logger) : base(logger, httpContext, db, localization, mapper)
        {
            _ocrService = ocrService;
            _cloudinaryService = cloudinaryService;
            _db = db;
        }
        
        // ── Scan CCCD ────────────────────────────────────────────────────────────
        /// <summary>
        /// Đọc ảnh CCCD bằng FPTAi và trả về data preview — đồng thời lưu file lên Cloudinary
        /// </summary>
        public async Task<ScanIDResult> ScanCccdAsync(IFormFile frontImage, IFormFile? backImage)
        {
            _logger.LogInformation("Bắt đầu Scan CCCD và lưu file lên Cloudinary");

            // 1. Lưu ảnh mặt trước lên Cloudinary
            var frontUrl = await _cloudinaryService.UploadImageAsync(frontImage, "kyc/front");

            // 2. Scan CCCD mặt trước
            using var frontStream = frontImage.OpenReadStream();
            var result = await _ocrService.ExtractCccdDataAsync(frontStream);

            result.IdFrontUrl = frontUrl;

            // 3. Lưu ảnh mặt sau lên Cloudinary (nếu có)
            if (backImage != null)
            {
                var backUrl = await _cloudinaryService.UploadImageAsync(backImage, "kyc/back");
                result.IdBackUrl = backUrl;
            }

            if (!result.Success)
                _logger.LogWarning("Scan CCCD thất bại: {Error}", result.ErrorMessage);
            else
                _logger.LogInformation("Scan CCCD thành công: CCCD={Id}, FullName={Name}", result.IdNumber, result.FullName);

            return result;
        }


        public async Task<CustomerKycDto?> GetKycByUserIdAsync(Guid userId)
        {
            // Bước 1: tìm CustomerProfile theo UserId
            var profile = await _db.CustomerProfiles
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.UserId == userId);

            if (profile == null) return null;

            // Theo dữ liệu thực tế trong DB: CustomerId trong bảng CustomerKYC lưu giá trị của CustomerProfile.Id
            return await GetKycAsync(profile.Id);
        }

        // ── Get KYC ──────────────────────────────────────────────────────────────
        public async Task<CustomerKycDto?> GetKycAsync(Guid customerId)
        {
            var kyc = await _db.CustomerKycs
                .AsNoTracking()
                .FirstOrDefaultAsync(k => k.CustomerId == customerId);

            return kyc == null ? null : _mapper.Map<CustomerKycDto>(kyc);
        }

        // ── Submit KYC ───────────────────────────────────────────────────────────
        /// <summary>
        /// Tạo mới hoặc cập nhật KYC sau khi user review dữ liệu
        /// </summary>
        public async Task<CustomerKycDto> SubmitKycByUserIdAsync(Guid userId, UpdateKycFromOcrRequest request)
        {
            var profile = await _db.CustomerProfiles
                .FirstOrDefaultAsync(p => p.UserId == userId);

            if (profile == null)
            {
                // Tự động tạo CustomerProfile nếu chưa tồn tại
                profile = new CustomerProfile
                {
                    UserId = userId,
                    CustomerCode = "CUST" + DateTimeOffset.UtcNow.ToUnixTimeMilliseconds().ToString()[(^6)..],
                    FullName = request.FullNameOnId ?? "Unknown",
                    DateOfBirth = request.DateOfBirthOnId,
                    CreatedDate = DateTime.UtcNow
                };
                await _db.CustomerProfiles.AddAsync(profile);
                await _db.SaveChangesAsync();
                _logger.LogInformation("Tự động tạo CustomerProfile cho userId={UserId}", userId);
            }

            return await SubmitKycAsync(profile.Id, request);
        }

        public async Task<CustomerKycDto> SubmitKycAsync(Guid customerId, UpdateKycFromOcrRequest request)
        {
            var kyc = await _db.CustomerKycs
                .FirstOrDefaultAsync(k => k.CustomerId == customerId);

            if (kyc == null)
            {
                // Tạo mới
                kyc = new CustomerKYC
                {
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

            // Cập nhật thông tin (đã được user review)
            kyc.IdNumber = request.IdNumber?.Trim();
            kyc.FullNameOnId = request.FullNameOnId;
            kyc.DateOfBirthOnId = request.DateOfBirthOnId;
            kyc.Gender = request.Gender;
            kyc.Nationality = request.Nationality;
            kyc.PlaceOfOrigin = request.PlaceOfOrigin;
            kyc.PlaceOfResidence = request.PlaceOfResidence;
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

            return _mapper.Map<CustomerKycDto>(kyc);
        }

        // ── Admin Methods ────────────────────────────────────────────────────────
        public async Task<System.Collections.Generic.List<CustomerKycDto>> GetAllKycsAsync()
        {
            var kycs = await _db.CustomerKycs
                .AsNoTracking()
                .OrderByDescending(k => k.CreatedDate)
                .ToListAsync();

            return _mapper.Map<System.Collections.Generic.List<CustomerKycDto>>(kycs);
        }

        public async Task<CustomerKycDto> ApproveKycAsync(Guid kycId, Guid adminId)
        {
            var kyc = await _db.CustomerKycs.FirstOrDefaultAsync(k => k.Id == kycId);
            if (kyc == null)
                throw new Exception("Không tìm thấy hồ sơ KYC.");

            if (kyc.Status != KycStatus.Pending)
                throw new Exception("Hồ sơ này không ở trạng thái Chờ duyệt.");

            kyc.Status = KycStatus.Approved;
            kyc.ReviewedBy = adminId;
            kyc.ReviewedAt = DateTime.UtcNow;
            kyc.ModifiedDate = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            _logger.LogInformation("Admin {AdminId} đã phê duyệt KYC {KycId}", adminId, kycId);

            return _mapper.Map<CustomerKycDto>(kyc);
        }

        public async Task<CustomerKycDto> RejectKycAsync(Guid kycId, Guid adminId, string reason)
        {
            var kyc = await _db.CustomerKycs.FirstOrDefaultAsync(k => k.Id == kycId);
            if (kyc == null)
                throw new Exception("Không tìm thấy hồ sơ KYC.");

            if (kyc.Status != KycStatus.Pending)
                throw new Exception("Hồ sơ này không ở trạng thái Chờ duyệt.");

            if (string.IsNullOrWhiteSpace(reason))
                throw new Exception("Vui lòng nhập lý do từ chối.");

            kyc.Status = KycStatus.Rejected;
            kyc.RejectionReason = reason;
            kyc.ReviewedBy = adminId;
            kyc.ReviewedAt = DateTime.UtcNow;
            kyc.ModifiedDate = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            _logger.LogInformation("Admin {AdminId} đã từ chối KYC {KycId} với lý do: {Reason}", adminId, kycId, reason);

            return _mapper.Map<CustomerKycDto>(kyc);
        }
    }
}
