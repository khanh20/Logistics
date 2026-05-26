using LG.Untils.EnumFinance;
using System.ComponentModel.DataAnnotations;

namespace LG.Core.ApplicationServices.Finance.DTOs.TransactionType
{
    public class CreateTransactionTypeDto
    {
        [Required(ErrorMessage = "Mã loại giao dịch là bắt buộc")]
        [MaxLength(50, ErrorMessage = "Mã loại giao dịch không được vượt quá 50 ký tự")]
        public string Code { get; set; } = string.Empty;

        [Required(ErrorMessage = "Tên loại giao dịch là bắt buộc")]
        [MaxLength(100, ErrorMessage = "Tên loại giao dịch không được vượt quá 100 ký tự")]
        public string Name { get; set; } = string.Empty;

        public TransactionDirectionEnum? Direction { get; set; }

        public bool IsReversible { get; set; } = false;
    }
}
