using System.Text;
using LG.Module1.ApplicationServices.Interfaces;
using LG.Module1.ApplicationServices.Services;
using LG.Module1.Domain.Repositories;
using LG.Module1.Infrastructure.Data;
using LG.Module1.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace LG.Module1.Infrastructure;

public static class Module1ServiceExtensions
{
    public static IServiceCollection AddModule1(this IServiceCollection services,
                                                 IConfiguration config,
                                                 string? migrationsAssembly = null)
    {
        // ── Database (PostgreSQL / Neon) ──────────────────────────────────────
        var raw = Environment.GetEnvironmentVariable("DATABASE_URL")
               ?? config.GetConnectionString("Default")
               ?? throw new InvalidOperationException(
                   "Missing Postgres connection string. " +
                   "Set ConnectionStrings:Default in appsettings.json or DATABASE_URL env var.");

        var conn = NormalizePg(raw);

        services.AddDbContext<Module1DbContext>(opt =>
        {
            opt.UseNpgsql(conn, npg =>
            {
                var asm = migrationsAssembly ?? typeof(Module1DbContext).Assembly.GetName().Name;
                npg.MigrationsAssembly(asm);
                npg.MigrationsHistoryTable("__EFMigrationsHistory", "mod1");
                npg.EnableRetryOnFailure(
                    maxRetryCount: 5,
                    maxRetryDelay: TimeSpan.FromSeconds(10),
                    errorCodesToAdd: null);
                npg.CommandTimeout(30);
            });

#if DEBUG
            opt.EnableSensitiveDataLogging();
            opt.EnableDetailedErrors();
#endif
        }, ServiceLifetime.Scoped);

        // ── Repositories ──────────────────────────────────────────────────────
        services.AddScoped<IProductCategoryRepository, ProductCategoryRepository>();
        services.AddScoped<IForbiddenCategoryRepository, ForbiddenCategoryRepository>();
        services.AddScoped<ICancelReasonRepository, CancelReasonRepository>();
        services.AddScoped<IDepositConfigRepository, DepositConfigRepository>();
        services.AddScoped<IExchangeRateHistoryRepository, ExchangeRateHistoryRepository>();
        services.AddScoped<IPlatformRepository, PlatformRepository>();
        services.AddScoped<IPlatformShopRepository, PlatformShopRepository>();
        services.AddScoped<IPlatformAccountRepository, PlatformAccountRepository>();
        services.AddScoped<IProductRepository, ProductRepository>();
        services.AddScoped<IProductVariantRepository, ProductVariantRepository>();
        services.AddScoped<IProductPriceTierRepository, ProductPriceTierRepository>();
        services.AddScoped<IProductImageRepository, ProductImageRepository>();
        services.AddScoped<IModule1UnitOfWork, Module1UnitOfWork>();

        // ── Application Services ──────────────────────────────────────────────
        services.AddScoped<IProductCategoryService, ProductCategoryService>();
        services.AddScoped<IForbiddenCategoryService, ForbiddenCategoryService>();
        services.AddScoped<IExchangeRateService, ExchangeRateService>();
        services.AddScoped<IDepositConfigService, DepositConfigService>();
        services.AddScoped<IProductService, ProductService>();

        return services;
    }

    // ── NormalizePg — giống Auth service ─────────────────────────────────────
    private static string NormalizePg(string raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return raw;
        raw = raw.Trim();

        static bool IsUrl(string s) =>
            s.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase) ||
            s.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase);

        if (IsUrl(raw))
        {
            var uri = new Uri(raw);
            var port = (uri.IsDefaultPort || uri.Port <= 0) ? 5432 : uri.Port;
            var db = Uri.UnescapeDataString(uri.AbsolutePath.TrimStart('/'));

            string? user = null, pass = null;
            if (!string.IsNullOrEmpty(uri.UserInfo))
            {
                var parts = uri.UserInfo.Split(':', 2);
                user = Uri.UnescapeDataString(parts[0]);
                if (parts.Length == 2) pass = Uri.UnescapeDataString(parts[1]);
            }

            var qs = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            foreach (var pair in uri.Query.TrimStart('?')
                         .Split('&', StringSplitOptions.RemoveEmptyEntries))
            {
                var kv = pair.Split('=', 2);
                qs[Uri.UnescapeDataString(kv[0])] =
                    kv.Length == 2 ? Uri.UnescapeDataString(kv[1]) : "";
            }

            var sslMode = qs.TryGetValue("sslmode", out var s) ? s : "Require";
            var trustCert = !sslMode.Equals("disable", StringComparison.OrdinalIgnoreCase);

            var sb = new StringBuilder();
            sb.Append($"Host={uri.Host};Port={port};Database={db};");
            if (!string.IsNullOrEmpty(user)) sb.Append($"Username={user};");
            if (!string.IsNullOrEmpty(pass)) sb.Append($"Password={pass};");
            sb.Append($"SSL Mode={CapitalizeSslMode(sslMode)};");
            if (trustCert) sb.Append("Trust Server Certificate=true;");
            return sb.ToString();
        }

        // KV format — thêm SSL nếu không phải localhost
        var isLocal = raw.Contains("localhost", StringComparison.OrdinalIgnoreCase)
                   || raw.Contains("127.0.0.1");
        if (!isLocal)
        {
            if (!raw.Contains("SSL Mode", StringComparison.OrdinalIgnoreCase) &&
                !raw.Contains("SslMode", StringComparison.OrdinalIgnoreCase))
                raw += (raw.TrimEnd().EndsWith(';') ? "" : ";") + "SSL Mode=Require;";
            if (!raw.Contains("Trust Server Certificate", StringComparison.OrdinalIgnoreCase))
                raw += "Trust Server Certificate=true;";
        }
        return raw;
    }

    private static string CapitalizeSslMode(string mode) => mode.ToLowerInvariant() switch
    {
        "require" => "Require",
        "prefer" => "Prefer",
        "allow" => "Allow",
        "disable" => "Disable",
        "verify-ca" => "VerifyCA",
        "verify-full" => "VerifyFull",
        _ => "Require"
    };
}