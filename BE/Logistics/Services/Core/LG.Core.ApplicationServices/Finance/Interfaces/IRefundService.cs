using LG.Core.ApplicationServices.Finance.DTOs.Refund;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace LG.Core.ApplicationServices.Finance.Interfaces
{
    public interface IRefundService
    {
        Task<List<RefundDto>> GetAllAsync();
        Task<RefundDto> GetByIdAsync(Guid id);
        Task<RefundDto> CreateRefundRequestAsync(CreateRefundDto dto);
        Task<bool> ApproveRefundAsync(Guid refundId);
        Task<bool> RejectRefundAsync(Guid refundId, string reason);
    }
}
