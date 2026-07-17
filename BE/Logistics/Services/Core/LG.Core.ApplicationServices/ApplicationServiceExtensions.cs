using LG.Core.ApplicationServices.Finance.Interfaces;
using LG.Core.ApplicationServices.Finance.Services;
using LG.Core.ApplicationServices.Common;
using LG.Core.ApplicationServices.Common.Interfaces;
using LG.Core.ApplicationServices.Common.Services;
using LG.Core.ApplicationServices.Common.Localization;
using LG.ApplicationBase.Localization;
using LG.ApplicationBase.MapError;
using LG.Shared.Common.Localization;
using Microsoft.Extensions.DependencyInjection;

namespace LG.Core.ApplicationServices;

public static class ApplicationServiceExtensions
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        // ── AutoMapper ────────────────────
        services.AddAutoMapper(cfg => 
        {
            cfg.AddProfile<MappingProfile>();
        });

        // ── OCR Service (FPT.AI) ──────────
        services.AddHttpClient<IScanIDService, ScanIDService>();

        // ── Cloud Storage (Cloudinary) ─────
        services.AddScoped<ICloudinaryService, CloudinaryService>();

        // ── Localization & Error Mapping ──
        services.AddSingleton<LocalizationBase, CoreLocalization>();
        services.AddSingleton<ILocalization, CoreLocalization>();
        services.AddSingleton<IMapErrorCode, CoreMapErrorCode>();

        // ── KYC Service ──────────────────────────────────────────────────────────
        services.AddScoped<ICustomerKycService, CustomerKycService>();

        // ── Bank Account Service ────────────────────────────────────────────────
        services.AddScoped<IBankAccountService, BankAccountService>();

        // ── ZaloPay Service ──────────────────────────────────────────────────────
        services.AddHttpClient<IZaloPayService, ZaloPayService>();

        // ── Transaction Service ──────────────────────────────────────────────────
        services.AddScoped<ITransactionService, TransactionService>();

        // ── TransactionType Service ──────────────────────────────────────────────
        services.AddScoped<ITransactionTypeService, TransactionTypeService>();

        // ── New Finance Services ────────────────────────────────────────────────
        services.AddScoped<IRefundService, RefundService>();
        services.AddScoped<IVipTierService, VipTierService>();
        services.AddScoped<IFeeRuleService, FeeRuleService>();
        services.AddScoped<IFinanceManagementService, FinanceManagementService>();

        // ── Additional Finance Services ──────────────────────────────────────────
        services.AddScoped<ICustomerProfileService, CustomerProfileService>();
        services.AddScoped<ICustomerAddressService, CustomerAddressService>();
        services.AddScoped<IWalletTransactionService, WalletTransactionService>();
        services.AddScoped<IPaymentLockService, PaymentLockService>();
        services.AddScoped<IFraudDetectionService, FraudDetectionService>();
        services.AddScoped<IAdminWalletService, AdminWalletService>();

        // HttpClient cho PlatformReconcileService giao tiếp với Module 1
        services.AddHttpClient<IPlatformReconcileService, PlatformReconcileService>((sp, client) =>
        {
            var cfg = sp.GetRequiredService<Microsoft.Extensions.Configuration.IConfiguration>();
            var baseUrl = cfg["ApiUris:Module1"]
                       ?? Environment.GetEnvironmentVariable("APIURIS__MODULE1")
                       ?? "https://localhost:7198"; // Default Module 1 HTTPS port in template
            
            client.BaseAddress = new Uri(baseUrl);
        });

        services.AddHttpClient<IDailyRevenueService, DailyRevenueService>((sp, client) =>
        {
            var cfg = sp.GetRequiredService<Microsoft.Extensions.Configuration.IConfiguration>();
            var baseUrl = cfg["ApiUris:Module1"]
                       ?? Environment.GetEnvironmentVariable("APIURIS__MODULE1")
                       ?? "https://localhost:7198"; // Default Module 1 HTTPS port in template
            
            client.BaseAddress = new Uri(baseUrl);
        });

        services.AddScoped<IBankWebhookLogService, BankWebhookLogService>();
        services.AddScoped<IEmailService, EmailService>();
        services.AddScoped<IEmailNotificationService, EmailNotificationService>();
        // ── Wallet Payment Service ──────────────────────────────────────────────
        services.AddScoped<IWalletPaymentService, WalletPaymentService>();

        return services;
    }
}
