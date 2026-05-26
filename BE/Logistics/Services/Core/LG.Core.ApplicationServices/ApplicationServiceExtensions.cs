using LG.Core.ApplicationServices.Finance.Interfaces;
using LG.Core.ApplicationServices.Finance.Services;
using LG.Core.ApplicationServices.Common;
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
        services.AddScoped<LG.Core.ApplicationServices.Common.Interfaces.ICloudinaryService, LG.Core.ApplicationServices.Common.Services.CloudinaryService>();

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
        services.AddScoped<IPlatformReconcileService, PlatformReconcileService>();
        services.AddScoped<IBankWebhookLogService, BankWebhookLogService>();
        services.AddScoped<LG.Core.ApplicationServices.Common.Interfaces.IEmailService, LG.Core.ApplicationServices.Common.Services.EmailService>();
        services.AddScoped<IEmailNotificationService, EmailNotificationService>();

        return services;
    }
}
