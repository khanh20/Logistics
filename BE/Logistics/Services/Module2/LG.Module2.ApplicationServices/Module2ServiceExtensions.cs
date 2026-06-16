using LG.Module2.ApplicationServices.Interfaces;
using LG.Module2.ApplicationServices.Services;
using LG.Module2.Domain.Repositories;
using LG.Module2.Infrastructure.Data;
using LG.Module2.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace LG.Module2.ApplicationServices;

public static class Module2ServiceExtensions
{
    public static IServiceCollection AddModule2(this IServiceCollection services,
                                                 IConfiguration config,
                                                 string? migrationsAssembly = null)
    {
        // ── Database ──────────────────────────────────────────────────────────
        var raw = Environment.GetEnvironmentVariable("DATABASE_URL")
               ?? config.GetConnectionString("Default")
               ?? throw new InvalidOperationException(
                   "Missing Postgres connection string. Set ConnectionStrings:Default or DATABASE_URL.");

        var conn = NormalizePg(raw);

        services.AddDbContext<Module2DbContext>(opt =>
        {
            opt.UseNpgsql(conn, npg =>
            {
                var asm = migrationsAssembly ?? typeof(Module2DbContext).Assembly.GetName().Name;
                npg.MigrationsAssembly(asm);
                npg.MigrationsHistoryTable("__EFMigrationsHistory", "mod2");
                npg.EnableRetryOnFailure(maxRetryCount: 5, maxRetryDelay: TimeSpan.FromSeconds(10), errorCodesToAdd: null);
                npg.CommandTimeout(30);
                npg.UseQuerySplittingBehavior(QuerySplittingBehavior.SplitQuery);
            });

#if DEBUG
            opt.EnableSensitiveDataLogging();
            opt.EnableDetailedErrors();
            opt.LogTo(Console.WriteLine,
                new[] { DbLoggerCategory.Database.Command.Name, DbLoggerCategory.Update.Name },
                LogLevel.Information);
#endif
        }, ServiceLifetime.Scoped);

        // ── Repositories ──────────────────────────────────────────────────────
        services.AddScoped<IWarehouseRepository,        WarehouseRepository>();
        services.AddScoped<IWarehouseZoneRepository,    WarehouseZoneRepository>();
        services.AddScoped<IWarehouseStaffRepository,   WarehouseStaffRepository>();
        services.AddScoped<IPackageRepository,          PackageRepository>();
        services.AddScoped<IChinaWaybillRepository,     ChinaWaybillRepository>();
        services.AddScoped<ISackRepository,             SackRepository>();
        services.AddScoped<IContainerTripRepository,    ContainerTripRepository>();
        services.AddScoped<ICustomsClearanceRepository, CustomsClearanceRepository>();
        services.AddScoped<ITrackingEventRepository,    TrackingEventRepository>();
        services.AddScoped<IWarehouseReceiptRepository, WarehouseReceiptRepository>();
        services.AddScoped<IWarehouseDispatchRepository, WarehouseDispatchRepository>();
        services.AddScoped<IDeliveryRequestRepository,  DeliveryRequestRepository>();
        services.AddScoped<IDomesticCarrierRepository,  DomesticCarrierRepository>();
        services.AddScoped<IDomesticWaybillRepository,  DomesticWaybillRepository>();
        services.AddScoped<IMissingClaimRepository,     MissingClaimRepository>();
        services.AddScoped<IInsuranceClaimRepository,   InsuranceClaimRepository>();
        services.AddScoped<IStoragePenaltyRepository,   StoragePenaltyRepository>();
        services.AddScoped<IModule2UnitOfWork,          Module2UnitOfWork>();

        // ── Application Services ──────────────────────────────────────────────
        services.AddScoped<IBarcodeService,      BarcodeService>();
        services.AddScoped<INotificationService, NotificationServiceStub>();  // Phase 6: swap ra real impl
        services.AddScoped<IWarehouseService,    WarehouseService>();
        services.AddScoped<IPackageService,      PackageService>();
        services.AddScoped<ISackService,         SackService>();
        services.AddScoped<IContainerService,    ContainerService>();

        return services;
    }

    private static string NormalizePg(string raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return raw;
        raw = raw.Trim();

        static bool IsUrl(string s) =>
            s.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase) ||
            s.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase);

        if (IsUrl(raw))
        {
            var uri  = new Uri(raw);
            var port = (uri.IsDefaultPort || uri.Port <= 0) ? 5432 : uri.Port;
            var db   = Uri.UnescapeDataString(uri.AbsolutePath.TrimStart('/'));

            string? user = null, pass = null;
            if (!string.IsNullOrEmpty(uri.UserInfo))
            {
                var parts = uri.UserInfo.Split(':', 2);
                user = Uri.UnescapeDataString(parts[0]);
                if (parts.Length == 2) pass = Uri.UnescapeDataString(parts[1]);
            }

            var qs = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            foreach (var pair in uri.Query.TrimStart('?').Split('&', StringSplitOptions.RemoveEmptyEntries))
            {
                var kv = pair.Split('=', 2);
                qs[Uri.UnescapeDataString(kv[0])] = kv.Length == 2 ? Uri.UnescapeDataString(kv[1]) : "";
            }
            var sslMode  = qs.TryGetValue("sslmode", out var s) ? s : "Require";
            var trustCert = !sslMode.Equals("disable", StringComparison.OrdinalIgnoreCase);

            var sb = new System.Text.StringBuilder();
            sb.Append($"Host={uri.Host};Port={port};Database={db};");
            if (!string.IsNullOrEmpty(user)) sb.Append($"Username={user};");
            if (!string.IsNullOrEmpty(pass)) sb.Append($"Password={pass};");
            sb.Append($"SSL Mode={CapitalizeSslMode(sslMode)};");
            if (trustCert) sb.Append("Trust Server Certificate=true;");
            return sb.ToString();
        }

        var isLocal = raw.Contains("localhost", StringComparison.OrdinalIgnoreCase) || raw.Contains("127.0.0.1");
        if (!isLocal)
        {
            if (!raw.Contains("SSL Mode", StringComparison.OrdinalIgnoreCase) && !raw.Contains("SslMode", StringComparison.OrdinalIgnoreCase))
                raw += (raw.TrimEnd().EndsWith(';') ? "" : ";") + "SSL Mode=Require;";
            if (!raw.Contains("Trust Server Certificate", StringComparison.OrdinalIgnoreCase))
                raw += "Trust Server Certificate=true;";
        }
        return raw;
    }

    private static string CapitalizeSslMode(string mode) => mode.ToLowerInvariant() switch
    {
        "require"     => "Require",
        "prefer"      => "Prefer",
        "allow"       => "Allow",
        "disable"     => "Disable",
        "verify-ca"   => "VerifyCA",
        "verify-full" => "VerifyFull",
        _             => "Require"
    };
}
