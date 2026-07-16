using AutoMapper;
using LG.ApplicationBase.Localization;
using LG.Core.ApplicationServices.Common;
using LG.Core.ApplicationServices.Finance.DTOs.PlatformReconcile;
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
    public class ExchangeRateResponseDto
    {
        public decimal RateVndPerCny { get; set; }
    }

    public class PlatformReconcileService : CoreServiceBase, IPlatformReconcileService
    {
        private readonly CoreDbContext _db;
        private readonly IMapper _mapper;
        private readonly HttpClient _httpClient;

        public PlatformReconcileService(
            CoreDbContext db,
            IMapper mapper,
            HttpClient httpClient,
            IHttpContextAccessor httpContextAccessor,
            LocalizationBase localization,
            ILogger<PlatformReconcileService> logger)
            : base(logger, httpContextAccessor, db, localization, mapper)
        {
            _db = db;
            _mapper = mapper;
            _httpClient = httpClient;
        }

        public async Task<List<PlatformReconcileDto>> GetAllAsync()
        {
            var reconciles = await _db.PlatformReconcile
                .OrderByDescending(x => x.ReconcileDate)
                .ToListAsync();

            return _mapper.Map<List<PlatformReconcileDto>>(reconciles);
        }

        public async Task<PlatformReconcileDto> CreateAsync(CreatePlatformReconcileDto dto)
        {
            var reconcile = _mapper.Map<PlatformReconcile>(dto);
            reconcile.Status = ReconcileStatusEnum.Pending;
            reconcile.CreatedDate = DateTime.UtcNow;

            decimal exchangeRate = 3500m; // Fallback
            try
            {
                var rateUrl = "api/exchange-rates/current";
                var rateResponse = await _httpClient.GetFromJsonAsync<ApiResponse<ExchangeRateResponseDto>>(rateUrl);
                if (rateResponse != null && rateResponse.Success && rateResponse.Data != null)
                {
                    exchangeRate = rateResponse.Data.RateVndPerCny;
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not fetch current exchange rate from Module 1");
            }

            // Fetch actual platform cost from Module 1
            var dateStr = reconcile.ReconcileDate.ToString("yyyy-MM-dd");
            var url = $"api/manage/orders/internal/platform-cost?accountId={reconcile.PlatformAccountId}&date={dateStr}";
            
            try
            {
                var response = await _httpClient.GetFromJsonAsync<ApiResponse<decimal>>(url);
                if (response != null && response.Success)
                {
                    var actualCost = response.Data;
                    reconcile.VarianceVnd = (reconcile.CnySpent - actualCost) * exchangeRate;
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not fetch actual platform cost from Module 1 for account {AccountId}", reconcile.PlatformAccountId);
            }

            _db.PlatformReconcile.Add(reconcile);
            await _db.SaveChangesAsync();

            return _mapper.Map<PlatformReconcileDto>(reconcile);
        }

        public async Task<bool> ConfirmAsync(Guid id, Guid adminId)
        {
            var strategy = _db.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                using var transaction = await _db.Database.BeginTransactionAsync();
                try
                {
                    var reconcile = await _db.PlatformReconcile.FindAsync(id);
                    if (reconcile == null) return false;

                    if (reconcile.Status != ReconcileStatusEnum.Pending)
                        return false;

                    reconcile.Status = ReconcileStatusEnum.Matched;
                    reconcile.ReconciledBy = adminId;
                    reconcile.ReconciledAt = DateTime.UtcNow;

                    await _db.SaveChangesAsync();

                    // Sync balance back to Module 1
                    var url = $"api/platforms/{reconcile.PlatformId}/accounts/{reconcile.PlatformAccountId}/sync-balance";
                    
                    var content = JsonContent.Create(reconcile.CnySpent);
                    var response = await _httpClient.PatchAsync(url, content);
                    
                    if (!response.IsSuccessStatusCode)
                    {
                        var error = await response.Content.ReadAsStringAsync();
                        _logger.LogError("Failed to sync balance to Module 1 for account {AccountId}. Status: {Status}, Error: {Error}", 
                            reconcile.PlatformAccountId, response.StatusCode, error);
                        throw new Exception($"Failed to sync balance with external service: {response.StatusCode}");
                    }

                    await transaction.CommitAsync();
                    return true;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error confirming platform reconcile {Id}", id);
                    await transaction.RollbackAsync();
                    throw;
                }
            });
        }
    }
}
