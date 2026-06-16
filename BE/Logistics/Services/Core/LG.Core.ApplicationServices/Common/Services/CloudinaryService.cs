using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using LG.Core.ApplicationServices.Common.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System;
using System.Threading.Tasks;

namespace LG.Core.ApplicationServices.Common.Services
{
    public class CloudinaryService : ICloudinaryService
    {
        private readonly Cloudinary _cloudinary;
        private readonly ILogger<CloudinaryService> _logger;

        public CloudinaryService(IConfiguration config, ILogger<CloudinaryService> logger)
        {
            _logger = logger;
            var cloudName = config["Cloudinary:CloudName"];
            var apiKey = config["Cloudinary:ApiKey"];
            var apiSecret = config["Cloudinary:ApiSecret"];

            if (string.IsNullOrEmpty(cloudName) || string.IsNullOrEmpty(apiKey) || string.IsNullOrEmpty(apiSecret))
            {
                _logger.LogError("Cloudinary configuration is missing. Please check appsettings.json.");
                throw new Exception("Cloudinary configuration is missing.");
            }

            var account = new Account(cloudName, apiKey, apiSecret);
            _cloudinary = new Cloudinary(account);
        }

        public async Task<string> UploadImageAsync(IFormFile file, string folder)
        {
            if (file == null || file.Length == 0) return string.Empty;

            try
            {
                using var stream = file.OpenReadStream();
                var uploadParams = new ImageUploadParams()
                {
                    File = new FileDescription(file.FileName, stream),
                    Folder = folder,
                    DisplayName = $"{Guid.NewGuid()}_{file.FileName}"
                };

                var uploadResult = await _cloudinary.UploadAsync(uploadParams);

                if (uploadResult.Error != null)
                {
                    _logger.LogError("Cloudinary Upload Error: {Message}", uploadResult.Error.Message);
                    return string.Empty;
                }

                _logger.LogInformation("Uploaded image to Cloudinary: {Url}", uploadResult.SecureUrl.ToString());
                return uploadResult.SecureUrl.ToString();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Exception during Cloudinary upload");
                return string.Empty;
            }
        }
    }
}
