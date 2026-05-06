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
    [Table(nameof(FeeRule), Schema = DbSchemas.LGFinance)]
    public class FeeRule : ICreatedBy
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string Name { get; set; }                        // Tên bộ quy tắc phí

        public int? VipTierId { get; set; }                    // Áp dụng riêng cho hạng VIP (null = tất cả)

        public int? PlatformId { get; set; }                   // Áp dụng riêng cho nền tảng (null = tất cả)

        [Required]
        [Column(TypeName = "decimal(5,4)")]
        public decimal ServiceFeePct { get; set; }              // % phí dịch vụ

        [Required]
        [Column(TypeName = "decimal(10,0)")]
        public decimal IntlShipPerKgVnd { get; set; }           // Phí vận chuyển quốc tế / kg (VNĐ)

        public short IntlShipVolDivisor { get; set; } = 8000;   // Hệ số chia thể tích (cm³/kg)

        [Column(TypeName = "decimal(5,3)")]
        public decimal MinChargeKg { get; set; } = 0.300m;     // Cân nặng tối thiểu tính phí (kg)

        [Column(TypeName = "decimal(5,4)")]
        public decimal InspectionFeePct { get; set; } = 0.005m; // % phí kiểm hàng trên giá trị đơn

        [Column(TypeName = "decimal(10,0)")]
        public decimal InspectionMinVnd { get; set; } = 15000;  // Phí kiểm hàng tối thiểu (VNĐ)

        [Column(TypeName = "decimal(10,0)")]
        public decimal InspectionMaxVnd { get; set; } = 50000;  // Phí kiểm hàng tối đa (VNĐ)

        [Column(TypeName = "decimal(5,4)")]
        public decimal InsuranceBasicPct { get; set; } = 0.02m; // % phí bảo hiểm cơ bản

        [Column(TypeName = "decimal(5,4)")]
        public decimal InsuranceFullPct { get; set; } = 0.04m;  // % phí bảo hiểm toàn diện

        [Column(TypeName = "decimal(10,0)")]
        public decimal StorageDailyPerKgVnd { get; set; } = 5000; // Phí lưu kho / kg / ngày (VNĐ)

        public bool IsActive { get; set; } = true;              // Bộ quy tắc đang có hiệu lực

        [Required]
        public DateOnly EffectiveFrom { get; set; }             // Ngày bắt đầu áp dụng

        public DateOnly? EffectiveTo { get; set; }              // Ngày kết thúc (null = không giới hạn)

        public DateTime? CreatedDate { get; set; }
        public int? CreatedBy { get; set; }
    }
}
