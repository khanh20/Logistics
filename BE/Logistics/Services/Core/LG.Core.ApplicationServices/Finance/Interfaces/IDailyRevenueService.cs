using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using LG.Core.ApplicationServices.Finance.DTOs.DailyRevenue;

namespace LG.Core.ApplicationServices.Finance.Interfaces
{
    public interface IDailyRevenueService
    {
        Task<DailyRevenueReportDto> GenerateForDateAsync(DateOnly date);
        Task<List<DailyRevenueReportDto>> GetRangeAsync(DateOnly from, DateOnly to);
    }
}
