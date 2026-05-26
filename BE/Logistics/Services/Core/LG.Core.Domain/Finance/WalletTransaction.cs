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
    [Table(nameof(WalletTransaction), Schema = DbSchemas.LGFinance)]
    public class WalletTransaction : ICreatedBy
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public Guid WalletId { get; set; }                      // Ví thực hiện giao dịch

        [Required]
        public Guid TypeId { get; set; }                        // Loại giao dịch (FK → TransactionType)

        [Required]
        [Column(TypeName = "decimal(18,0)")]
        public decimal Amount { get; set; }                     // Số tiền giao dịch (VNĐ)

        [Required]
        [Column(TypeName = "decimal(18,0)")]
        public decimal BalanceBefore { get; set; }              // Số dư trước giao dịch (VNĐ)

        [Required]
        [Column(TypeName = "decimal(18,0)")]
        public decimal BalanceAfter { get; set; }               // Số dư sau giao dịch (VNĐ)

        [Required]
        [MaxLength(50)]
        public string ReferenceType { get; set; }               // Loại đối tượng liên quan (VD: Order, Topup, ...)

        [Required]
        public Guid ReferenceId { get; set; }                   // ID đối tượng liên quan

        [MaxLength(500)]
        public string? Note { get; set; }                       // Ghi chú giao dịch

        public DateTime? CreatedDate { get; set; }
        public Guid? CreatedBy { get; set; }
    }
}
