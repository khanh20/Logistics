using AutoMapper;
using LG.ApplicationBase.Localization;
using LG.Core.ApplicationServices.Common;
using LG.Core.ApplicationServices.Finance.DTOs.DailyRevenue;
using LG.Core.ApplicationServices.Finance.Interfaces;
using LG.Core.Domain.Finance;
using LG.Core.Infrastructure;
using LG.Shared.Constants;
using LG.Untils.EnumFinance;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;

namespace LG.Core.ApplicationServices.Finance.Services
{
    public class DailyRevenueService : CoreServiceBase, IDailyRevenueService
    {
        private readonly CoreDbContext _db;
        private readonly HttpClient _httpClient;

        public DailyRevenueService(
            CoreDbContext db,
            IMapper mapper,
            HttpClient httpClient,
            IHttpContextAccessor httpContextAccessor,
            LocalizationBase localization,
            ILogger<DailyRevenueService> logger)
            : base(logger, httpContextAccessor, db, localization, mapper)
        {
            _db = db;
            _httpClient = httpClient;
        }

        public async Task<DailyRevenueReportDto> GenerateForDateAsync(DateOnly date)
        {
            // 1. Lấy dữ liệu phí từ Module1 (CustomerOrder)
            var dateStr = date.ToString("yyyy-MM-dd");
            var url = $"api/manage/orders/internal/daily-revenue-summary?date={dateStr}";
            
            DailyRevenueSummaryDto module1Summary = null;
            try
            {
                var response = await _httpClient.GetFromJsonAsync<ApiResponse<DailyRevenueSummaryDto>>(url);
                if (response != null && response.Success && response.Data != null)
                {
                    module1Summary = response.Data;
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not fetch daily revenue summary from Module 1 for date {Date}", dateStr);
            }

            // 2. Lấy dữ liệu chênh lệch tỷ giá từ quá trình đối soát trong Core
            var reconciles = await _db.PlatformReconcile
                .Where(x => x.ReconcileDate == date && x.Status == ReconcileStatusEnum.Matched)
                .ToListAsync();

            decimal totalVarianceVnd = reconciles.Sum(x => x.VarianceVnd ?? 0m);
            decimal totalCnySpent = reconciles.Sum(x => x.CnySpent);
            
            // 3. Upsert vào bảng DailyRevenueReport
            var reportDateUtc = DateTime.SpecifyKind(date.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);
            var report = await _db.DailyRevenueReports.FirstOrDefaultAsync(x => x.ReportDate == reportDateUtc);
            if (report == null)
            {
                report = new DailyRevenueReport
                {
                    Id = Guid.NewGuid(),
                    ReportDate = reportDateUtc,
                    CreatedDate = DateTime.UtcNow
                };
                _db.DailyRevenueReports.Add(report);
            }

            // Map data
            if (module1Summary != null)
            {
                report.TotalOrdersCompleted = module1Summary.TotalOrders;
                report.ServiceFeeRevenueVnd = module1Summary.ServiceFeeVnd;
                report.ShipFeeRevenueVnd = module1Summary.ShippingFeeVnd;
                report.InspectionFeeRevenueVnd = module1Summary.InspectionFeeVnd;
                report.InsuranceFeeRevenueVnd = module1Summary.InsuranceFeeVnd;
                
                report.EntrustmentFeeRevenueVnd = module1Summary.ImportEntrustmentFeeVnd;
                report.VatFeeRevenueVnd = module1Summary.ImportVatVnd;
                report.DutyFeeRevenueVnd = module1Summary.ImportDutyVnd;
            }
            
            report.ExchangeProfitLossVnd = totalVarianceVnd;
            
            // Calculate Total Collected On Behalf
            report.TotalCollectedOnBehalfVnd = report.VatFeeRevenueVnd + report.DutyFeeRevenueVnd;

            // Calculate total revenue (Gross Revenue)
            report.TotalRevenueVnd = report.ServiceFeeRevenueVnd 
                                   + report.ShipFeeRevenueVnd 
                                   + report.InspectionFeeRevenueVnd 
                                   + report.InsuranceFeeRevenueVnd 
                                   + report.EntrustmentFeeRevenueVnd 
                                   + report.PenaltyRevenueVnd 
                                   + (report.ExchangeProfitLossVnd ?? 0);

            report.GeneratedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            return _mapper.Map<DailyRevenueReportDto>(report);
        }

        public async Task<List<DailyRevenueReportDto>> GetRangeAsync(DateOnly from, DateOnly to)
        {
            var fromDt = DateTime.SpecifyKind(from.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);
            var toDt = DateTime.SpecifyKind(to.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);

            var reports = await _db.DailyRevenueReports
                .Where(x => x.ReportDate >= fromDt && x.ReportDate <= toDt)
                .OrderBy(x => x.ReportDate)
                .ToListAsync();

            return _mapper.Map<List<DailyRevenueReportDto>>(reports);
        }
    }
}
