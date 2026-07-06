using AutoMapper;
using LG.ApplicationBase.Localization;
using LG.Core.ApplicationServices.Common;
using LG.Core.ApplicationServices.Finance.DTOs.FraudDetection;
using LG.Core.ApplicationServices.Finance.Interfaces;
using LG.Core.Domain.Finance;
using LG.Core.Infrastructure;
using LG.Untils.EnumFinance;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http;
using System.Text.Json;
using System.Text;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;

namespace LG.Core.ApplicationServices.Finance.Services
{
    public class FraudDetectionService : CoreServiceBase, IFraudDetectionService
    {
        private readonly CoreDbContext _db;
        private readonly IMapper _mapper;
        private readonly IConfiguration _config;
        private readonly IHttpClientFactory _httpClientFactory;

        public FraudDetectionService(
            CoreDbContext db,
            IMapper mapper,
            IConfiguration config,
            IHttpClientFactory httpClientFactory,
            IHttpContextAccessor httpContextAccessor,
            LocalizationBase localization,
            ILogger<FraudDetectionService> logger)
            : base(logger, httpContextAccessor, db, localization, mapper)
        {
            _db = db;
            _mapper = mapper;
            _config = config;
            _httpClientFactory = httpClientFactory;
        }

        public async Task<List<FraudDetectionDto>> GetAllAsync()
        {
            var detections = await _db.FraudDetections
                .OrderByDescending(x => x.CreatedDate)
                .ToListAsync();

            return _mapper.Map<List<FraudDetectionDto>>(detections);
        }

        public async Task<FraudDetectionDto?> GetByIdAsync(Guid id)
        {
            var detection = await _db.FraudDetections.FindAsync(id);
            return detection == null ? null : _mapper.Map<FraudDetectionDto>(detection);
        }

        public async Task<bool> ReviewAsync(Guid id, ReviewFraudDto dto, Guid adminId)
        {
            var detection = await _db.FraudDetections.FindAsync(id);
            if (detection == null) return false;

            detection.Status = dto.Status;
            detection.ResolutionNote = dto.ResolutionNote;
            detection.ReviewedBy = adminId;
            detection.ReviewedAt = DateTime.UtcNow;
            detection.ModifiedDate = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<EvaluateFraudResultDto> EvaluateTransactionAsync(Guid customerId, decimal amount, string transactionType, string contextInfo)
        {
            var customer = await _db.CustomerProfiles.FirstOrDefaultAsync(c => c.UserId == customerId || c.Id == customerId);
            var customerAgeHours = customer != null ? (DateTime.UtcNow - customer.CreatedDate)?.TotalHours ?? 100 : 100;

            var payload = new
            {
                customerId = customerId.ToString(),
                amount = amount,
                transactionType = transactionType,
                customerAgeHours = customerAgeHours,
                contextInfo = contextInfo
            };

            try
            {
                var httpClient = _httpClientFactory.CreateClient();
                // Gọi sang AI Microservice (Python FastAPI)
                var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
                var aiUrl = _config["AiServiceUrl"] ?? "http://127.0.0.1:8000";
                var response = await httpClient.PostAsync($"{aiUrl}/evaluate-fraud", content);

                if (response.IsSuccessStatusCode)
                {
                    var resultString = await response.Content.ReadAsStringAsync();
                    var aiResult = JsonSerializer.Deserialize<EvaluateFraudResultDto>(resultString);
                    if (aiResult != null) return aiResult;
                }
                else
                {
                    _logger.LogWarning($"Python AI API Error: {await response.Content.ReadAsStringAsync()}");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Không thể kết nối đến Python AI Microservice.");
            }

            // Fallback Heuristic trong trường hợp Python Server bị sập
            _logger.LogInformation("Sử dụng Heuristic Fallback vì Python AI Service không phản hồi.");
            var fallbackScore = 10m;
            var fallbackReason = "Giao dịch bình thường (Fallback C#).";

            if (customerAgeHours < 24 && amount > 20000000)
            {
                fallbackScore = 85m;
                fallbackReason = "Tài khoản quá mới nhưng nạp số tiền lớn (Fallback C#).";
            }

            return new EvaluateFraudResultDto
            {
                IsFraud = fallbackScore >= 80,
                RiskScore = fallbackScore,
                Reason = fallbackReason
            };
        }
    }
}
