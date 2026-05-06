using LG.EntitiesBase;
using LG.Shared.Constants.Common.Database;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LG.Core.Domain.Finance
{
    [Table(nameof(CreditLimit), Schema = DbSchemas.LGFinance)]
    public class CreditLimit : ICreatedBy, IModifiedBy
    {
        [Key]
        public int Id { get; set; } 

        [Required]
        public int CustomerId { get; set; }                    // Khách hàng được cấp hạn mức tín dụng (1-1)

        [Required]
        [Column(TypeName = "decimal(18,0)")]
        public decimal MaxCreditVnd { get; set; }              // Hạn mức tín dụng tối đa (VNĐ)

        [Column(TypeName = "decimal(18,0)")]
        public decimal CurrentDebtVnd { get; set; } = 0;      // Dư nợ hiện tại (VNĐ)

        public short DueDateDays { get; set; } = 30;          // Số ngày được nợ trước khi quá hạn

        public int? GrantedBy { get; set; }                   // Nhân viên cấp hạn mức tín dụng

        [Required]
        public DateTime GrantedAt { get; set; }                // Thời điểm cấp hạn mức

        public DateOnly? ExpiresAt { get; set; }               // Ngày hết hạn hạn mức (null = không giới hạn)

        public bool IsActive { get; set; } = true;            // Hạn mức có đang hiệu lực không

        public DateTime? CreatedDate { get; set; }
        public int? CreatedBy { get; set; }
        public DateTime? ModifiedDate { get; set; }
        public int? ModifiedBy { get; set; }
    }
}
