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
    [Table(nameof(BankAccount), Schema = DbSchemas.LGFinance)]
    public class BankAccount : ICreatedBy
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string BankName { get; set; }                    // Tên ngân hàng (VD: Vietcombank, MB Bank, ...)

        [Required]
        [MaxLength(20)]
        public string BankCode { get; set; }                    // Mã ngân hàng (VD: VCB, MBB, ...)

        [Required]
        [MaxLength(50)]
        public string AccountNumber { get; set; }               // Số tài khoản ngân hàng

        [Required]
        [MaxLength(255)]
        public string AccountHolder { get; set; }               // Tên chủ tài khoản

        [MaxLength(255)]
        public string? Branch { get; set; }                     // Chi nhánh ngân hàng

        public WebhookServiceEnum? WebhookService { get; set; } // Dịch vụ webhook nhận biến động số dư

        public bool IsActive { get; set; } = true;             // Tài khoản đang hoạt động

        public DateTime? CreatedDate { get; set; }
        public int? CreatedBy { get; set; }
    }
}
