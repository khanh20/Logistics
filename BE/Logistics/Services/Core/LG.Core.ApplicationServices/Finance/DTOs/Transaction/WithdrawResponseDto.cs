using System;
using LG.Untils.EnumFinance;

namespace LG.Core.ApplicationServices.Finance.DTOs.Transaction
{
    public class WithdrawResponseDto
    {
        public Guid Id { get; set; }
        public Guid WalletId { get; set; }
        public string BankName { get; set; } = string.Empty;
        public string BankAccountNo { get; set; } = string.Empty;
        public string AccountHolder { get; set; } = string.Empty;
        public decimal AmountVnd { get; set; }
        public decimal FeeVnd { get; set; }
        public decimal NetAmountVnd { get; set; }
        public WithdrawStatusEnum Status { get; set; }
        public string? RejectedReason { get; set; }
        public string? TransferRef { get; set; }
        public DateTime? CreatedDate { get; set; }
    }
}
