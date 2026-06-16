using LG.Untils.EnumFinance;
using System;

namespace LG.Core.ApplicationServices.Finance.DTOs.BankWebhookLog
{
    public class BankWebhookLogDto
    {
        public Guid Id { get; set; }
        public int BankAccountId { get; set; }
        public string IdempotencyKey { get; set; }
        public string RawPayload { get; set; }
        public string? BankRef { get; set; }
        public decimal? AmountVnd { get; set; }
        public string? TransferContent { get; set; }
        public DateTime? TransactionDate { get; set; }
        public Guid? MatchedTopupId { get; set; }
        public WebhookProcessingStatusEnum? ProcessingStatus { get; set; }
        public DateTime? ProcessedAt { get; set; }
        public DateTime? CreatedDate { get; set; }
    }
}
