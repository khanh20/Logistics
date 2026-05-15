using LG.Core.ApplicationServices.Finance.DTOs.PaymentLock;
using LG.Untils.EnumFinance;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace LG.Core.ApplicationServices.Finance.Interfaces
{
    public interface IPaymentLockService
    {
        Task<List<PaymentLockDto>> GetByOrderIdAsync(Guid orderId);
        Task<PaymentLockDto> CreateAsync(CreatePaymentLockDto dto);
        Task<bool> ReleaseAsync(Guid id, ReleaseReasonEnum reason);
    }
}
