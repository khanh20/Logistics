using System.Net.Http.Json;
using LG.Module2.ApplicationServices.DTOs.Delivery;
using LG.Module2.ApplicationServices.Interfaces;
using LG.Module2.Domain.Exceptions;
using Microsoft.Extensions.Logging;

namespace LG.Module2.ApplicationServices.Services;

/// Sổ địa chỉ khách — gọi Core Finance `GET /api/CustomerAddress/me` với JWT của khách
/// forward nguyên vẹn (Core tự lọc theo user trong token → không thể tra sổ người khác).
public class CustomerAddressHttpService(
    HttpClient httpClient,
    IUserTokenAccessor tokenAccessor,
    ILogger<CustomerAddressHttpService> logger
) : ICustomerAddressService
{
    public async Task<CustomerAddressInfo?> GetMyAddressAsync(Guid addressId, CancellationToken ct = default)
    {
        var token = tokenAccessor.BearerToken;
        if (string.IsNullOrWhiteSpace(token))
        {
            logger.LogWarning("[ADDRESS] Không có bearer token để forward sang Core — request không qua HTTP?");
            throw new AddressLookupFailedException();
        }

        using var req = new HttpRequestMessage(HttpMethod.Get, "api/CustomerAddress/me");
        req.Headers.TryAddWithoutValidation("Authorization", $"Bearer {token}");

        HttpResponseMessage response;
        try
        {
            response = await httpClient.SendAsync(req, ct);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            logger.LogError(ex, "[ADDRESS] Không gọi được Core Finance để tra sổ địa chỉ");
            throw new AddressLookupFailedException();
        }

        if (!response.IsSuccessStatusCode)
        {
            logger.LogWarning("[ADDRESS] Core trả {Status} khi tra sổ địa chỉ", response.StatusCode);
            throw new AddressLookupFailedException();
        }

        // Core trả mảng CustomerAddressDto thuần (không có wrapper)
        var addresses = await response.Content.ReadFromJsonAsync<List<CoreAddressDto>>(cancellationToken: ct);
        var found = addresses?.FirstOrDefault(a => a.Id == addressId && a.IsActive);

        return found is null
            ? null
            : new CustomerAddressInfo(found.Id, found.RecipientName ?? "", found.Phone ?? "", found.AddressLine ?? "");
    }

    private sealed class CoreAddressDto
    {
        public Guid Id { get; set; }
        public string? RecipientName { get; set; }
        public string? Phone { get; set; }
        public string? AddressLine { get; set; }
        public bool IsActive { get; set; }
    }
}
