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
    [Table(nameof(WithdrawRequest), Schema = DbSchemas.LGFinance)]
    public class WithdrawRequest : ICreatedBy, IModifiedBy
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public Guid WalletId { get; set; }                      // Ví bị trừ tiền

        [Required]
        public Guid CustomerId { get; set; }                    // Khách hàng yêu cầu rút tiền

        [Required]
        [MaxLength(100)]
        public string BankName { get; set; }                    // Tên ngân hàng thụ hưởng

        [Required]
        [MaxLength(50)]
        public string BankAccountNo { get; set; }              // Số tài khoản thụ hưởng

        [Required]
        [MaxLength(255)]
        public string AccountHolder { get; set; }              // Tên chủ tài khoản thụ hưởng

        [Required]
        [Column(TypeName = "decimal(18,0)")]
        public decimal AmountVnd { get; set; }                 // Số tiền rút (VNĐ)

        [Column(TypeName = "decimal(18,0)")]
        public decimal FeeVnd { get; set; } = 0;              // Phí rút tiền (VNĐ)

        [Required]
        [Column(TypeName = "decimal(18,0)")]
        public decimal NetAmountVnd { get; set; }              // Số tiền thực nhận (= Amount - Fee)

        [Required]
        public WithdrawStatusEnum Status { get; set; } = WithdrawStatusEnum.Pending; // Trạng thái yêu cầu rút

        public string? RejectedReason { get; set; }           // Lý do từ chối (nếu có)

        public Guid? ApprovedBy { get; set; }                 // Nhân viên phê duyệt

        [MaxLength(100)]
        public string? TransferRef { get; set; }              // Mã tham chiếu chuyển khoản ngân hàng

        public DateTime? ProcessedAt { get; set; }            // Thời điểm xử lý hoàn tất

        public Guid? WalletTransactionId { get; set; }        // Giao dịch ví tương ứng

        public DateTime? CreatedDate { get; set; }
        public Guid? CreatedBy { get; set; }
        public DateTime? ModifiedDate { get; set; }
        public Guid? ModifiedBy { get; set; }
    }
}
