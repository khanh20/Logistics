using System;
using System.Threading.Tasks;
using LG.Core.ApplicationServices.Finance.DTOs.Customer;
using LG.Core.ApplicationServices.Finance.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace LG.Core.API.Controllers.Finance
{
    /// <summary>
    /// API quản lý KYC khách hàng — bao gồm OCR đọc CCCD
    /// </summary>
    [ApiController]
    [Route("api/kyc")]
    [Produces("application/json")]
    public class CustomerKycController : ControllerBase
    {
        private readonly ICustomerKycService _kycService;

        public CustomerKycController(ICustomerKycService kycService)
        {
            _kycService = kycService;
        }

        // ── GET /api/kyc/{customerId} ─────────────────────────────────────────────
        /// <summary>
        /// Lấy thông tin KYC hiện tại của customer
        /// </summary>
        [HttpGet("{customerId:int}")]
        [ProducesResponseType(typeof(CustomerKycDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetKyc([FromRoute] int customerId)
        {
            var kyc = await _kycService.GetKycAsync(customerId);
            if (kyc == null)
                return NotFound(new { message = $"Chưa có thông tin KYC cho customer {customerId}" });

            return Ok(kyc);
        }

        // ── POST /api/kyc/{customerId}/scan-cccd ─────────────────────────────────
        /// <summary>
        /// Upload ảnh CCCD mặt trước → OCR → trả về dữ liệu đã đọc để FE preview.
        /// Chưa lưu vào DB — gọi /submit sau khi user xác nhận.
        /// </summary>
        [HttpPost("{customerId:int}/scan-cccd")]
        [Consumes("multipart/form-data")]
        [ProducesResponseType(typeof(ScanCccdResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> ScanCccd(
            [FromRoute] int customerId,
            IFormFile frontImage)
        {
            if (frontImage == null || frontImage.Length == 0)
                return BadRequest(new { message = "Vui lòng upload ảnh CCCD mặt trước." });

            // Kiểm tra định dạng file
            var allowedTypes = new[] { "image/jpeg", "image/jpg", "image/png", "image/webp" };
            if (!Array.Exists(allowedTypes, t => t.Equals(frontImage.ContentType, StringComparison.OrdinalIgnoreCase)))
                return BadRequest(new { message = "Chỉ chấp nhận ảnh JPG, PNG hoặc WebP." });

            // Giới hạn kích thước: 10MB
            if (frontImage.Length > 10 * 1024 * 1024)
                return BadRequest(new { message = "Ảnh không được vượt quá 10MB." });

            using var stream = frontImage.OpenReadStream();
            var ocrResult = await _kycService.ScanCccdAsync(stream);

            if (!ocrResult.Success)
                return BadRequest(new { message = "Không thể đọc ảnh CCCD. " + ocrResult.ErrorMessage });

            return Ok(new ScanCccdResponse
            {
                CustomerId = customerId,
                IdNumber = ocrResult.IdNumber,
                FullNameOnId = ocrResult.FullName,
                DateOfBirthOnId = ocrResult.DateOfBirth,
                Gender = ocrResult.Gender,
                PlaceOfOrigin = ocrResult.PlaceOfOrigin,
                PlaceOfResidence = ocrResult.PlaceOfResidence,
                ExpiryDate = ocrResult.ExpiryDate,
                RawText = ocrResult.RawText,
                Message = "Đọc CCCD thành công. Vui lòng kiểm tra lại thông tin trước khi xác nhận."
            });
        }

        // ── POST /api/kyc/{customerId}/submit ────────────────────────────────────
        /// <summary>
        /// Lưu thông tin KYC sau khi user đã review dữ liệu OCR
        /// </summary>
        [HttpPost("{customerId:int}/submit")]
        [ProducesResponseType(typeof(CustomerKycDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> SubmitKyc(
            [FromRoute] int customerId,
            [FromBody] UpdateKycFromOcrRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.IdNumber) && string.IsNullOrWhiteSpace(request.FullNameOnId))
                return BadRequest(new { message = "Cần nhập ít nhất số CCCD hoặc họ tên." });

            var result = await _kycService.SubmitKycAsync(customerId, request);
            return Ok(result);
        }
    }

    // ── Response DTO riêng cho scan-cccd (bao gồm thêm field debug) ──────────────
    public class ScanCccdResponse
    {
        public int CustomerId { get; set; }
        public string? IdNumber { get; set; }
        public string? FullNameOnId { get; set; }
        public DateTime? DateOfBirthOnId { get; set; }
        public string? Gender { get; set; }
        public string? PlaceOfOrigin { get; set; }
        public string? PlaceOfResidence { get; set; }
        public DateTime? ExpiryDate { get; set; }
        public string? RawText { get; set; }
        public string? Message { get; set; }
    }
}
