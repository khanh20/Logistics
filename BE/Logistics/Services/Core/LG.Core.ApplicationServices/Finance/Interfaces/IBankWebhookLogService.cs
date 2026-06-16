using LG.Core.ApplicationServices.Finance.DTOs.BankWebhookLog;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace LG.Core.ApplicationServices.Finance.Interfaces
{
    public interface IBankWebhookLogService
    {
        Task<List<BankWebhookLogDto>> GetAllAsync();
        Task<BankWebhookLogDto?> GetByIdAsync(Guid id);
    }
}
