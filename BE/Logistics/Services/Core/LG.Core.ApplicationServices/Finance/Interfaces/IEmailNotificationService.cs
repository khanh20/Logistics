using LG.Core.ApplicationServices.Finance.DTOs.EmailNotification;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace LG.Core.ApplicationServices.Finance.Interfaces
{
    public interface IEmailNotificationService
    {
        Task<List<EmailNotificationDto>> GetByCustomerIdAsync(Guid customerId);
        Task<EmailNotificationDto> CreateAsync(SendEmailNotificationDto dto);
    }
}
