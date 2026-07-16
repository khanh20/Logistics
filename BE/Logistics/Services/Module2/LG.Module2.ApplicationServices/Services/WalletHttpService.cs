using System.Net.Http.Json;
using LG.Module2.ApplicationServices.Interfaces;
using LG.Module2.Domain.Exceptions;
using Microsoft.Extensions.Logging;

namespace LG.Module2.ApplicationServices.Services;

/// Ví khách — gọi Core Finance (LG.Core.API, mặc định https://localhost:7215),
/// cùng pattern WalletService của Module1. Deduct/Refund KHÔNG idempotent phía Core
/// → không retry mù; caller tự lo compensation (xem DeliveryService/ClaimService).
public class WalletHttpService(HttpClient httpClient, ILogger<WalletHttpService> logger) : IWalletService
{
    public Task DeductAsync(Guid customerId, decimal amountVnd, string referenceType, Guid referenceId,
                            string note, CancellationToken ct = default) =>
        PostAsync("api/wallet-payment/deduct", "trừ ví", customerId, amountVnd, referenceType, referenceId, note, ct);

    public Task RefundAsync(Guid customerId, decimal amountVnd, string referenceType, Guid referenceId,
                            string note, CancellationToken ct = default) =>
        PostAsync("api/wallet-payment/refund", "hoàn ví", customerId, amountVnd, referenceType, referenceId, note, ct);

    private async Task PostAsync(string path, string operation, Guid customerId, decimal amountVnd,
                                 string referenceType, Guid referenceId, string note, CancellationToken ct)
    {
        var req = new
        {
            CustomerId    = customerId,
            AmountVnd     = amountVnd,
            ReferenceType = referenceType,
            ReferenceId   = referenceId,
            Note          = note,
        };

        HttpResponseMessage response;
        try
        {
            response = await httpClient.PostAsJsonAsync(path, req, ct);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            logger.LogError(ex, "[WALLET] Không gọi được Core Finance ({Operation}) cho khách {CustomerId}",
                operation, customerId);
            throw new WalletOperationFailedException($"Không kết nối được hệ thống ví để {operation}.");
        }

        var body = await response.Content.ReadFromJsonAsync<CoreApiResponse>(cancellationToken: ct);
        if (!response.IsSuccessStatusCode || body is not { Success: true })
        {
            logger.LogWarning("[WALLET] {Operation} thất bại cho khách {CustomerId}: {Status} — {Message}",
                operation, customerId, response.StatusCode, body?.Message);
            throw new WalletOperationFailedException(
                body?.Message ?? $"Thao tác {operation} thất bại ({(int)response.StatusCode}).");
        }

        logger.LogInformation("[WALLET] {Operation} {Amount} VND — khách {CustomerId}, ref {RefType}/{RefId}",
            operation, amountVnd, customerId, referenceType, referenceId);
    }

    private sealed class CoreApiResponse
    {
        public bool Success { get; set; }
        public string? Message { get; set; }
    }
}
