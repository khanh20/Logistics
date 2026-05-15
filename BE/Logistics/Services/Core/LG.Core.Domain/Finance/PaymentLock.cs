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
    [Table(nameof(PaymentLock), Schema = DbSchemas.LGFinance)]
    public class PaymentLock : ICreatedBy, IModifiedBy
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public Guid WalletId { get; set; }                      // Ví bị khóa tiền

        [Required]
        public Guid OrderId { get; set; }                       // Đơn hàng liên quan (FK → customer_orders)

        [Required]
        public PaymentLockTypeEnum LockType { get; set; }       // Loại khóa: Đặt cọc hoặc Thanh toán cuối

        [Required]
        [Column(TypeName = "decimal(18,0)")]
        public decimal LockedAmountVnd { get; set; }            // Số tiền đang bị khóa (VNĐ)

        [Required]
        public PaymentLockStatusEnum Status { get; set; }       // Trạng thái khóa

        [Required]
        public DateTime ExpiresAt { get; set; }                 // Thời điểm khóa tự động hết hạn

        public DateTime? ReleasedAt { get; set; }              // Thời điểm giải phóng khóa

        public ReleaseReasonEnum? ReleaseReason { get; set; }  // Lý do giải phóng tiền

        public DateTime? CreatedDate { get; set; }
        public Guid? CreatedBy { get; set; }
        public DateTime? ModifiedDate { get; set; }
        public Guid? ModifiedBy { get; set; }
    }
}
