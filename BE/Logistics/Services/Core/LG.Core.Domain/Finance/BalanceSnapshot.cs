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
    [Table(nameof(BalanceSnapshot), Schema = DbSchemas.LGFinance)]
    public class BalanceSnapshot : ICreatedBy
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Required]
        public DateOnly SnapshotDate { get; set; }              // Ngày chụp snapshot (duy nhất)

        [Required]
        [Column(TypeName = "decimal(18,0)")]
        public decimal TotalAvailableVnd { get; set; }         // Tổng số dư khả dụng toàn hệ thống (VNĐ)

        [Required]
        [Column(TypeName = "decimal(18,0)")]
        public decimal TotalFrozenVnd { get; set; }            // Tổng số dư đang bị khóa (VNĐ)

        [Required]
        [Column(TypeName = "decimal(18,0)")]
        public decimal TotalBalanceVnd { get; set; }           // Tổng số dư toàn hệ thống (VNĐ)

        [Required]
        public int TotalActiveWallets { get; set; }            // Tổng số ví đang hoạt động

        [Required]
        public int TotalWalletsWithBalance { get; set; }       // Tổng số ví có số dư > 0

        [Column(TypeName = "decimal(18,0)")]
        public decimal? VarianceFromPrev { get; set; }         // Chênh lệch so với snapshot ngày trước (VNĐ)

        public bool IsReconciled { get; set; } = false;       // Đã được đối soát chưa

        public int? ReconciledBy { get; set; }               // Nhân viên thực hiện đối soát

        [Required]
        public DateTime SnapshotAt { get; set; }              // Thời điểm chính xác khi chụp snapshot

        public DateTime? CreatedDate { get; set; }
        public int? CreatedBy { get; set; }
    }
}

