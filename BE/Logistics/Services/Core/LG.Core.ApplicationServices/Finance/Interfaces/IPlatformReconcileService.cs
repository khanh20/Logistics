using LG.Core.ApplicationServices.Finance.DTOs.PlatformReconcile;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace LG.Core.ApplicationServices.Finance.Interfaces
{
    public interface IPlatformReconcileService
    {
        Task<List<PlatformReconcileDto>> GetAllAsync();
        Task<PlatformReconcileDto> CreateAsync(CreatePlatformReconcileDto dto);
        Task<bool> ConfirmAsync(Guid id, Guid adminId);
    }
}
