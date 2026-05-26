using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Threading.Tasks;
using LG.Core.ApplicationServices.Finance.DTOs.Customer;
using LG.Core.ApplicationServices.Finance.Interfaces;
using LG.Shared.Constants;
using LG.Shared.Constants.ErrorCodes;
using LG.Core.Domain.Exceptions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using LG.Shared.Common;

namespace LG.Core.API.Controllers.Finance
{
    /// <summary>
    /// API quản lý KYC khách hàng — bao gồm OCR đọc CCCD
    /// </summary>
    [Route("api/kyc")]
    [Authorize]
    public class CustomerKycController : CoreBaseController
    {
        private readonly ICustomerKycService _kycService;

        public CustomerKycController(ICustomerKycService kycService)
        {
            _kycService = kycService;
        }

        // ── GET /api/kyc ──────────────────────────────────────────────────────────
        /// <summary>
        /// Lấy thông tin KYC của customer đang đăng nhập
        /// </summary>
        [HttpGet]
        [ProducesResponseType(typeof(CustomerKycDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetKyc()
        {
            var userId = CurrentUserId;
            var kyc = await _kycService.GetKycByUserIdAsync(userId);
            if (kyc == null)
                throw new CoreException(CoreErrorCode.CoreKycNotFound, 404);

            return Ok(kyc);
        }

        // ── POST /api/kyc/scan-cccd ───────────────────────────────────────────────
        /// <summary>
        /// Upload ảnh CCCD mặt trước → OCR → trả về dữ liệu đã đọc để FE preview.
        /// Chưa lưu vào DB — gọi /submit sau khi user xác nhận.
        /// </summary>
        [HttpPost("scan-cccd")]
        [Consumes("multipart/form-data")]
        [ProducesResponseType(typeof(ScanCccdResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> ScanCccd(IFormFile frontImage, IFormFile? backImage)
        {
            var userId = CurrentUserId;

            if (frontImage == null || frontImage.Length == 0)
                throw new CoreException(CoreErrorCode.CoreKycImageRequired);

            var allowedTypes = new[] { "image/jpeg", "image/jpg", "image/png", "image/webp" };
            if (!Array.Exists(allowedTypes, t => t.Equals(frontImage.ContentType, StringComparison.OrdinalIgnoreCase)))
                throw new CoreException(CoreErrorCode.CoreKycInvalidImageType);

            if (frontImage.Length > 10 * 1024 * 1024)
                throw new CoreException(CoreErrorCode.CoreKycImageTooLarge);

            var ocrResult = await _kycService.ScanCccdAsync(frontImage, backImage);

            if (!ocrResult.Success)
                return BadRequest(new { message = "Không thể đọc ảnh CCCD. " + ocrResult.ErrorMessage });

            return Ok(new ScanCccdResponse
            {
                CustomerId = userId,
                IdNumber = ocrResult.IdNumber,
                FullNameOnId = ocrResult.FullName,
                DateOfBirthOnId = ocrResult.DateOfBirth,
                Gender = ocrResult.Gender,
                Nationality = ocrResult.Nationality,
                PlaceOfOrigin = ocrResult.PlaceOfOrigin,
                PlaceOfResidence = ocrResult.PlaceOfResidence,
                ExpiryDate = ocrResult.ExpiryDate,
                RawText = ocrResult.RawText,
                IdFrontUrl = ocrResult.IdFrontUrl,
                IdBackUrl = ocrResult.IdBackUrl,
                Message = "Đọc CCCD và lưu ảnh thành công. Vui lòng kiểm tra lại thông tin."
            });
        }

        // ── POST /api/kyc/submit ──────────────────────────────────────────────────
        /// <summary>
        /// Lưu thông tin KYC sau khi user đã review dữ liệu OCR
        /// </summary>
        [HttpPost("submit")]
        [ProducesResponseType(typeof(CustomerKycDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> SubmitKyc([FromBody] UpdateKycFromOcrRequest request)
        {
            var userId = CurrentUserId;

            if (string.IsNullOrWhiteSpace(request.IdNumber) && string.IsNullOrWhiteSpace(request.FullNameOnId))
                throw new CoreException(CoreErrorCode.CoreKycDataRequired);

            var result = await _kycService.SubmitKycByUserIdAsync(userId, request);
            return Ok(result);
        }
    }

    // ── Response DTO riêng cho scan-cccd ─────────────────────────────────────────
    public class ScanCccdResponse
    {
        public Guid CustomerId { get; set; }
        public string? IdNumber { get; set; }
        public string? FullNameOnId { get; set; }
        public DateTime? DateOfBirthOnId { get; set; }
        public string? Gender { get; set; }
        public string? Nationality { get; set; }
        public string? PlaceOfOrigin { get; set; }
        public string? PlaceOfResidence { get; set; }
        public DateTime? ExpiryDate { get; set; }
        public string? RawText { get; set; }
        public string? IdFrontUrl { get; set; }
        public string? IdBackUrl { get; set; }
        public string? Message { get; set; }
    }
}
