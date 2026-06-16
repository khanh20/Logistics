using LG.Untils.EnumFinance;
using System;

namespace LG.Core.ApplicationServices.Finance.DTOs.BankAccount
{
    public class BankAccountDto
    {
        public Guid Id { get; set; }
        public string BankName { get; set; }
        public string BankCode { get; set; }
        public string AccountNumber { get; set; }
        public string AccountHolder { get; set; }
        public string? Branch { get; set; }
        public WebhookServiceEnum? WebhookService { get; set; }
        public BankAccountType Type { get; set; }
        public Guid? UserId { get; set; }
        public bool IsActive { get; set; }
        public DateTime? CreatedDate { get; set; }
    }
}
