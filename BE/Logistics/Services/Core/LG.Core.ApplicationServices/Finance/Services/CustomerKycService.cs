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
using LG.Core.Domain.Exceptions;
using LG.Shared.Constants.ErrorCodes;

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
            // Kiểm tra CustomerProfile tồn tại
            var profileExists = await _db.CustomerProfiles
                .AsNoTracking()
                .AnyAsync(p => p.UserId == userId);

            if (!profileExists) return null;

            // FK constraint: CustomerKYC.CustomerId → CustomerProfile.UserId
            return await GetKycAsync(userId);
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

            if (request.DateOfBirthOnId.HasValue && request.DateOfBirthOnId.Value.Kind != DateTimeKind.Utc)
            {
                request.DateOfBirthOnId = DateTime.SpecifyKind(request.DateOfBirthOnId.Value, DateTimeKind.Utc);
            }

            if (profile == null)
            {
                // Safety net: Tự động tạo CustomerProfile nếu chưa tồn tại
                var standardTier = await _db.VipTiers
                    .AsNoTracking()
                    .FirstOrDefaultAsync(t => t.Level == 0);

                profile = new CustomerProfile
                {
                    UserId = userId,
                    CustomerCode = "CUST" + DateTimeOffset.UtcNow.ToUnixTimeMilliseconds().ToString()[(^6)..],
                    FullName = request.FullNameOnId ?? "Unknown",
                    DateOfBirth = request.DateOfBirthOnId,
                    VipTierId = standardTier?.Id,
                    CreatedDate = DateTime.UtcNow
                };
                await _db.CustomerProfiles.AddAsync(profile);
                await _db.SaveChangesAsync();
                _logger.LogInformation("Tự động tạo CustomerProfile cho userId={UserId} với VipTierId={VipTierId}", userId, standardTier?.Id);
            }
            else
            {
                // Cập nhật thông tin thật từ CCCD vào profile đã tồn tại
                // (thay thế dữ liệu tạm "Khách hàng mới" nếu profile được tạo tự động trước đó)
                bool updated = false;

                if (!string.IsNullOrWhiteSpace(request.FullNameOnId) && profile.FullName != request.FullNameOnId)
                {
                    profile.FullName = request.FullNameOnId;
                    updated = true;
                }
                if (request.DateOfBirthOnId.HasValue && profile.DateOfBirth != request.DateOfBirthOnId)
                {
                    profile.DateOfBirth = request.DateOfBirthOnId;
                    updated = true;
                }

                if (updated)
                {
                    profile.ModifiedDate = DateTime.UtcNow;
                    await _db.SaveChangesAsync();
                    _logger.LogInformation("Cập nhật CustomerProfile từ CCCD cho userId={UserId}", userId);
                }
            }

            // FK constraint: CustomerKYC.CustomerId → CustomerProfile.UserId
            return await SubmitKycAsync(profile.UserId, request);
        }

        public async Task<CustomerKycDto> SubmitKycAsync(Guid customerId, UpdateKycFromOcrRequest request)
        {
            var idNumber = request.IdNumber?.Trim();

            // Kiểm tra trùng lặp CCCD với user khác
            if (!string.IsNullOrWhiteSpace(idNumber))
            {
                var existingDuplicate = await _db.CustomerKycs
                    .AsNoTracking()
                    .FirstOrDefaultAsync(k => k.IdNumber == idNumber && k.CustomerId != customerId);

                if (existingDuplicate != null)
                {
                    throw new CoreException(CoreErrorCode.CoreKycIdNumberAlreadyExists);
                }
            }

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
