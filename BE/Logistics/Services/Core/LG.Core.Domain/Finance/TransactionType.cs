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
    [Table(nameof(TransactionType), Schema = DbSchemas.LGFinance)]
    public class TransactionType : ICreatedBy
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        [MaxLength(50)]
        public string Code { get; set; }                        // Mã loại giao dịch (VD: TOPUP, WITHDRAW, ...)

        [Required]
        [MaxLength(100)]
        public string Name { get; set; }                        // Tên hiển thị loại giao dịch

        public TransactionDirectionEnum? Direction { get; set; } // Chiều giao dịch: Credit (vào) / Debit (ra)

        public bool IsReversible { get; set; } = false;        // Có thể hoàn tác không

        public DateTime? CreatedDate { get; set; }
        public int? CreatedBy { get; set; }
    }
}

