using System;

namespace LG.Core.ApplicationServices.Finance.DTOs.Customer
{
    public class CustomerKycDto
    {
        public Guid Id { get; set; }
        public Guid CustomerId { get; set; }

        /// <summary>Số CCCD/CMND/Hộ chiếu</summary>
        public string? IdNumber { get; set; }

        /// <summary>Họ tên trên giấy tờ tùy thân</summary>
        public string? FullNameOnId { get; set; }

        /// <summary>Ngày sinh trên giấy tờ</summary>
        public DateTime? DateOfBirthOnId { get; set; }

        public string? Gender { get; set; }
        public string? Nationality { get; set; }
        public string? PlaceOfOrigin { get; set; }
        public string? PlaceOfResidence { get; set; }

        /// <summary>URL ảnh mặt trước</summary>
        public string? IdFrontUrl { get; set; }

        /// <summary>URL ảnh mặt sau</summary>
        public string? IdBackUrl { get; set; }

        /// <summary>URL ảnh selfie</summary>
        public string? SelfieUrl { get; set; }

        /// <summary>Trạng thái KYC</summary>
        public string? Status { get; set; }

        /// <summary>Mức độ KYC</summary>
        public string? KycLevel { get; set; }

        /// <summary>Lý do từ chối (nếu có)</summary>
        public string? RejectionReason { get; set; }

        public DateTime? ReviewedAt { get; set; }
        public DateTime? KycExpiresAt { get; set; }
        public DateTime? CreatedDate { get; set; }
        public DateTime? ModifiedDate { get; set; }
    }

    public class UpdateKycFromOcrRequest
    {
        /// <summary>Số CCCD đọc từ OCR (có thể chỉnh sửa trước khi submit)</summary>
        public string? IdNumber { get; set; }

        /// <summary>Họ tên đọc từ OCR</summary>
        public string? FullNameOnId { get; set; }

        /// <summary>Ngày sinh đọc từ OCR</summary>
        public DateTime? DateOfBirthOnId { get; set; }

        public string? Gender { get; set; }
        public string? Nationality { get; set; }
        public string? PlaceOfOrigin { get; set; }
        public string? PlaceOfResidence { get; set; }

        /// <summary>URL ảnh mặt trước đã upload (nếu có)</summary>
        public string? IdFrontUrl { get; set; }

        /// <summary>URL ảnh mặt sau đã upload (nếu có)</summary>
        public string? IdBackUrl { get; set; }

        /// <summary>URL ảnh selfie (nếu có)</summary>
        public string? SelfieUrl { get; set; }
    }
}
