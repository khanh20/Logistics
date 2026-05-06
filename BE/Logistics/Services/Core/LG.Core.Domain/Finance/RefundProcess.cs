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
    [Table(nameof(RefundProcess), Schema = DbSchemas.LGFinance)]
    public class RefundProcess : ICreatedBy
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Required]
        public int WalletId { get; set; }                      // Ví nhận hoàn tiền

        public int? TriggeredBy { get; set; }                  // Nhân viên khởi tạo hoàn tiền

        public RefundReasonEnum? Reason { get; set; }           // Lý do hoàn tiền

        [Required]
        [MaxLength(50)]
        public string ReferenceType { get; set; }               // Loại đối tượng liên quan (VD: Order, ...)

        [Required]
        public int ReferenceId { get; set; }                   // ID đối tượng liên quan

        [Required]
        [Column(TypeName = "decimal(18,0)")]
        public decimal GrossAmountVnd { get; set; }            // Số tiền gốc trước khi trừ phạt (VNĐ)

        [Column(TypeName = "decimal(5,4)")]
        public decimal PenaltyPct { get; set; } = 0;          // % phí phạt hủy đơn

        [Column(TypeName = "decimal(18,0)")]
        public decimal PenaltyVnd { get; set; } = 0;          // Số tiền phạt (VNĐ)

        [Required]
        [Column(TypeName = "decimal(18,0)")]
        public decimal NetRefundVnd { get; set; }              // Số tiền thực hoàn (= Gross - Penalty)

        [Required]
        public RefundStatusEnum Status { get; set; } = RefundStatusEnum.Pending; // Trạng thái hoàn tiền

        public int? WalletTransactionId { get; set; }         // Giao dịch ví tương ứng khi hoàn thành

        public DateTime? RefundedAt { get; set; }              // Thời điểm hoàn tiền thành công

        public DateTime? CreatedDate { get; set; }
        public int? CreatedBy { get; set; }
    }
}

