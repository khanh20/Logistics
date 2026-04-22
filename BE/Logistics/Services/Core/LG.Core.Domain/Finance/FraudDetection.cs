using LG.EntitiesBase;
using LG.Shared.Constants.Common.Database;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using LG.Untils.EnumFinance;

namespace LG.Core.Domain.Finance
{
    [Table(nameof(FraudDetection), Schema = DbSchemas.LGFinance)]
    public class FraudDetection : ICreatedBy, IModifiedBy
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public Guid WalletId { get; set; }                      // Ví liên quan đến hành vi gian lận

        [Required]
        public Guid CustomerId { get; set; }                    // Khách hàng bị phát hiện gian lận

        public FraudTypeEnum? FraudType { get; set; }           // Loại gian lận phát hiện được

        [Required]
        [Column(TypeName = "decimal(5,2)")]
        public decimal RiskScore { get; set; }                  // Điểm rủi ro (0 – 100)

        public string? EvidenceJson { get; set; }              // Bằng chứng dưới dạng JSON (JSONB)

        [Required]
        public FraudActionEnum Action { get; set; }            // Hành động hệ thống đã thực hiện

        [Required]
        public FraudStatusEnum Status { get; set; } = FraudStatusEnum.Open; // Trạng thái xử lý

        public Guid? ReviewedBy { get; set; }                  // Nhân viên xem xét vụ việc

        public DateTime? ReviewedAt { get; set; }              // Thời điểm xem xét

        public string? ResolutionNote { get; set; }            // Kết luận sau xem xét

        public DateTime? CreatedDate { get; set; }
        public int? CreatedBy { get; set; }
        public DateTime? ModifiedDate { get; set; }
        public int? ModifiedBy { get; set; }
    }
}
