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
    [Table(nameof(VipTier), Schema = DbSchemas.LGFinance)]
    public class VipTier : ICreatedBy
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        [MaxLength(50)]
        public string Name { get; set; }            // Tên hạng VIP (VD: Bronze, Silver, Gold, ...)

        [Required]
        public short Level { get; set; }            // Thứ tự cấp bậc (duy nhất)

        [Required]
        [Column(TypeName = "decimal(18,0)")]
        public decimal MinSpendVnd { get; set; }    // Tổng chi tiêu tối thiểu để đạt hạng (VNĐ)

        [Column(TypeName = "decimal(5,4)")]
        public decimal ServiceFeeDiscountPct { get; set; } = 0; // % giảm phí dịch vụ

        public bool FreeInspection { get; set; } = false;  // Miễn phí kiểm hàng

        public short FreeStorageDays { get; set; } = 7;    // Số ngày lưu kho miễn phí

        public bool PrioritySupport { get; set; } = false; // Ưu tiên hỗ trợ

        [Column(TypeName = "decimal(5,4)")]
        public decimal? DepositPctOverride { get; set; }   // Ghi đè % đặt cọc riêng cho hạng này

        [Column(TypeName = "decimal(5,4)")]
        public decimal CashbackPct { get; set; } = 0;      // % hoàn tiền

        [MaxLength(6)]
        public string? ColorHex { get; set; }               // Màu hiển thị hạng (mã HEX)

        public DateTime? CreatedDate { get; set; }
        public int? CreatedBy { get; set; }
    }
}
