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
using System.Linq;
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

        /// <summary>
        /// Thu thập các đặc trưng hành vi (behavioral features) của khách hàng từ DB,
        /// gửi sang AI Service (Python) để phân tích gian lận.
        /// </summary>
        public async Task<EvaluateFraudResultDto> EvaluateTransactionAsync(
            Guid customerId, decimal amount, string transactionType, string contextInfo)
        {
            // === Thu thập features từ DB ===
            var customer = await _db.CustomerProfiles
                .FirstOrDefaultAsync(c => c.UserId == customerId || c.Id == customerId);
            var customerAgeHours = customer != null
                ? (DateTime.UtcNow - customer.CreatedDate)?.TotalHours ?? 100
                : 100;

            var wallet = await _db.Wallets
                .FirstOrDefaultAsync(w => w.CustomerId == customerId);

            if (wallet != null && wallet.IgnoreFraudDetection)
            {
                _logger.LogInformation("Bỏ qua kiểm tra gian lận cho khách hàng {CustomerId} (đã được đánh dấu an toàn).", customerId);
                return new EvaluateFraudResultDto
                {
                    IsFraud = false,
                    RiskScore = 0,
                    Reason = "Giao dịch bình thường, không phát hiện dấu hiệu bất thường (Tài khoản tin cậy)"
                };
            }

            // Lịch sử nạp tiền trong 24h gần nhất
            var cutoff24h = DateTime.UtcNow.AddHours(-24);
            var recentTopups = await _db.TopupRequests
                .Where(t => t.WalletId == (wallet != null ? wallet.Id : Guid.Empty)
                            && t.CreatedDate >= cutoff24h)
                .ToListAsync();

            int recentTopupCount24h = recentTopups.Count;
            decimal recentTopupTotal24h = recentTopups.Sum(t => t.AmountVnd);

            // Trung bình nạp tiền (toàn bộ lịch sử)
            var allTopups = await _db.TopupRequests
                .Where(t => t.WalletId == (wallet != null ? wallet.Id : Guid.Empty)
                            && t.Status == TopupStatusEnum.Matched)
                .ToListAsync();
            decimal averageTopupAmount = allTopups.Count > 0
                ? allTopups.Average(t => t.AmountVnd)
                : 0m;

            // Đã từng đặt đơn hàng chưa? (kiểm tra bảng WalletTransactions có giao dịch ORDER/PAYMENT)
            bool hasCompletedOrder = await _db.WalletTransactions
                .AnyAsync(t => t.WalletId == (wallet != null ? wallet.Id : Guid.Empty)
                               && (t.ReferenceType == "Order" || t.ReferenceType == "Payment"));

            // === Gửi payload mở rộng sang AI Service ===
            var payload = new
            {
                customerId = customerId.ToString(),
                amount = (double)amount,
                transactionType = transactionType,
                customerAgeHours = customerAgeHours,
                contextInfo = contextInfo,
                // Enhanced features
                totalDepositedEver = (double)(wallet?.TotalDepositedEver ?? 0m),
                recentTopupCount24h = recentTopupCount24h,
                recentTopupTotal24h = (double)recentTopupTotal24h,
                averageTopupAmount = (double)averageTopupAmount,
                walletBalance = (double)(wallet?.AvailableBalance ?? 0m),
                hasCompletedOrder = hasCompletedOrder
            };

            try
            {
                var httpClient = _httpClientFactory.CreateClient();
                var content = new StringContent(
                    JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
                var aiUrl = _config["AiServiceUrl"] ?? "http://127.0.0.1:8000";
                var response = await httpClient.PostAsync($"{aiUrl}/evaluate-fraud", content);

                if (response.IsSuccessStatusCode)
                {
                    var resultString = await response.Content.ReadAsStringAsync();
                    var aiResult = JsonSerializer.Deserialize<EvaluateFraudResultDto>(resultString);
                    if (aiResult != null)
                    {
                        _logger.LogInformation(
                            "AI Fraud evaluation for {CustomerId}: Score={Score}, IsFraud={IsFraud}",
                            customerId, aiResult.RiskScore, aiResult.IsFraud);
                        return aiResult;
                    }
                }
                else
                {
                    _logger.LogWarning("Python AI API Error: {Error}",
                        await response.Content.ReadAsStringAsync());
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Không thể kết nối đến Python AI Microservice.");
            }

            // === C# Heuristic Fallback (6 luật giống Python) ===
            _logger.LogInformation("Sử dụng Heuristic Fallback vì Python AI Service không phản hồi.");
            return RunHeuristicFallback(amount, customerAgeHours,
                recentTopupCount24h, recentTopupTotal24h,
                averageTopupAmount, wallet?.TotalDepositedEver ?? 0m,
                hasCompletedOrder);
        }

        private EvaluateFraudResultDto RunHeuristicFallback(
            decimal amount, double customerAgeHours,
            int recentTopupCount24h, decimal recentTopupTotal24h,
            decimal averageTopupAmount, decimal totalDepositedEver,
            bool hasCompletedOrder)
        {
            var score = 0m;
            var reasons = new List<string>();

            // Rule 1: Tài khoản mới + nạp lớn
            if (customerAgeHours < 24 && amount >= 5_000_000)
            {
                score += 40;
                reasons.Add($"Tài khoản mới ({customerAgeHours:F1}h) nạp {amount:N0} VNĐ");
            }

            // Rule 2: Velocity abuse - nạp quá nhiều lần trong 24h
            if (recentTopupCount24h >= 5)
            {
                score += 25;
                reasons.Add($"Nạp tiền {recentTopupCount24h} lần trong 24h (nghi ngờ chia nhỏ giao dịch)");
            }

            // Rule 3: Amount spike - số tiền nạp >> trung bình
            if (averageTopupAmount > 0 && amount > averageTopupAmount * 3)
            {
                score += 20;
                reasons.Add($"Số tiền nạp ({amount:N0}) gấp {amount / averageTopupAmount:F1}x trung bình ({averageTopupAmount:N0})");
            }

            // Rule 4: Rapid accumulation - tổng nạp 24h >= 50 triệu
            if (recentTopupTotal24h + amount >= 50_000_000)
            {
                score += 30;
                reasons.Add($"Tổng nạp 24h đạt {recentTopupTotal24h + amount:N0} VNĐ (>= 50 triệu)");
            }

            // Rule 5: Nạp nhiều nhưng chưa bao giờ đặt hàng
            if (totalDepositedEver >= 10_000_000 && !hasCompletedOrder)
            {
                score += 15;
                reasons.Add($"Đã nạp tổng {totalDepositedEver:N0} VNĐ nhưng chưa đặt đơn hàng nào");
            }

            // Rule 6: Giao dịch đơn lẻ rất lớn
            if (amount >= 20_000_000)
            {
                score += 15;
                reasons.Add($"Giao dịch đơn lẻ rất lớn: {amount:N0} VNĐ");
            }

            score = Math.Min(score, 100m);

            if (reasons.Count == 0)
                reasons.Add("Giao dịch bình thường, không phát hiện dấu hiệu bất thường");

            var finalReason = string.Join(" | ", reasons) + $" [Tổng điểm: {score:F0}, Fallback C#]";

            return new EvaluateFraudResultDto
            {
                IsFraud = score >= 80,
                RiskScore = score,
                Reason = finalReason
            };
        }

        public async Task CreateFraudRecordAsync(Guid customerId, decimal riskScore, string reason)
        {
            var wallet = await _db.Wallets.FirstOrDefaultAsync(w => w.CustomerId == customerId);

            var fraudRecord = new FraudDetection
            {
                WalletId = wallet?.Id ?? Guid.Empty,
                CustomerId = customerId,
                RiskScore = riskScore,
                EvidenceJson = reason,
                Action = FraudActionEnum.FreezeWallet,
                Status = FraudStatusEnum.Open,
                CreatedDate = DateTime.UtcNow
            };

            await _db.FraudDetections.AddAsync(fraudRecord);

            if (fraudRecord.Action == FraudActionEnum.FreezeWallet && wallet != null)
            {
                wallet.IsFrozen = true;
                _logger.LogWarning("Ví {WalletId} của Customer {CustomerId} đã bị KHÓA TỰ ĐỘNG do phát hiện gian lận.", wallet.Id, customerId);
            }

            await _db.SaveChangesAsync();

            _logger.LogWarning("Fraud record created for customer {CustomerId}, RiskScore={RiskScore}",
                customerId, riskScore);
        }
    }
}
