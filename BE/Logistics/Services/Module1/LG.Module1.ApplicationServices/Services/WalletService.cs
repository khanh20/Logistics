using LG.Module1.ApplicationServices.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace LG.Module1.ApplicationServices.Services
{
    public class WalletService : IWalletService
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<WalletService> _logger;

        public WalletService(HttpClient httpClient, ILogger<WalletService> logger)
        {
            _httpClient = httpClient;
            _logger = logger;
        }

        public async Task<decimal> GetBalanceAsync(Guid customerId, CancellationToken ct = default)
        {
            try
            {
                var response = await _httpClient.GetFromJsonAsync<ApiResponseWrapper<WalletBalanceResponseDto>>(
                    $"api/wallet-payment/balance/{customerId}", ct);

                if (response != null && response.Success && response.Data != null)
                {
                    return response.Data.AvailableBalance;
                }

                _logger.LogWarning("Failed to get wallet balance for customer {CustomerId}. Response success: {Success}", 
                    customerId, response?.Success);
                return 0;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error calling Core Finance balance API for customer {CustomerId}", customerId);
                return 0;
            }
        }

        public async Task DeductAsync(Guid customerId, decimal amountVnd, string referenceType, Guid referenceId, string description, CancellationToken ct = default)
        {
            var req = new
            {
                CustomerId = customerId,
                AmountVnd = amountVnd,
                ReferenceType = referenceType,
                ReferenceId = referenceId,
                Note = description
            };

            var response = await _httpClient.PostAsJsonAsync("api/wallet-payment/deduct", req, ct);
            if (!response.IsSuccessStatusCode)
            {
                var errorMsg = await response.Content.ReadAsStringAsync(ct);
                _logger.LogError("Failed to deduct wallet for customer {CustomerId}. Status: {Status}, Content: {Content}",
                    customerId, response.StatusCode, errorMsg);
                throw new Exception($"Không thể trừ tiền ví của khách hàng: {response.ReasonPhrase}");
            }

            var result = await response.Content.ReadFromJsonAsync<ApiResponseWrapper<object>>(cancellationToken: ct);
            if (result == null || !result.Success)
            {
                throw new Exception(result?.Message ?? "Trừ tiền ví thất bại.");
            }
        }

        public async Task RefundAsync(Guid customerId, decimal amountVnd, string referenceType, Guid referenceId, string description, CancellationToken ct = default)
        {
            var req = new
            {
                CustomerId = customerId,
                AmountVnd = amountVnd,
                ReferenceType = referenceType,
                ReferenceId = referenceId,
                Note = description
            };

            var response = await _httpClient.PostAsJsonAsync("api/wallet-payment/refund", req, ct);
            if (!response.IsSuccessStatusCode)
            {
                var errorMsg = await response.Content.ReadAsStringAsync(ct);
                _logger.LogError("Failed to refund wallet for customer {CustomerId}. Status: {Status}, Content: {Content}",
                    customerId, response.StatusCode, errorMsg);
                throw new Exception($"Không thể hoàn tiền ví cho khách hàng: {response.ReasonPhrase}");
            }

            var result = await response.Content.ReadFromJsonAsync<ApiResponseWrapper<object>>(cancellationToken: ct);
            if (result == null || !result.Success)
            {
                throw new Exception(result?.Message ?? "Hoàn tiền ví thất bại.");
            }
        }
        public async Task<WalletCalculateFeesResponse> CalculateCheckoutFeesAsync(Guid customerId, decimal subtotalVnd, string insuranceOption, CancellationToken ct = default)
        {
            var req = new
            {
                CustomerId = customerId,
                SubtotalVnd = subtotalVnd,
                InsuranceOption = insuranceOption
            };

            var response = await _httpClient.PostAsJsonAsync("api/wallet-payment/calculate-checkout-fees", req, ct);
            if (!response.IsSuccessStatusCode)
            {
                var errorMsg = await response.Content.ReadAsStringAsync(ct);
                _logger.LogError("Failed to calculate checkout fees for customer {CustomerId}. Status: {Status}, Content: {Content}",
                    customerId, response.StatusCode, errorMsg);
                throw new Exception("Không thể tính toán chi phí checkout từ hệ thống.");
            }

            var result = await response.Content.ReadFromJsonAsync<ApiResponseWrapper<WalletCalculateFeesResponse>>(cancellationToken: ct);
            if (result == null || !result.Success || result.Data == null)
            {
                throw new Exception(result?.Message ?? "Tính toán chi phí checkout thất bại.");
            }

            return result.Data;
        }

        public async Task<WalletCalculateShippingFeesResponse> CalculateShippingFeesAsync(Guid customerId, decimal actualWeightKg, decimal? volumeCm3, int storageDaysOverFree, CancellationToken ct = default)
        {
            var req = new
            {
                CustomerId = customerId,
                ActualWeightKg = actualWeightKg,
                VolumeCm3 = volumeCm3,
                StorageDaysOverFree = storageDaysOverFree
            };

            var response = await _httpClient.PostAsJsonAsync("api/wallet-payment/calculate-shipping-fees", req, ct);
            if (!response.IsSuccessStatusCode)
            {
                var errorMsg = await response.Content.ReadAsStringAsync(ct);
                _logger.LogError("Failed to calculate shipping fees. Status: {Status}, Content: {Content}",
                    response.StatusCode, errorMsg);
                throw new Exception("Không thể tính toán chi phí vận chuyển từ hệ thống.");
            }

            var result = await response.Content.ReadFromJsonAsync<ApiResponseWrapper<WalletCalculateShippingFeesResponse>>(cancellationToken: ct);
            if (result == null || !result.Success || result.Data == null)
            {
                throw new Exception(result?.Message ?? "Tính toán chi phí vận chuyển thất bại.");
            }

            return result.Data;
        }
        // ── Helper DTOs for JSON Deserialization ───────────────────────────────

        private class ApiResponseWrapper<T>
        {
            public bool Success { get; set; }
            public T? Data { get; set; }
            public string? Message { get; set; }
        }

        private class WalletBalanceResponseDto
        {
            public Guid WalletId { get; set; }
            public decimal AvailableBalance { get; set; }
            public decimal FrozenBalance { get; set; }
            public bool IsFrozen { get; set; }
        }
    }
}
