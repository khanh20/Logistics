using LG.Untils.EnumFinance;
using System;
using System.ComponentModel.DataAnnotations;

namespace LG.Core.ApplicationServices.Finance.DTOs.BankAccount
{
    public class CreateBankAccountDto
    {
        [Required(ErrorMessage = "Tên ngân hàng là bắt buộc.")]
        [MaxLength(100)]
        public string BankName { get; set; }

        [Required(ErrorMessage = "Mã ngân hàng là bắt buộc.")]
        [MaxLength(20)]
        public string BankCode { get; set; }

        [Required(ErrorMessage = "Số tài khoản là bắt buộc.")]
        [MaxLength(50)]
        public string AccountNumber { get; set; }

        [Required(ErrorMessage = "Tên chủ tài khoản là bắt buộc.")]
        [MaxLength(255)]
        public string AccountHolder { get; set; }

        [MaxLength(255)]
        public string? Branch { get; set; }

        public WebhookServiceEnum? WebhookService { get; set; }
    }
}
