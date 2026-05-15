using LG.Untils.EnumFinance;
using System;
using System.ComponentModel.DataAnnotations;

namespace LG.Core.ApplicationServices.Finance.DTOs.EmailNotification
{
    public class EmailNotificationDto
    {
        public Guid Id { get; set; }
        public Guid CustomerId { get; set; }
        public string ToEmail { get; set; }
        public string Subject { get; set; }
        public EmailTemplateTypeEnum? TemplateType { get; set; }
        public string? TemplateData { get; set; }
        public string? Body { get; set; }
        public NotificationDeliveryStatusEnum DeliveryStatus { get; set; }
        public string? MessageId { get; set; }
        public string? ErrorMessage { get; set; }
        public DateTime? SentAt { get; set; }
        public DateTime? DeliveredAt { get; set; }
        public DateTime? CreatedDate { get; set; }
    }

    public class SendEmailNotificationDto
    {
        [Required]
        public Guid CustomerId { get; set; }

        [Required, EmailAddress, MaxLength(100)]
        public string ToEmail { get; set; }

        [Required]
        public string Subject { get; set; }

        public string? Body { get; set; }

        public EmailTemplateTypeEnum? TemplateType { get; set; }

        public string? TemplateData { get; set; }
    }
}
