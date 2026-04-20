using LG.Authentication.Domain.Entities;
using LG.Authentication.Infrastructure.Data;
using LG.Authentication.Infrastructure.Security;
using LG.Shared.Constants;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace LG.Authentication.Infrastructure.Data;

public static class DataSeeder
{
    public static async Task SeedAsync(AppDbContext db, IPasswordHasher hasher,
                                        ILogger logger, CancellationToken ct = default)
    {
        await db.Database.MigrateAsync(ct);
        await SeedPermissionsAsync(db, ct);
        await SeedRolePermissionsAsync(db, ct);
        await SeedAdminUserAsync(db, hasher, logger, ct);
    }

    // ── Permissions ───────────────────────────────────────────────────────────
    private static async Task SeedPermissionsAsync(AppDbContext db, CancellationToken ct)
    {
        var all = AllPermissions();
        var existingCodesList = await db.Permissions.Select(p => p.Code).ToListAsync(ct);
        var existingCodes = existingCodesList.ToHashSet();
        var toAdd = all.Where(p => !existingCodes.Contains(p.Code)).ToList();

        if (toAdd.Count > 0)
        {
            await db.Permissions.AddRangeAsync(toAdd, ct);
            await db.SaveChangesAsync(ct);
        }
    }

    private static List<Permission> AllPermissions()
    {
        var map = new Dictionary<string, (string name, string module)>
        {
            [Permissions.UserRead]       = ("Xem người dùng",           "shared"),
            [Permissions.UserUpdate]     = ("Cập nhật người dùng",      "shared"),
            [Permissions.UserDelete]     = ("Xóa người dùng",           "shared"),
            [Permissions.UserManage]     = ("Quản lý người dùng",       "shared"),
            [Permissions.RoleRead]       = ("Xem vai trò",              "shared"),
            [Permissions.RoleManage]     = ("Quản lý vai trò",          "shared"),
            [Permissions.RoleAssign]     = ("Gán vai trò",              "shared"),
            [Permissions.PermissionRead]   = ("Xem quyền",             "shared"),
            [Permissions.PermissionManage] = ("Quản lý quyền",         "shared"),
            [Permissions.PermissionAssign] = ("Gán quyền",             "shared"),
            [Permissions.ConfigRead]     = ("Xem cấu hình",            "shared"),
            [Permissions.ConfigManage]   = ("Quản lý cấu hình",        "shared"),
            [Permissions.AuditRead]      = ("Xem audit log",            "shared"),
            [Permissions.NotificationRead]   = ("Xem thông báo",       "shared"),
            [Permissions.NotificationManage] = ("Quản lý thông báo",   "shared"),
            // Module 1
            [Permissions.ProductRead]   = ("Xem sản phẩm",             "mod1"),
            [Permissions.ProductManage] = ("Quản lý sản phẩm",         "mod1"),
            [Permissions.CrawlSubmit]   = ("Crawl sản phẩm",           "mod1"),
            [Permissions.CartRead]      = ("Xem giỏ hàng",             "mod1"),
            [Permissions.CartManage]    = ("Quản lý giỏ hàng",         "mod1"),
            [Permissions.OrderRead]     = ("Xem đơn hàng",             "mod1"),
            [Permissions.OrderCreate]   = ("Tạo đơn hàng",             "mod1"),
            [Permissions.OrderManage]   = ("Quản lý đơn hàng",         "mod1"),
            [Permissions.OrderDeposit]  = ("Đặt cọc đơn hàng",        "mod1"),
            [Permissions.ComplaintRead]   = ("Xem khiếu nại",          "mod1"),
            [Permissions.ComplaintManage] = ("Quản lý khiếu nại",      "mod1"),
            [Permissions.PlatformRead]   = ("Xem sàn TMĐT",            "mod1"),
            [Permissions.PlatformManage] = ("Quản lý sàn TMĐT",        "mod1"),
            [Permissions.ExchangeRateRead]   = ("Xem tỉ giá",          "mod1"),
            [Permissions.ExchangeRateManage] = ("Quản lý tỉ giá",      "mod1"),
            // Module 2
            [Permissions.WarehouseRead]   = ("Xem kho hàng",           "mod2"),
            [Permissions.WarehouseManage] = ("Quản lý kho hàng",       "mod2"),
            [Permissions.PackageRead]   = ("Xem kiện hàng",            "mod2"),
            [Permissions.PackageManage] = ("Quản lý kiện hàng",        "mod2"),
            [Permissions.ShipmentRead]   = ("Xem lô hàng",             "mod2"),
            [Permissions.ShipmentManage] = ("Quản lý lô hàng",         "mod2"),
            [Permissions.DeliveryRead]   = ("Xem giao hàng",           "mod2"),
            [Permissions.DeliveryManage] = ("Quản lý giao hàng",       "mod2"),
            // Module 3
            [Permissions.WalletRead]    = ("Xem ví",                   "mod3"),
            [Permissions.WalletTopup]   = ("Nạp tiền ví",              "mod3"),
            [Permissions.WalletWithdraw] = ("Rút tiền ví",             "mod3"),
            [Permissions.WalletManage]  = ("Quản lý ví",               "mod3"),
            [Permissions.InvoiceRead]   = ("Xem hóa đơn",              "mod3"),
            [Permissions.InvoiceManage] = ("Quản lý hóa đơn",          "mod3"),
            [Permissions.ReportRead]    = ("Xem báo cáo",              "mod3"),
            [Permissions.ReportManage]  = ("Quản lý báo cáo",          "mod3"),
        };

        return map.Select(kv => Permission.Create(kv.Value.name, kv.Key, kv.Value.module)).ToList();
    }

    // ── Role-Permission mapping ───────────────────────────────────────────────
    private static async Task SeedRolePermissionsAsync(AppDbContext db, CancellationToken ct)
    {
        var roleMap = await db.Roles.ToDictionaryAsync(r => r.Name, ct);
        var permMap = await db.Permissions.ToDictionaryAsync(p => p.Code, ct);

        var mapping = new Dictionary<string, IReadOnlySet<string>>
        {
            [Roles.Admin]      = Permissions.AdminPermissions,
            [Roles.NvMuaHang]  = Permissions.NvMuaHangPermissions,
            [Roles.NvKho]      = Permissions.NvKhoPermissions,
            [Roles.KeToan]     = Permissions.KeToanPermissions,
            [Roles.NvCskh]     = Permissions.NvCskhPermissions,
            [Roles.KhachHang]  = Permissions.CustomerPermissions,
        };

        var existingList = await db.RolePermissions
            .Select(rp => new { rp.RoleId, rp.PermissionId })
            .ToListAsync(ct);
        var existing = existingList
            .Select(rp => $"{rp.RoleId}:{rp.PermissionId}")
            .ToHashSet();

        var toAdd = new List<RolePermission>();

        foreach (var (roleName, perms) in mapping)
        {
            if (!roleMap.TryGetValue(roleName, out var role)) continue;
            foreach (var code in perms)
            {
                if (!permMap.TryGetValue(code, out var perm)) continue;
                if (!existing.Contains($"{role.Id}:{perm.Id}"))
                    toAdd.Add(RolePermission.Create(role.Id, perm.Id));
            }
        }

        if (toAdd.Count > 0)
        {
            await db.RolePermissions.AddRangeAsync(toAdd, ct);
            await db.SaveChangesAsync(ct);
        }
    }

    // ── Admin user ────────────────────────────────────────────────────────────
    private static async Task SeedAdminUserAsync(AppDbContext db, IPasswordHasher hasher,
                                                   ILogger logger, CancellationToken ct)
    {
        const string adminEmail = "admin@muaho.vn";
        if (await db.Users.AnyAsync(u => u.Email == adminEmail, ct))
        {
            logger.LogInformation("Admin user already exists, skipping seed.");
            return;
        }

        var adminRole = await db.Roles.FirstOrDefaultAsync(r => r.Name == Roles.Admin, ct)
                        ?? throw new InvalidOperationException("Admin role not found. Run migration first.");

        var admin = User.Create(adminEmail, hasher.Hash("Admin@123!"), "System Administrator");

        await db.Users.AddAsync(admin, ct);
        await db.SaveChangesAsync(ct);

        await db.UserRoles.AddAsync(UserRole.Create(admin.Id, adminRole.Id, null), ct);
        await db.SaveChangesAsync(ct);

        logger.LogInformation("Admin user seeded: {Email} / Admin@123!", adminEmail);
    }
}
