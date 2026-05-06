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
    [Table(nameof(ZaloNotification), Schema = DbSchemas.LGFinance)]
    public class ZaloNotification : ICreatedBy
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Required]
        public int CustomerId { get; set; }                    // Khách hàng nhận thông báo

        [Required]
        [MaxLength(100)]
        public string ZaloUserId { get; set; }                  // ID Zalo OA của khách hàng

        public ZaloTemplateTypeEnum? TemplateType { get; set; } // Loại template thông báo Zalo

        public string? TemplateData { get; set; }              // Dữ liệu điền vào template (JSONB)

        [Required]
        public ZaloDeliveryStatusEnum DeliveryStatus { get; set; } = ZaloDeliveryStatusEnum.Queued; // Trạng thái gửi

        [MaxLength(200)]
        public string? ZaloMessageId { get; set; }             // ID tin nhắn Zalo trả về

        public string? ErrorMessage { get; set; }              // Thông báo lỗi (nếu gửi thất bại)

        public DateTime? SentAt { get; set; }                  // Thời điểm gửi

        public DateTime? DeliveredAt { get; set; }             // Thời điểm đã giao đến người nhận

        public DateTime? CreatedDate { get; set; }
        public int? CreatedBy { get; set; }
    }
}
