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
        Task<(List<PaymentLockDto> Items, int TotalCount)> SearchAsync(PaymentLockStatusEnum? status, Guid? orderId, int page, int pageSize);
        Task<PaymentLockDto> CreateAsync(CreatePaymentLockDto dto);
        Task<bool> ReleaseAsync(Guid id, ReleaseReasonEnum reason);
        Task<bool> ReleaseByOrderIdAsync(Guid orderId, ReleaseReasonEnum reason);
    }
}
