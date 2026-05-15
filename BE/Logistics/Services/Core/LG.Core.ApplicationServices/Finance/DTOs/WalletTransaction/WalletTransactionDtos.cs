using System;

namespace LG.Core.ApplicationServices.Finance.DTOs.WalletTransaction
{
    public class WalletTransactionDto
    {
        public Guid Id { get; set; }
        public Guid WalletId { get; set; }
        public Guid TypeId { get; set; }
        public string? TypeName { get; set; }         // Tên loại giao dịch (join từ TransactionType)
        public decimal Amount { get; set; }
        public decimal BalanceBefore { get; set; }
        public decimal BalanceAfter { get; set; }
        public string ReferenceType { get; set; }
        public Guid ReferenceId { get; set; }
        public string? Note { get; set; }
        public DateTime? CreatedDate { get; set; }
    }
}
