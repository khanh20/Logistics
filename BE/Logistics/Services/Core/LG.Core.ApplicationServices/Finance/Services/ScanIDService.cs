using System;
using System.IO;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Threading.Tasks;
using LG.Core.ApplicationServices.Common;
using LG.Core.ApplicationServices.Finance.DTOs.Customer;
using LG.Core.ApplicationServices.Finance.Interfaces;
using LG.Core.Infrastructure;
using LG.Shared.Constants.ErrorCodes;
using LG.Core.Domain.Exceptions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

using AutoMapper;
using LG.ApplicationBase.Localization;

namespace LG.Core.ApplicationServices.Finance.Services
{
    public class ScanIDService : CoreServiceBase, IScanIDService
    {
        private readonly HttpClient _httpClient;
        private readonly string _apiKey;

        public ScanIDService(
            HttpClient httpClient, 
            IConfiguration config, 
            IHttpContextAccessor httpContext, 
            CoreDbContext dbContext,
            LocalizationBase localization,
            IMapper mapper,
            ILogger<ScanIDService> logger) : base(logger, httpContext, dbContext, localization, mapper)
        {
            _httpClient = httpClient;
            _apiKey = config["FptAI:ApiKey"] ?? "";
        }

        public async Task<ScanIDResult> ExtractCccdDataAsync(Stream imageStream)
        {
            if (string.IsNullOrWhiteSpace(_apiKey))
                throw new CoreException(CoreErrorCode.CoreFptAIConfigMissing, 500);

            try
            {
                using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.fpt.ai/vision/idr/vnm");
                request.Headers.Add("api-key", _apiKey);

                using var content = new MultipartFormDataContent();
                using var streamContent = new StreamContent(imageStream);
                streamContent.Headers.ContentType = MediaTypeHeaderValue.Parse("image/jpeg");
                content.Add(streamContent, "image", "cccd.jpg");

                request.Content = content;

                var response = await _httpClient.SendAsync(request);
                var responseString = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogError("FPT API HTTP Error: {Res}", responseString);
                    throw new CoreException(CoreErrorCode.CoreFptAIConnectionError, 500);
                }

                using var doc = JsonDocument.Parse(responseString);
                var root = doc.RootElement;

                var errorCode = root.GetProperty("errorCode").GetInt32();
                if (errorCode != 0)
                {
                    var errorMsg = root.GetProperty("errorMessage").GetString();
                    return new ScanIDResult { Success = false, ErrorMessage = errorMsg };
                }

                var dataArray = root.GetProperty("data");
                if (dataArray.GetArrayLength() == 0)
                    throw new CoreException(CoreErrorCode.CoreInvalidIdImage);

                var data = dataArray[0];

                var result = new ScanIDResult
                {
                    Success = true,
                    IdNumber = GetStringValue(data, "id"),
                    FullName = GetStringValue(data, "name"),
                    DateOfBirth = ParseDate(GetStringValue(data, "dob")),
                    Gender = GetStringValue(data, "sex") == "NAM" ? "Nam" : "Nữ",
                    Nationality = GetStringValue(data, "nationality"),
                    PlaceOfOrigin = GetStringValue(data, "home"),
                    PlaceOfResidence = GetStringValue(data, "address"),
                    ExpiryDate = ParseDate(GetStringValue(data, "doe")),
                    RawText = responseString // Lưu lại toàn bộ response JSON để debug nếu cần
                };

                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Exception khi gọi FPT.AI API");
                return new ScanIDResult { Success = false, ErrorMessage = ex.Message };
            }
        }

        private static string? GetStringValue(JsonElement element, string propName)
        {
            if (element.TryGetProperty(propName, out var prop) && prop.ValueKind == JsonValueKind.String)
            {
                var val = prop.GetString();
                return string.IsNullOrWhiteSpace(val) || val == "N/A" ? null : val;
            }
            return null;
        }

        private static DateTime? ParseDate(string? dateStr)
        {
            if (string.IsNullOrWhiteSpace(dateStr)) return null;
            if (DateTime.TryParseExact(dateStr, "dd/MM/yyyy", null, System.Globalization.DateTimeStyles.None, out var dt))
                return dt.ToUniversalTime();
            return null;
        }
    }
}
