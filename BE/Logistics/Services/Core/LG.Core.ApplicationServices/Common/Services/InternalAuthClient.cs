using System.Net.Http;
using System.Net.Http.Json;
using System.Threading;
using System.Threading.Tasks;
using LG.Core.ApplicationServices.Common.Interfaces;
using Microsoft.Extensions.Logging;

namespace LG.Core.ApplicationServices.Common.Services
{
    public class InternalAuthClient : IInternalAuthClient
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<InternalAuthClient> _logger;

        public InternalAuthClient(HttpClient httpClient, ILogger<InternalAuthClient> logger)
        {
            _httpClient = httpClient;
            _logger = logger;
        }

        public async Task SendCustomerNotificationAsync(SendNotificationRequest req, CancellationToken ct = default)
        {
            try
            {
                var response = await _httpClient.PostAsJsonAsync("/api/internal/notifications/send", req, ct);
                if (!response.IsSuccessStatusCode)
                {
                    var error = await response.Content.ReadAsStringAsync(ct);
                    _logger.LogWarning("Failed to send customer notification via Auth Service. StatusCode: {StatusCode}, Error: {Error}", response.StatusCode, error);
                }
            }
            catch (System.Exception ex)
            {
                _logger.LogError(ex, "Exception while sending customer notification to Auth Service");
            }
        }
    }
}
