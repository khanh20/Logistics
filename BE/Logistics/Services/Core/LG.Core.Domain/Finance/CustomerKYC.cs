using LG.EntitiesBase;
using LG.Shared.Constants.Common.Database;
using LG.Untils.EnumFinance;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LG.Core.Domain.Finance
{
    [Table(nameof(CustomerKYC), Schema = DbSchemas.LGFinance)]
    public class CustomerKYC : ICreatedBy, IModifiedBy
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public Guid CustomerId { get; set; }

        public KycLevel KycLevel { get; set; } = KycLevel.None; // Mức độ KYC (None, Basic, Advanced)

        [MaxLength(20)]
        public string? IdNumber { get; set; } // Số CMND/CCCD/Hộ chiếu

        [MaxLength(255)]
        public string? FullNameOnId { get; set; } // Họ tên trên giấy tờ tùy thân

        public DateTime? DateOfBirthOnId { get; set; } // Ngày sinh trên giấy tờ tùy thân

        [MaxLength(500)]
        public string? IdFrontUrl { get; set; } // URL ảnh mặt trước giấy tờ tùy thân

        [MaxLength(500)]
        public string? IdBackUrl { get; set; } // URL ảnh mặt sau giấy tờ tùy thân

        [MaxLength(500)]
        public string? SelfieUrl { get; set; } // URL ảnh selfie (ảnh chụp khuôn mặt của khách hàng)

        [MaxLength(500)]
        public string? VideoVerificationUrl { get; set; } // URL video xác minh 

        public KycStatus Status { get; set; } = KycStatus.Pending;

        public string? RejectionReason { get; set; } // Lý do từ chối (nếu trạng thái là Rejected)

        public Guid? ReviewedBy { get; set; } // ID người duyệt hồ sơ KYC (nếu đã được duyệt hoặc từ chối)

        public DateTime? ReviewedAt { get; set; } // Thời điểm duyệt hồ sơ KYC (nếu đã được duyệt hoặc từ chối) 

        public DateTime? KycExpiresAt { get; set; } // Thời điểm hết hạn KYC (nếu có, dùng để yêu cầu khách hàng cập nhật lại thông tin KYC sau một khoảng thời gian)
        public DateTime? CreatedDate { get; set; }
        public int? CreatedBy { get; set; }
        public DateTime? ModifiedDate { get; set; }
        public int? ModifiedBy { get; set; }


    }
}
