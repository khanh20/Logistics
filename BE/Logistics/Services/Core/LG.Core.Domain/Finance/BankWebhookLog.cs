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
    [Table(nameof(BankWebhookLog), Schema = DbSchemas.LGFinance)]
    public class BankWebhookLog : ICreatedBy
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public int BankAccountId { get; set; }                 // Tài khoản ngân hàng nhận webhook

        [Required]
        [MaxLength(200)]
        public string IdempotencyKey { get; set; }              // Khóa idempotency tránh xử lý trùng

        [Required]
        public string RawPayload { get; set; }                  // Dữ liệu JSON thô từ webhook (JSONB)

        [MaxLength(100)]
        public string? BankRef { get; set; }                   // Mã tham chiếu giao dịch từ ngân hàng

        [Column(TypeName = "decimal(18,0)")]
        public decimal? AmountVnd { get; set; }                // Số tiền giao dịch (VNĐ)

        public string? TransferContent { get; set; }           // Nội dung chuyển khoản từ webhook

        public DateTime? TransactionDate { get; set; }         // Thời điểm giao dịch theo ngân hàng

        public Guid? MatchedTopupId { get; set; }              // Yêu cầu nạp tiền được khớp (nếu có)

        public WebhookProcessingStatusEnum? ProcessingStatus { get; set; } // Trạng thái xử lý webhook

        public DateTime? ProcessedAt { get; set; }            // Thời điểm xử lý xong

        public DateTime? CreatedDate { get; set; }
        public Guid? CreatedBy { get; set; }
    }
}

