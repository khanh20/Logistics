using AutoMapper;
using LG.ApplicationBase.Localization;
using LG.Core.ApplicationServices.Common;
using LG.Core.ApplicationServices.Common.Interfaces;
using LG.Core.ApplicationServices.Finance.DTOs.EmailNotification;
using LG.Core.ApplicationServices.Finance.Interfaces;
using LG.Core.Domain.Finance;
using LG.Core.Infrastructure;
using LG.Untils.EnumFinance;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using LG.Shared.Constants.Email;

namespace LG.Core.ApplicationServices.Finance.Services
{
    public class EmailNotificationService : CoreServiceBase, IEmailNotificationService
    {
        private readonly CoreDbContext _db;
        private readonly IMapper _mapper;
        private readonly IEmailService _emailService;

        public EmailNotificationService(
            CoreDbContext db,
            IMapper mapper,
            IEmailService emailService,
            IHttpContextAccessor httpContextAccessor,
            LocalizationBase localization,
            ILogger<EmailNotificationService> logger)
            : base(logger, httpContextAccessor, db, localization, mapper)
        {
            _db = db;
            _mapper = mapper;
            _emailService = emailService;
        }

        public async Task<List<EmailNotificationDto>> GetByCustomerIdAsync(Guid customerId)
        {
            var logs = await _db.EmailNotifications
                .Where(x => x.CustomerId == customerId)
                .OrderByDescending(x => x.CreatedDate)
                .ToListAsync();

            return _mapper.Map<List<EmailNotificationDto>>(logs);
        }

        public async Task<EmailNotificationDto> CreateAsync(SendEmailNotificationDto dto)
        {
            var notification = _mapper.Map<EmailNotification>(dto);
            notification.DeliveryStatus = NotificationDeliveryStatusEnum.Queued;
            notification.CreatedDate = DateTime.UtcNow;

            // Gửi email đồng bộ ngay lập tức
            try
            {
                var emailBody = !string.IsNullOrEmpty(dto.Body)
                    ? dto.Body
                    : BuildEmailBody(dto.TemplateType, dto.TemplateData);

                await _emailService.SendEmailAsync(dto.ToEmail, dto.Subject, emailBody);

                notification.DeliveryStatus = NotificationDeliveryStatusEnum.Sent;
                notification.SentAt = DateTime.UtcNow;
                notification.Body = emailBody;
            }
            catch (Exception ex)
            {
                notification.DeliveryStatus = NotificationDeliveryStatusEnum.Failed;
                notification.ErrorMessage = ex.Message;
            }

            _db.EmailNotifications.Add(notification);
            await _db.SaveChangesAsync();

            return _mapper.Map<EmailNotificationDto>(notification);
        }

        /// <summary>
        /// Tạo nội dung email HTML dựa trên loại template
        /// </summary>
        private string BuildEmailBody(EmailTemplateTypeEnum? templateType, string? templateData)
        {
            var title = templateType switch
            {
                EmailTemplateTypeEnum.OrderConfirmed => EmailTitles.OrderConfirmed,
                EmailTemplateTypeEnum.OrderShipped => EmailTitles.OrderShipped,
                EmailTemplateTypeEnum.OrderDelivered => EmailTitles.OrderDelivered,
                EmailTemplateTypeEnum.TopupSuccess => EmailTitles.TopupSuccess,
                EmailTemplateTypeEnum.WithdrawSuccess => EmailTitles.WithdrawSuccess,
                EmailTemplateTypeEnum.DebtReminder => EmailTitles.DebtReminder,
                EmailTemplateTypeEnum.VoucherExpiry => EmailTitles.VoucherExpiry,
                EmailTemplateTypeEnum.VipUpgrade => EmailTitles.VipUpgrade,
                _ => EmailTitles.DefaultNotification
            };

            var bodyContent = templateData ?? "Bạn có một thông báo mới từ hệ thống.";

            try
            {
                // Đọc template HTML từ thư mục của dự án (LG.Core.API)
                var templatePath = Path.Combine(Directory.GetCurrentDirectory(), "Templates", "DefaultEmailTemplate.html");
                
                if (File.Exists(templatePath))
                {
                    var htmlTemplate = File.ReadAllText(templatePath);
                    // Thực hiện replace nội dung động
                    return htmlTemplate
                        .Replace("{{title}}", title)
                        .Replace("{{body}}", bodyContent);
                }
                else
                {
                    _logger.LogWarning("Không tìm thấy file template email tại {TemplatePath}", templatePath);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi đọc file HTML template");
            }

            // Fallback nếu lỗi đọc file template
            return $"<h2>{title}</h2><p>{bodyContent}</p>";
        }
    }
}

