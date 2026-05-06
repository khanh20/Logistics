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
    [Table(nameof(TopupRequest), Schema = DbSchemas.LGFinance)]
    public class TopupRequest : ICreatedBy, IModifiedBy
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Required]
        public int WalletId { get; set; }                      // Ví nhận tiền nạp

        [Required]
        public int BankAccountId { get; set; }                 // Tài khoản ngân hàng đích để chuyển vào

        [Required]
        [Column(TypeName = "decimal(18,0)")]
        public decimal AmountVnd { get; set; }                  // Số tiền cần nạp (VNĐ)

        [Required]
        [MaxLength(100)]
        public string TransferContent { get; set; }             // Nội dung chuyển khoản (duy nhất để đối soát)

        [MaxLength(500)]
        public string? QrUrl { get; set; }                      // URL mã QR thanh toán

        [Required]
        public TopupStatusEnum Status { get; set; } = TopupStatusEnum.Pending; // Trạng thái yêu cầu nạp tiền

        public bool AutoMatched { get; set; } = false;         // Có được khớp tự động không

        public DateTime? MatchedAt { get; set; }               // Thời điểm khớp giao dịch

        [MaxLength(100)]
        public string? MatchedBankRef { get; set; }            // Mã tham chiếu giao dịch ngân hàng

        [Required]
        public DateTime ExpiresAt { get; set; }                // Thời điểm hết hạn yêu cầu nạp

        public int? WalletTransactionId { get; set; }         // Giao dịch ví được tạo khi nạp thành công

        public DateTime? CreatedDate { get; set; }
        public int? CreatedBy { get; set; }
        public DateTime? ModifiedDate { get; set; }
        public int? ModifiedBy { get; set; }
    }
}
