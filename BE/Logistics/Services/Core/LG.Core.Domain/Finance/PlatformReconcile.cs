using LG.Untils.EnumFinance;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using LG.Shared.Constants.Common.Database;
using LG.EntitiesBase;

namespace LG.Core.Domain.Finance
{
    [Table(nameof(PlatformReconcile), Schema = DbSchemas.LGFinance)]
    public class PlatformReconcile : ICreatedBy
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public DateOnly ReconcileDate { get; set; }             // Ngày đối soát

        [Required]
        public Guid PlatformId { get; set; }                    // Nền tảng mua hàng (VD: Taobao, 1688, ...)

        [Required]
        public Guid PlatformAccountId { get; set; }            // Tài khoản nền tảng sử dụng để mua

        [Required]
        [Column(TypeName = "decimal(12,2)")]
        public decimal CnySpent { get; set; }                  // Tổng CNY đã chi qua nền tảng

        [Required]
        [Column(TypeName = "decimal(18,0)")]
        public decimal VndEquivalent { get; set; }             // Quy đổi sang VNĐ theo tỷ giá thực tế

        [Required]
        [Column(TypeName = "decimal(18,0)")]
        public decimal ServiceFeeCollectedVnd { get; set; }    // Tổng phí dịch vụ thu được trong kỳ (VNĐ)

        [Column(TypeName = "decimal(18,0)")]
        public decimal? VarianceVnd { get; set; }              // Chênh lệch sau đối soát (VNĐ)

        [MaxLength(500)]
        public string? AlipayStatementUrl { get; set; }        // URL sao kê Alipay đính kèm

        [Required]
        public ReconcileStatusEnum Status { get; set; } = ReconcileStatusEnum.Pending; // Trạng thái đối soát

        public string? Notes { get; set; }                     // Ghi chú thêm

        public Guid? ReconciledBy { get; set; }               // Nhân viên thực hiện đối soát

        public DateTime? ReconciledAt { get; set; }           // Thời điểm hoàn tất đối soát

        public DateTime? CreatedDate { get; set; }
        public int? CreatedBy { get; set; }
    }
}
