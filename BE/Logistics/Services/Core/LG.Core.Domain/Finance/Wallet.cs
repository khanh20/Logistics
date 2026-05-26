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
    [Table(nameof(Wallet), Schema = DbSchemas.LGFinance)]
    public class Wallet : ICreatedBy, IModifiedBy
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public Guid CustomerId { get; set; }                    // Khách hàng sở hữu ví (1-1)

        [Required]
        [MaxLength(3)]
        public string Currency { get; set; } = "VND";          // Loại tiền tệ

        [Required]
        [Column(TypeName = "decimal(18,0)")]
        public decimal AvailableBalance { get; set; } = 0;     // Số dư có thể sử dụng (VNĐ)

        [Required]
        [Column(TypeName = "decimal(18,0)")]
        public decimal FrozenBalance { get; set; } = 0;        // Số dư đang bị khóa (VNĐ)

        // Computed: TotalBalance = AvailableBalance + FrozenBalance (tính trong ứng dụng hoặc DB Generated)
        [NotMapped]
        public decimal TotalBalance => AvailableBalance + FrozenBalance;

        [Column(TypeName = "decimal(18,0)")]
        public decimal TotalDepositedEver { get; set; } = 0;   // Tổng tiền đã nạp từ trước đến nay (VNĐ)

        [Column(TypeName = "decimal(18,0)")]
        public decimal TotalSpentEver { get; set; } = 0;       // Tổng tiền đã chi từ trước đến nay (VNĐ)

        [Column(TypeName = "decimal(18,0)")]
        public decimal PendingRefundVnd { get; set; } = 0;     // Số tiền đang chờ hoàn trả (VNĐ)

        public bool IsFrozen { get; set; } = false;            // Ví có đang bị đóng băng không

        public string? FrozenReason { get; set; }              // Lý do đóng băng ví

        public DateTime? CreatedDate { get; set; }
        public Guid? CreatedBy { get; set; }
        public DateTime? ModifiedDate { get; set; }
        public Guid? ModifiedBy { get; set; }
    }
}
