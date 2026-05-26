using System.Text;
using LG.Authentication.Domain.Repositories;
using LG.Authentication.Infrastructure.Data;
using LG.Authentication.Infrastructure.Repositories;
using LG.Authentication.Infrastructure.Security;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace LG.Authentication.Infrastructure;

public static class InfrastructureServiceExtensions
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services,
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

        services.AddDbContext<AppDbContext>(opt =>
        {
            opt.UseNpgsql(conn, npg =>
            {
                // Migrations assembly: mặc định là Infrastructure project
                var asm = migrationsAssembly ?? typeof(AppDbContext).Assembly.GetName().Name;
                npg.MigrationsAssembly(asm);
                npg.MigrationsHistoryTable("__EFMigrationsHistory", "auth");
                // Tự retry khi Neon cold-start hoặc mất kết nối tạm thời
                npg.EnableRetryOnFailure(
                    maxRetryCount: 5,
                    maxRetryDelay: TimeSpan.FromSeconds(10),
                    errorCodesToAdd: null);
                npg.CommandTimeout(30);
            });

#if DEBUG
            // Bật query logging khi debug — tắt ở Production để tránh lộ dữ liệu
            opt.EnableSensitiveDataLogging();
            opt.EnableDetailedErrors();
#endif
        }, ServiceLifetime.Scoped);

        // ── Repositories ──────────────────────────────────────────────────────
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IRoleRepository, RoleRepository>();
        services.AddScoped<IUserRoleRepository, UserRoleRepository>();
        services.AddScoped<IPermissionRepository, PermissionRepository>();
        services.AddScoped<IRolePermissionRepository, RolePermissionRepository>();
        services.AddScoped<IRefreshTokenRepository, RefreshTokenRepository>();
        services.AddScoped<ISystemConfigRepository, SystemConfigRepository>();
        services.AddScoped<INotificationRepository, NotificationRepository>();
        services.AddScoped<IAuditLogRepository, AuditLogRepository>();
        services.AddScoped<IUnitOfWork, UnitOfWork>();

        // ── Security ──────────────────────────────────────────────────────────
        services.AddScoped<IPasswordHasher, PasswordHasher>();
        services.AddScoped<ITokenService, TokenService>();

        return services;
    }

    // ── NormalizePg ───────────────────────────────────────────────────────────
    /// Chuẩn hóa connection string PostgreSQL / Neon:
    /// - Nếu là URL dạng postgres://user:pass@host/db?sslmode=require  → chuyển sang KV format
    /// - Nếu đã là KV format → đảm bảo SSL Mode và Trust Server Certificate được set
    /// Phục vụ cả local dev (không SSL) và Neon cloud (SSL bắt buộc).
    private static string NormalizePg(string raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return raw;
        raw = raw.Trim();

        static bool IsUrl(string s) =>
            s.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase) ||
            s.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase);

        if (IsUrl(raw))
        {
            // Phân tích postgres://user:pass@host:5432/dbname?sslmode=require
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

            // Lấy sslmode từ query string (Neon mặc định require)
            var qs = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            foreach (var pair in uri.Query.TrimStart('?')
                         .Split('&', StringSplitOptions.RemoveEmptyEntries))
            {
                var kv = pair.Split('=', 2);
                qs[Uri.UnescapeDataString(kv[0])] =
                    kv.Length == 2 ? Uri.UnescapeDataString(kv[1]) : "";
            }

            var sslMode = qs.TryGetValue("sslmode", out var s) ? s : "Require";
            // Npgsql: "Require" không verify cert — OK cho Neon (dùng "VerifyFull" nếu muốn strict)
            var trustCert = !sslMode.Equals("disable", StringComparison.OrdinalIgnoreCase);

            var sb = new StringBuilder();
            sb.Append($"Host={uri.Host};Port={port};Database={db};");
            if (!string.IsNullOrEmpty(user)) sb.Append($"Username={user};");
            if (!string.IsNullOrEmpty(pass)) sb.Append($"Password={pass};");
            sb.Append($"SSL Mode={CapitalizeSslMode(sslMode)};");
            if (trustCert) sb.Append("Trust Server Certificate=true;");
            return sb.ToString();
        }

        // Đã là KV format — chỉ thêm SSL nếu thiếu và không phải localhost
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

    /// Npgsql nhận "Require" không phải "require" hay "REQUIRE".
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