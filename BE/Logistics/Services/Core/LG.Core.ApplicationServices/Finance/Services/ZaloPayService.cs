using LG.Core.ApplicationServices.Common;
using LG.Core.ApplicationServices.Common.Interfaces;
using LG.Core.ApplicationServices.Finance.DTOs.EmailNotification;
using LG.Core.ApplicationServices.Finance.DTOs.ZaloPay;
using LG.Core.ApplicationServices.Finance.Interfaces;
using LG.Core.Domain.Finance;
using LG.Core.Infrastructure;
using LG.Untils.EnumFinance;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

using AutoMapper;
using LG.ApplicationBase.Localization;

namespace LG.Core.ApplicationServices.Finance.Services
{
    public class ZaloPayService : CoreServiceBase, IZaloPayService
    {
        private readonly HttpClient _httpClient;
        private readonly ZaloPayConfig _config;
        private readonly CoreDbContext _db;
        private readonly IEmailNotificationService _emailNotificationService;

        public ZaloPayService(
            HttpClient httpClient, 
            IHttpContextAccessor httpContext, 
            IConfiguration configuration, 
            CoreDbContext db, 
            IEmailNotificationService emailNotificationService,
            LocalizationBase localization,
            IMapper mapper,
            ILogger<ZaloPayService> logger) : base(logger, httpContext, db, localization, mapper)
        {
            _httpClient = httpClient;
            _db = db;
            _emailNotificationService = emailNotificationService;
            _config = configuration.GetSection("ZaloPay").Get<ZaloPayConfig>()
                      ?? throw new InvalidOperationException("Chưa cấu hình ZaloPay trong appsettings.json");
        }

        public async Task<ZaloPayCreateOrderResponseDto> CreatePaymentAsync(TopupRequest topup)
        {
            var embedData = new ZaloPayEmbedData
            {
                RedirectUrl = _config.RedirectUrl,
                PaymentType = "TOPUP",
                ReferenceId = topup.Id.ToString()
            };

            return await CreateOrderInternalAsync(
                appUser: topup.WalletId.ToString(),
                amount: (long)topup.AmountVnd,
                description: $"Nap tien vi Logistics - {topup.TransferContent}",
                referenceId: topup.Id,
                embedData: embedData
            );
        }

        public async Task<ZaloPayCreateOrderResponseDto> CreateOrderPaymentAsync(Guid orderId, decimal amount, Guid customerId, string description)
        {
            var embedData = new ZaloPayEmbedData
            {
                RedirectUrl = _config.RedirectUrl,
                PaymentType = "ORDER",
                ReferenceId = orderId.ToString()
            };

            return await CreateOrderInternalAsync(
                appUser: customerId.ToString(),
                amount: (long)amount,
                description: description,
                referenceId: orderId,
                embedData: embedData
            );
        }

        private async Task<ZaloPayCreateOrderResponseDto> CreateOrderInternalAsync(string appUser, long amount, string description, Guid referenceId, ZaloPayEmbedData embedData)
        {
            var appTransId = $"{DateTime.Now:yyMMdd}_{referenceId.ToString().Replace("-", "").Substring(0, 10)}_{DateTime.Now:HHmmss}";
            var appTime = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            var embedDataJson = JsonSerializer.Serialize(embedData);
            var item = "[]";

            var rawMac = $"{_config.AppId}|{appTransId}|{appUser}|{amount}|{appTime}|{embedDataJson}|{item}";
            var mac = HmacSha256(_config.Key1, rawMac);

            var requestBody = new Dictionary<string, object>
            {
                { "app_id",       _config.AppId },
                { "app_trans_id", appTransId },
                { "app_user",     appUser },
                { "amount",       amount },
                { "app_time",     appTime },
                { "embed_data",   embedDataJson },
                { "item",         item },
                { "description",  description },
                { "bank_code",    "" },
                { "callback_url", _config.CallbackUrl },
                { "mac",          mac }
            };

            var content = new FormUrlEncodedContent(ConvertToStringDict(requestBody));
            var response = await _httpClient.PostAsync(_config.Endpoint, content);
            var responseString = await response.Content.ReadAsStringAsync();

            _logger.LogInformation("ZaloPay create order response: {Response}", responseString);

            try
            {
                var result = JsonSerializer.Deserialize<ZaloPayCreateOrderResponseDto>(responseString,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                return result ?? new ZaloPayCreateOrderResponseDto { ReturnCode = -1, ReturnMessage = "Không thể parse phản hồi từ ZaloPay" };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi parse JSON từ ZaloPay: {Response}", responseString);
                return new ZaloPayCreateOrderResponseDto { ReturnCode = -1, ReturnMessage = "Lỗi kết nối ZaloPay: " + responseString };
            }
        }

        public async Task<bool> ProcessCallbackAsync(ZaloPayCallbackDto callback)
        {
            _logger.LogInformation("Bắt đầu xử lý ZaloPay callback...");
            // 1. Xác thực chữ ký bằng Key2
            _logger.LogInformation("ZaloPay callback data to hash: {Data}", callback.Data);
            var expectedMac = HmacSha256(_config.Key2, callback.Data);
            _logger.LogInformation("MAC check - Expected: {Exp}, Received: {Rec}", expectedMac, callback.Mac);
            
            if (expectedMac != callback.Mac)
            {
                _logger.LogWarning("ZaloPay callback: Chữ ký không hợp lệ! Expected: {Exp}, Received: {Rec}", expectedMac, callback.Mac);
                return false;
            }

            // 2. Parse dữ liệu trong trường "data"
            _logger.LogInformation("Xác thực chữ ký thành công. Đang parse data...");
            ZaloPayCallbackData? callbackData;
            try
            {
                callbackData = JsonSerializer.Deserialize<ZaloPayCallbackData>(callback.Data,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "ZaloPay callback: Lỗi parse data JSON");
                return false;
            }

            if (callbackData == null) return false;

            // 3. Parse embed_data để biết loại thanh toán
            ZaloPayEmbedData? embedData;
            try
            {
                embedData = JsonSerializer.Deserialize<ZaloPayEmbedData>(callbackData.EmbedData,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "ZaloPay callback: Lỗi parse embed_data JSON");
                return false;
            }

            if (embedData == null) return false;

            // 4. Định tuyến xử lý theo PaymentType
            if (embedData.PaymentType == "TOPUP")
            {
                return await ProcessTopupCallbackInternalAsync(callbackData, embedData);
            }
            else if (embedData.PaymentType == "ORDER")
            {
                return await ProcessOrderCallbackInternalAsync(callbackData, embedData);
            }

            _logger.LogWarning("ZaloPay callback: Loại thanh toán không xác định: {Type}", embedData.PaymentType);
            return true;
        }

        private async Task<bool> ProcessTopupCallbackInternalAsync(ZaloPayCallbackData callbackData, ZaloPayEmbedData embedData)
        {
            if (!Guid.TryParse(embedData.ReferenceId, out var topupId)) return false;

            var topup = await _db.TopupRequests.FindAsync(topupId);
            if (topup == null || topup.Status != TopupStatusEnum.Pending)
            {
                _logger.LogWarning("ZaloPay callback: Không tìm thấy TopupRequest Pending id={Id}", topupId);
                return true;
            }

            var strategy = _db.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                using var transaction = await _db.Database.BeginTransactionAsync();
                try
                {
                    var wallet = await _db.Wallets.FindAsync(topup.WalletId);
                    if (wallet == null) return false;

                    var balanceBefore = wallet.AvailableBalance;
                    wallet.AvailableBalance += topup.AmountVnd;
                    wallet.TotalDepositedEver += topup.AmountVnd;

                    // Tạo bản ghi giao dịch ví
                    var transactionType = await _db.TransactionTypes.FirstOrDefaultAsync(t => t.Code == "TOPUP" || t.Code == "DEPOSIT");
                    var typeId = transactionType?.Id ?? Guid.Empty;

                    var walletTx = new WalletTransaction
                    {
                        WalletId = wallet.Id,
                        TypeId = typeId,
                        Amount = topup.AmountVnd,
                        BalanceBefore = balanceBefore,
                        BalanceAfter = wallet.AvailableBalance,
                        ReferenceType = "Topup",
                        ReferenceId = topup.Id,
                        Note = $"Nạp tiền qua ZaloPay - ZpTransId: {callbackData.ZpTransId}",
                        CreatedDate = DateTime.UtcNow
                    };
                    await _db.WalletTransactions.AddAsync(walletTx);

                    topup.Status = TopupStatusEnum.Matched;
                    topup.MatchedAt = DateTime.UtcNow;
                    topup.MatchedBankRef = callbackData.ZpTransId.ToString();
                    topup.WalletTransactionId = walletTx.Id;

                    await _db.SaveChangesAsync();
                    await transaction.CommitAsync();

                    _logger.LogInformation("ZaloPay: Nạp tiền thành công. TopupId={TopupId}", topup.Id);

                    // Gửi email thông báo nạp tiền thành công
                    await SendTopupSuccessEmailAsync(wallet.CustomerId, topup.AmountVnd, wallet.AvailableBalance);

                    // Bắn thông báo Web
                    await CreateWebNotificationAsync(
                        userId: wallet.CustomerId,
                        title: "Nạp tiền thành công",
                        content: $"Bạn đã nạp thành công {topup.AmountVnd:N0} VNĐ vào ví. Số dư khả dụng hiện tại là {wallet.AvailableBalance:N0} VNĐ.",
                        type: "Payment",
                        referenceType: "TopupRequest",
                        referenceId: topup.Id
                    );

                    return true;
                }
                catch (Exception ex)
                {
                    await transaction.RollbackAsync();
                    _logger.LogError(ex, "ZaloPay callback (TOPUP): Lỗi cập nhật CSDL");
                    throw;
                }
            });
        }

        private async Task<bool> ProcessOrderCallbackInternalAsync(ZaloPayCallbackData callbackData, ZaloPayEmbedData embedData)
        {
            // Logic thanh toán ... (Cập nhật database, chuyển trạng thái đơn hàng...)

            _logger.LogInformation("ZaloPay: Thanh toán Đơn hàng thành công. OrderId={OrderId}, ZpTransId={ZpTransId}", 
                embedData.ReferenceId, callbackData.ZpTransId);

            // Gửi email thông báo thanh toán đơn hàng thành công
            if (Guid.TryParse(callbackData.AppUser, out var customerId))
            {
                await SendOrderPaymentSuccessEmailAsync(customerId, embedData.ReferenceId, callbackData.Amount);
                
                // Bắn thông báo Web
                await CreateWebNotificationAsync(
                    userId: customerId,
                    title: "Thanh toán thành công",
                    content: $"Đơn hàng {embedData.ReferenceId} của bạn đã được thanh toán thành công {callbackData.Amount:N0} VNĐ.",
                    type: "Order",
                    referenceType: "Order",
                    referenceId: Guid.TryParse(embedData.ReferenceId, out var oId) ? oId : null
                );
            }

            return true;
        }

        private static string HmacSha256(string key, string data)
        {
            var keyBytes = Encoding.UTF8.GetBytes(key);
            var dataBytes = Encoding.UTF8.GetBytes(data);
            using var hmac = new HMACSHA256(keyBytes);
            var hashBytes = hmac.ComputeHash(dataBytes);
            return BitConverter.ToString(hashBytes).Replace("-", "").ToLower();
        }

        private static Dictionary<string, string> ConvertToStringDict(Dictionary<string, object> dict)
        {
            var result = new Dictionary<string, string>();
            foreach (var kv in dict)
                result[kv.Key] = kv.Value?.ToString() ?? "";
            return result;
        }

        private async Task SendTopupSuccessEmailAsync(Guid customerId, decimal amount, decimal currentBalance)
        {
            try
            {
                var email = await GetUserEmailAsync(customerId);
                if (string.IsNullOrEmpty(email))
                {
                    _logger.LogWarning("Không thể gửi email nạp tiền: Không tìm thấy email cho CustomerId={CustomerId}", customerId);
                    return;
                }

                var dto = new SendEmailNotificationDto
                {
                    CustomerId = customerId,
                    ToEmail = email,
                    Subject = "Nạp tiền thành công - Logistics System",
                    TemplateType = EmailTemplateTypeEnum.TopupSuccess,
                    TemplateData = $"Bạn vừa nạp thành công {amount:N0} VNĐ vào ví. Số dư khả dụng hiện tại của bạn là {currentBalance:N0} VNĐ."
                };

                await _emailNotificationService.CreateAsync(dto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi gọi EmailNotificationService.CreateAsync cho Topup");
                // Không throw exception để không làm gián đoạn transaction chính
            }
        }

        private async Task SendOrderPaymentSuccessEmailAsync(Guid customerId, string orderId, decimal amount)
        {
            try
            {
                var email = await GetUserEmailAsync(customerId);
                if (string.IsNullOrEmpty(email))
                {
                    _logger.LogWarning("Không thể gửi email thanh toán đơn hàng: Không tìm thấy email cho CustomerId={CustomerId}", customerId);
                    return;
                }

                var dto = new SendEmailNotificationDto
                {
                    CustomerId = customerId,
                    ToEmail = email,
                    Subject = "Thanh toán thành công - Logistics System",
                    TemplateType = EmailTemplateTypeEnum.OrderConfirmed,
                    TemplateData = $"Đơn hàng {orderId} của bạn đã được thanh toán thành công số tiền {amount:N0} VNĐ qua ZaloPay. Cảm ơn bạn đã sử dụng dịch vụ!"
                };

                await _emailNotificationService.CreateAsync(dto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi gọi EmailNotificationService.CreateAsync cho Order Payment");
            }
        }
    }
}
