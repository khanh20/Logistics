using System;
using System.ComponentModel.DataAnnotations;

namespace LG.Core.ApplicationServices.Finance.DTOs.Transaction
{
    public class CreateWithdrawDto
    {
        [Required]
        public Guid BankAccountId { get; set; } // Số tài khoản ngân hàng của KHÁCH HÀNG (để nhận tiền)

        [Required]
        [Range(10000, 1000000000, ErrorMessage = "Số tiền rút tối thiểu là 10,000 VNĐ.")]
        public decimal Amount { get; set; }     // Số tiền cần rút
    }
}
