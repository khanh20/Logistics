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
    [Table(nameof(EmailNotification), Schema = DbSchemas.LGFinance)]
    public class EmailNotification : ICreatedBy
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public Guid CustomerId { get; set; }                    // Khách hàng nhận thông báo

        [Required]
        [MaxLength(100)]
        public string ToEmail { get; set; }                     // Email nhận

        public string Subject { get; set; }                     // Tiêu đề Email

        public EmailTemplateTypeEnum? TemplateType { get; set; } // Loại template thông báo

        public string? TemplateData { get; set; }              // Dữ liệu điền vào template (JSONB)

        public string? Body { get; set; }                      // Nội dung trực tiếp (nếu không dùng template)

        [Required]
        public NotificationDeliveryStatusEnum DeliveryStatus { get; set; } = NotificationDeliveryStatusEnum.Queued; // Trạng thái gửi

        [MaxLength(200)]
        public string? MessageId { get; set; }                 // ID tin nhắn trả về (nếu có)

        public string? ErrorMessage { get; set; }              // Thông báo lỗi (nếu gửi thất bại)

        public DateTime? SentAt { get; set; }                  // Thời điểm gửi

        public DateTime? DeliveredAt { get; set; }             // Thời điểm đã giao đến người nhận

        public DateTime? CreatedDate { get; set; }
        public Guid? CreatedBy { get; set; }
    }
}
