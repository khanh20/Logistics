using System;
using System.ComponentModel.DataAnnotations;

namespace LG.Core.ApplicationServices.Finance.DTOs.Transaction
{
    public class CreateTopupDto
    {
        [Required]
        public Guid BankAccountId { get; set; } // Số tài khoản ngân hàng của CÔNG TY mà khách sẽ chuyển tiền vào

        [Required]
        [Range(10000, 1000000000, ErrorMessage = "Số tiền nạp phải từ 10,000 VNĐ đến 1 tỷ VNĐ.")]
        public decimal Amount { get; set; }     // Số tiền nạp
    }
}
