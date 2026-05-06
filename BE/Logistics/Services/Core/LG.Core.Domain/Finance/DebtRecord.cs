using LG.EntitiesBase;
using LG.Shared.Constants.Common.Database;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LG.Core.Domain.Finance
{
    [Table(nameof(DebtRecord), Schema = DbSchemas.LGFinance)]
    public class DebtRecord : ICreatedBy, IModifiedBy
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int CustomerId { get; set; }                    // Khách hàng mang nợ

        [Required]
        public int CreditLimitId { get; set; }                 // Hạn mức tín dụng liên quan

        public int? LinkedOrderId { get; set; }               // Đơn hàng phát sinh khoản nợ

        [Required]
        [Column(TypeName = "decimal(18,0)")]
        public decimal DebtAmountVnd { get; set; }             // Số tiền nợ (VNĐ)

        [Required]
        public DateOnly DueDate { get; set; }                  // Ngày đến hạn thanh toán

        public bool IsPaid { get; set; } = false;             // Đã thanh toán chưa

        public DateTime? PaidAt { get; set; }                 // Thời điểm thanh toán

        public short ReminderSentCount { get; set; } = 0;     // Số lần đã gửi nhắc nhở

        public bool IsOverdue { get; set; } = false;          // Có đang quá hạn không

        public DateOnly? OverdueSince { get; set; }           // Ngày bắt đầu quá hạn

        public DateTime? CreatedDate { get; set; }
        public int? CreatedBy { get; set; }
        public DateTime? ModifiedDate { get; set; }
        public int? ModifiedBy { get; set; }
    }
}
