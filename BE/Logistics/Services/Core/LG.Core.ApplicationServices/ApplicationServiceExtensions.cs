using LG.Core.ApplicationServices.Finance.Interfaces;
using LG.Core.ApplicationServices.Finance.OCR;
using LG.Core.ApplicationServices.Finance.Services;
using Microsoft.Extensions.DependencyInjection;

namespace LG.Core.ApplicationServices;

public static class ApplicationServiceExtensions
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        // ── OCR Service (Singleton: TesseractEngine khởi tạo tốn cost) ──────────
        services.AddSingleton<ITesseractOcrService, TesseractOcrService>();

        // ── KYC Service ──────────────────────────────────────────────────────────
        services.AddScoped<ICustomerKycService, CustomerKycService>();

        return services;
    }
}
