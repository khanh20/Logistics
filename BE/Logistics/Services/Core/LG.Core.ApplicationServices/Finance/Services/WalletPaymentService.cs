using AutoMapper;
using LG.ApplicationBase.Localization;
using LG.Core.ApplicationServices.Common;
using LG.Core.ApplicationServices.Finance.DTOs.WalletPayment;
using LG.Core.ApplicationServices.Finance.Interfaces;
using LG.Core.Domain.Finance;
using LG.Core.Domain.Exceptions;
using LG.Core.Infrastructure;
using LG.Shared.Constants.ErrorCodes;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace LG.Core.ApplicationServices.Finance.Services
{
    /// <summary>
    /// Wallet Payment Service — xử lý trừ/hoàn tiền ví cho đơn hàng.
    /// Module1 gọi qua HTTP internal API.
    /// </summary>
    public class WalletPaymentService : CoreServiceBase, IWalletPaymentService
    {
        private readonly CoreDbContext _db;
        private readonly IMapper _mapper;

        public WalletPaymentService(
            CoreDbContext db,
            IMapper mapper,
            IHttpContextAccessor httpContextAccessor,
            LocalizationBase localization,
            ILogger<WalletPaymentService> logger)
            : base(logger, httpContextAccessor, db, localization, mapper)
        {
            _db = db;
            _mapper = mapper;
        }

        // ── GetBalance ────────────────────────────────────────────────────────────

        public async Task<WalletBalanceResponse> GetBalanceAsync(Guid customerId)
        {
            var wallet = await GetOrCreateWalletAsync(customerId);
            return new WalletBalanceResponse
            {
                WalletId = wallet.Id,
                AvailableBalance = wallet.AvailableBalance,
                FrozenBalance = wallet.FrozenBalance,
                IsFrozen = wallet.IsFrozen,
            };
        }

        // ── Deduct (đóng cọc / thanh toán cuối kỳ) ───────────────────────────────

        public async Task<WalletDeductResponse> DeductAsync(WalletDeductRequest request)
        {
            var strategy = _db.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                using var transaction = await _db.Database.BeginTransactionAsync();
                try
                {
                    var wallet = await GetOrCreateWalletAsync(request.CustomerId);

                    if (wallet.IsFrozen)
                        throw new CoreException(CoreErrorCode.CoreWalletFrozen);

                    if (wallet.AvailableBalance < request.AmountVnd)
                        throw new CoreException(CoreErrorCode.CoreInsufficientBalance);

                    // 1. Trừ tiền từ AvailableBalance
                    var balanceBefore = wallet.AvailableBalance;
                    wallet.AvailableBalance -= request.AmountVnd;
                    wallet.TotalSpentEver += request.AmountVnd;
                    wallet.ModifiedDate = DateTime.UtcNow;

                    // 2. Tạo WalletTransaction
                    var transactionType = await _db.TransactionTypes
                        .FirstOrDefaultAsync(t => t.Code == "PAYMENT");
                    var typeId = transactionType?.Id ?? Guid.Empty;

                    var walletTx = new WalletTransaction
                    {
                        WalletId = wallet.Id,
                        TypeId = typeId,
                        Amount = request.AmountVnd,
                        BalanceBefore = balanceBefore,
                        BalanceAfter = wallet.AvailableBalance,
                        ReferenceType = request.ReferenceType,
                        ReferenceId = request.ReferenceId,
                        Note = request.Note ?? $"Thanh toán đơn hàng ({request.ReferenceType})",
                        CreatedDate = DateTime.UtcNow,
                    };
                    await _db.WalletTransactions.AddAsync(walletTx);

                    // 3. Cập nhật LifetimeValueVnd và xét thăng hạng VIP
                    var profile = await _db.CustomerProfiles.FirstOrDefaultAsync(p => p.UserId == request.CustomerId);
                    if (profile != null)
                    {
                        profile.LifetimeValueVnd += request.AmountVnd;
                        
                        var newTier = await _db.VipTiers
                            .Where(t => t.MinSpendVnd <= profile.LifetimeValueVnd)
                            .OrderByDescending(t => t.MinSpendVnd)
                            .FirstOrDefaultAsync();

                        if (newTier != null && profile.VipTierId != newTier.Id)
                        {
                            profile.VipTierId = newTier.Id;
                            _logger.LogInformation("Khách hàng {CustomerId} được thăng hạng lên {TierName}", request.CustomerId, newTier.Name);
                        }
                    }

                    await _db.SaveChangesAsync();
                    await transaction.CommitAsync();

                    _logger.LogInformation(
                        "Wallet {WalletId} deducted {Amount} VND for {RefType} {RefId}. Balance: {Before} → {After}",
                        wallet.Id, request.AmountVnd, request.ReferenceType, request.ReferenceId,
                        balanceBefore, wallet.AvailableBalance);

                    return new WalletDeductResponse
                    {
                        WalletTransactionId = walletTx.Id,
                        BalanceBefore = balanceBefore,
                        BalanceAfter = wallet.AvailableBalance,
                    };
                }
                catch
                {
                    await transaction.RollbackAsync();
                    throw;
                }
            });
        }

        // ── Refund (hoàn tiền khi hủy đơn) ───────────────────────────────────────

        public async Task<WalletRefundResponse> RefundAsync(WalletRefundRequest request)
        {
            var strategy = _db.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                using var transaction = await _db.Database.BeginTransactionAsync();
                try
                {
                    var wallet = await GetOrCreateWalletAsync(request.CustomerId);

                    var balanceBefore = wallet.AvailableBalance;
                    wallet.AvailableBalance += request.AmountVnd;
                    wallet.ModifiedDate = DateTime.UtcNow;

                    // Tạo WalletTransaction (loại REFUND)
                    var transactionType = await _db.TransactionTypes
                        .FirstOrDefaultAsync(t => t.Code == "REFUND");
                    var typeId = transactionType?.Id ?? Guid.Empty;

                    var walletTx = new WalletTransaction
                    {
                        WalletId = wallet.Id,
                        TypeId = typeId,
                        Amount = request.AmountVnd,
                        BalanceBefore = balanceBefore,
                        BalanceAfter = wallet.AvailableBalance,
                        ReferenceType = request.ReferenceType,
                        ReferenceId = request.ReferenceId,
                        Note = request.Note ?? $"Hoàn tiền đơn hàng ({request.ReferenceType})",
                        CreatedDate = DateTime.UtcNow,
                    };
                    await _db.WalletTransactions.AddAsync(walletTx);

                    // Giảm LifetimeValueVnd và xét giáng hạng VIP
                    var profile = await _db.CustomerProfiles.FirstOrDefaultAsync(p => p.UserId == request.CustomerId);
                    if (profile != null)
                    {
                        profile.LifetimeValueVnd -= request.AmountVnd;
                        if (profile.LifetimeValueVnd < 0) profile.LifetimeValueVnd = 0;
                        
                        var newTier = await _db.VipTiers
                            .Where(t => t.MinSpendVnd <= profile.LifetimeValueVnd)
                            .OrderByDescending(t => t.MinSpendVnd)
                            .FirstOrDefaultAsync();

                        if (newTier != null && profile.VipTierId != newTier.Id)
                        {
                            profile.VipTierId = newTier.Id;
                            _logger.LogInformation("Khách hàng {CustomerId} bị giảm hạng xuống {TierName}", request.CustomerId, newTier.Name);
                        }
                    }

                    await _db.SaveChangesAsync();
                    await transaction.CommitAsync();

                    _logger.LogInformation(
                        "Wallet {WalletId} refunded {Amount} VND for {RefType} {RefId}. Balance: {Before} → {After}",
                        wallet.Id, request.AmountVnd, request.ReferenceType, request.ReferenceId,
                        balanceBefore, wallet.AvailableBalance);

                    return new WalletRefundResponse
                    {
                        WalletTransactionId = walletTx.Id,
                        BalanceBefore = balanceBefore,
                        BalanceAfter = wallet.AvailableBalance,
                    };
                }
                catch
                {
                    await transaction.RollbackAsync();
                    throw;
                }
            });
        }

        // ── Calculate Checkout Fees ───────────────────────────────────────────────

        public async Task<CalculateFeesResponse> CalculateCheckoutFeesAsync(CalculateFeesRequest request)
        {
            var vipTierId = request.VipTierId;
            if (!vipTierId.HasValue)
            {
                var profile = await _db.CustomerProfiles.FirstOrDefaultAsync(p => p.UserId == request.CustomerId);
                vipTierId = profile?.VipTierId;
            }

            VipTier? vipTier = null;
            if (vipTierId.HasValue)
            {
                vipTier = await _db.VipTiers.FirstOrDefaultAsync(t => t.Id == vipTierId.Value);
            }

            var rule = await FindApplicableFeeRuleAsync(vipTierId, request.PlatformId);

            if (rule == null)
            {
                // Không có FeeRule → phí = 0
                return new CalculateFeesResponse
                {
                    ServiceFeeVnd = 0,
                    InspectionFeeVnd = 0,
                    InsuranceFeeVnd = 0,
                    ImportEntrustmentFeeVnd = 0,
                    ImportVatVnd = 0,
                    ImportDutyVnd = 0,
                    InsuranceOption = request.InsuranceOption,
                    TotalCheckoutFeeVnd = 0,
                    FeeRuleId = null,
                    ServiceFeeDiscountVnd = 0,
                    InspectionFeeDiscountVnd = 0
                };
            }

            // Phí dịch vụ = SubtotalVnd × ServiceFeePct
            var serviceFee = Math.Round(request.SubtotalVnd * rule.ServiceFeePct, 0);
            decimal serviceFeeDiscount = 0;
            if (vipTier != null && vipTier.ServiceFeeDiscountPct > 0)
            {
                var discountedServiceFee = Math.Round(serviceFee * (1 - vipTier.ServiceFeeDiscountPct), 0);
                serviceFeeDiscount = serviceFee - discountedServiceFee;
                serviceFee = discountedServiceFee;
            }

            // Phí kiểm hàng = clamp(SubtotalVnd × InspectionFeePct, Min, Max)
            var inspectionFee = Math.Round(request.SubtotalVnd * rule.InspectionFeePct, 0);
            inspectionFee = Math.Max(inspectionFee, rule.InspectionMinVnd);
            inspectionFee = Math.Min(inspectionFee, rule.InspectionMaxVnd);
            decimal inspectionFeeDiscount = 0;
            if (vipTier != null && vipTier.FreeInspection)
            {
                inspectionFeeDiscount = inspectionFee;
                inspectionFee = 0;
            }

            // Bảo hiểm (tùy chọn)
            decimal insuranceFee = 0;
            if (request.InsuranceOption == "basic")
                insuranceFee = Math.Round(request.SubtotalVnd * rule.InsuranceBasicPct, 0);
            else if (request.InsuranceOption == "full")
                insuranceFee = Math.Round(request.SubtotalVnd * rule.InsuranceFullPct, 0);

            // Hàng chính ngạch
            decimal importEntrustmentFee = 0;
            decimal importVatFee = 0;
            decimal importDutyFee = 0;
            
            if (request.ShippingLine == "OfficialQuota")
            {
                importDutyFee = Math.Round(request.SubtotalVnd * rule.ImportDutyPct, 0);
                importVatFee = Math.Round((request.SubtotalVnd + importDutyFee) * rule.ImportVatPct, 0);
                importEntrustmentFee = rule.ImportEntrustmentMinVnd;
            }

            var totalFee = serviceFee + inspectionFee + insuranceFee + importEntrustmentFee + importVatFee + importDutyFee;

            return new CalculateFeesResponse
            {
                ServiceFeeVnd = serviceFee,
                InspectionFeeVnd = inspectionFee,
                InsuranceFeeVnd = insuranceFee,
                ImportEntrustmentFeeVnd = importEntrustmentFee,
                ImportVatVnd = importVatFee,
                ImportDutyVnd = importDutyFee,
                InsuranceOption = request.InsuranceOption,
                TotalCheckoutFeeVnd = totalFee,
                FeeRuleId = rule.Id,
                ServiceFeeDiscountVnd = serviceFeeDiscount,
                InspectionFeeDiscountVnd = inspectionFeeDiscount
            };
        }

        // ── Calculate Shipping Fees (cuối kỳ) ─────────────────────────────────────

        public async Task<CalculateShippingFeesResponse> CalculateShippingFeesAsync(CalculateShippingFeesRequest request)
        {
            var vipTierId = request.VipTierId;
            if (!vipTierId.HasValue && request.CustomerId.HasValue)
            {
                var profile = await _db.CustomerProfiles.FirstOrDefaultAsync(p => p.UserId == request.CustomerId.Value);
                if (profile != null)
                {
                    vipTierId = profile.VipTierId;
                }
            }

            VipTier? vipTier = null;
            if (vipTierId.HasValue)
            {
                vipTier = await _db.VipTiers.FirstOrDefaultAsync(t => t.Id == vipTierId.Value);
            }

            var rule = await FindApplicableFeeRuleAsync(vipTierId, request.PlatformId);

            if (rule == null)
            {
                return new CalculateShippingFeesResponse
                {
                    ShippingIntlFeeVnd = 0,
                    StorageFeeVnd = 0,
                    ChargeableWeightKg = request.ActualWeightKg,
                    TotalShippingFeeVnd = 0,
                    StorageDaysOverFree = 0
                };
            }

            // Cân nặng thể tích = VolumeCm3 / IntlShipVolDivisor
            decimal volumetricKg = 0;
            if (request.VolumeCm3.HasValue && request.VolumeCm3 > 0 && rule.IntlShipVolDivisor > 0)
                volumetricKg = Math.Round(request.VolumeCm3.Value / rule.IntlShipVolDivisor, 3);

            // Cân nặng tính cước = max(actual, volumetric, minCharge)
            var chargeableKg = Math.Max(request.ActualWeightKg, volumetricKg);
            chargeableKg = Math.Max(chargeableKg, rule.MinChargeKg);

            // Phí ship quốc tế = chargeableKg × IntlShipPerKgVnd
            var shippingFee = Math.Round(chargeableKg * rule.IntlShipPerKgVnd, 0);

            // Phí lưu kho = daysOverFree × actualKg × StorageDailyPerKgVnd
            // request.StorageDaysOverFree bây giờ đóng vai trò là tổng số ngày lưu kho thực tế
            var freeStorageDays = vipTier?.FreeStorageDays ?? 7;
            var storageDaysOverFree = Math.Max(0, request.StorageDaysOverFree - freeStorageDays);

            var storageFee = 0m;
            if (storageDaysOverFree > 0)
                storageFee = Math.Round(storageDaysOverFree * request.ActualWeightKg * rule.StorageDailyPerKgVnd, 0);

            return new CalculateShippingFeesResponse
            {
                ShippingIntlFeeVnd = shippingFee,
                StorageFeeVnd = storageFee,
                ChargeableWeightKg = chargeableKg,
                TotalShippingFeeVnd = shippingFee + storageFee,
                StorageDaysOverFree = storageDaysOverFree
            };
        }

        // ── Private helpers ───────────────────────────────────────────────────────

        /// <summary>
        /// Tìm FeeRule phù hợp nhất:
        /// 1. Ưu tiên FeeRule theo VipTierId + PlatformId.
        /// 2. Fallback FeeRule theo VipTierId (PlatformId = null).
        /// 3. Fallback FeeRule mặc định (cả 2 null).
        /// </summary>
        private async Task<FeeRule?> FindApplicableFeeRuleAsync(Guid? vipTierId, Guid? platformId)
        {
            var today = DateOnly.FromDateTime(DateTime.UtcNow);

            var rules = await _db.FeeRules
                .Where(r => r.IsActive
                    && r.EffectiveFrom <= today
                    && (r.EffectiveTo == null || r.EffectiveTo >= today))
                .ToListAsync();

            // Ưu tiên: exact match → vip only → default
            return rules.FirstOrDefault(r => r.VipTierId == vipTierId && r.PlatformId == platformId)
                ?? rules.FirstOrDefault(r => r.VipTierId == vipTierId && r.PlatformId == null)
                ?? rules.FirstOrDefault(r => r.VipTierId == null && r.PlatformId == null);
        }

        private async Task<Wallet> GetOrCreateWalletAsync(Guid customerId)
        {
            var wallet = await _db.Wallets
                .FirstOrDefaultAsync(w => w.CustomerId == customerId && w.Currency == "VND");

            if (wallet == null)
            {
                // Đảm bảo CustomerProfile tồn tại trước khi tạo Wallet (FK constraint)
                var profileExists = await _db.CustomerProfiles.AnyAsync(p => p.UserId == customerId);
                if (!profileExists)
                {
                    var standardTier = await _db.VipTiers
                        .AsNoTracking()
                        .FirstOrDefaultAsync(t => t.Level == 0);

                    var profile = new CustomerProfile
                    {
                        UserId = customerId,
                        CustomerCode = "KH" + DateTime.UtcNow.ToString("yyyyMMddHHmmss") + new Random().Next(100, 999),
                        FullName = GetCurrentUserFullName() ?? "Khách hàng mới",
                        VipTierId = standardTier?.Id,
                        CreatedDate = DateTime.UtcNow
                    };
                    _db.CustomerProfiles.Add(profile);
                    await _db.SaveChangesAsync();
                }

                wallet = new Wallet
                {
                    CustomerId = customerId,
                    Currency = "VND",
                    AvailableBalance = 0,
                    FrozenBalance = 0,
                    CreatedDate = DateTime.UtcNow,
                };
                await _db.Wallets.AddAsync(wallet);
                await _db.SaveChangesAsync();
            }

            return wallet;
        }
    }
}
