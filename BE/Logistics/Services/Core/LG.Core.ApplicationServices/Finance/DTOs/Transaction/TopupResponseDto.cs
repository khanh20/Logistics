using System;
using LG.Untils.EnumFinance;

namespace LG.Core.ApplicationServices.Finance.DTOs.Transaction
{
    public class TopupResponseDto
    {
        public Guid Id { get; set; }
        public Guid WalletId { get; set; }
        public Guid BankAccountId { get; set; }
        public decimal AmountVnd { get; set; }
        public string TransferContent { get; set; } = string.Empty;
        public TopupStatusEnum Status { get; set; }
        public DateTime ExpiresAt { get; set; }
        public DateTime? CreatedDate { get; set; }
    }
}
