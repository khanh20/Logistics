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
        public Guid Id { get; set; } = Guid.NewGuid(); 

        [Required]
        public Guid CustomerId { get; set; }                    // Khách hàng được cấp hạn mức tín dụng (1-1)

        [Required]
        [Column(TypeName = "decimal(18,0)")]
        public decimal MaxCreditVnd { get; set; }              // Hạn mức tín dụng tối đa (VNĐ)

        [Column(TypeName = "decimal(18,0)")]
        public decimal CurrentDebtVnd { get; set; } = 0;      // Dư nợ hiện tại (VNĐ)

        public short DueDateDays { get; set; } = 30;          // Số ngày được nợ trước khi quá hạn

        public Guid? GrantedBy { get; set; }                   // Nhân viên cấp hạn mức tín dụng

        [Required]
        public DateTime GrantedAt { get; set; }                // Thời điểm cấp hạn mức

        public DateOnly? ExpiresAt { get; set; }               // Ngày hết hạn hạn mức (null = không giới hạn)

        public bool IsActive { get; set; } = true;            // Hạn mức có đang hiệu lực không

        public DateTime? CreatedDate { get; set; }
        public Guid? CreatedBy { get; set; }
        public DateTime? ModifiedDate { get; set; }
        public Guid? ModifiedBy { get; set; }
    }
}
