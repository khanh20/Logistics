namespace LG.Shared.Constants;

public static class Permissions
{
    // ── User management ──────────────────────────────────────────
    public const string UserRead       = "user.read";
    public const string UserUpdate     = "user.update";
    public const string UserDelete     = "user.delete";
    public const string UserManage     = "user.manage";

    // ── Role management ──────────────────────────────────────────
    public const string RoleRead       = "role.read";
    public const string RoleManage     = "role.manage";
    public const string RoleAssign     = "role.assign";

    // ── Permission management ────────────────────────────────────
    public const string PermissionRead   = "permission.read";
    public const string PermissionManage = "permission.manage";
    public const string PermissionAssign = "permission.assign";

    // ── System config ────────────────────────────────────────────
    public const string ConfigRead   = "config.read";
    public const string ConfigManage = "config.manage";

    // ── Audit log ────────────────────────────────────────────────
    public const string AuditRead = "audit.read";

    // ── Notification ─────────────────────────────────────────────
    public const string NotificationRead   = "notification.read";
    public const string NotificationManage = "notification.manage";

    // ── Module 1 — Order & Catalog ───────────────────────────────
    public const string ProductRead     = "product.read";
    public const string ProductManage   = "product.manage";
    public const string CrawlSubmit     = "crawl.submit";
    public const string CartRead        = "cart.read";
    public const string CartManage      = "cart.manage";
    public const string OrderRead       = "order.read";
    public const string OrderCreate     = "order.create";
    public const string OrderManage     = "order.manage";   // staff
    public const string OrderDeposit    = "order.deposit";
    public const string ComplaintRead   = "complaint.read";
    public const string ComplaintManage = "complaint.manage";
    public const string PlatformRead    = "platform.read";
    public const string PlatformManage  = "platform.manage";
    public const string ExchangeRateRead   = "exchange_rate.read";
    public const string ExchangeRateManage = "exchange_rate.manage";

    // ── Module 2 — Logistics ─────────────────────────────────────
    public const string WarehouseRead    = "warehouse.read";
    public const string WarehouseManage  = "warehouse.manage";
    public const string PackageRead      = "package.read";
    public const string PackageManage    = "package.manage";
    public const string ShipmentRead     = "shipment.read";
    public const string ShipmentManage   = "shipment.manage";
    public const string DeliveryRead     = "delivery.read";
    public const string DeliveryManage   = "delivery.manage";

    // ── Module 3 — Finance ───────────────────────────────────────
    public const string WalletRead      = "wallet.read";
    public const string WalletTopup     = "wallet.topup";
    public const string WalletWithdraw  = "wallet.withdraw";
    public const string WalletManage    = "wallet.manage";
    public const string InvoiceRead     = "invoice.read";
    public const string InvoiceManage   = "invoice.manage";
    public const string ReportRead      = "report.read";
    public const string ReportManage    = "report.manage";

    // ── All permissions grouped by role ──────────────────────────
    public static readonly IReadOnlySet<string> CustomerPermissions = new HashSet<string>
    {
        ProductRead,
        CartRead, CartManage,
        OrderRead, OrderCreate, OrderDeposit,
        ComplaintRead,
        WalletRead, WalletTopup, WalletWithdraw,
        InvoiceRead,
        NotificationRead,
        ExchangeRateRead,
    };

    public static readonly IReadOnlySet<string> NvMuaHangPermissions = new HashSet<string>
    {
        ProductRead, ProductManage,
        CrawlSubmit,
        OrderRead, OrderManage,
        ComplaintRead, ComplaintManage,
        PlatformRead,
        ExchangeRateRead,
        UserRead,
        NotificationRead, NotificationManage,
        AuditRead,
    };

    public static readonly IReadOnlySet<string> NvKhoPermissions = new HashSet<string>
    {
        OrderRead,
        WarehouseRead, WarehouseManage,
        PackageRead, PackageManage,
        ShipmentRead, ShipmentManage,
        DeliveryRead, DeliveryManage,
        NotificationRead,
        AuditRead,
    };

    public static readonly IReadOnlySet<string> KeToanPermissions = new HashSet<string>
    {
        WalletRead, WalletManage,
        InvoiceRead, InvoiceManage,
        ReportRead, ReportManage,
        OrderRead,
        NotificationRead,
        AuditRead,
    };

    public static readonly IReadOnlySet<string> NvCskhPermissions = new HashSet<string>
    {
        UserRead,
        OrderRead, OrderManage,
        ComplaintRead, ComplaintManage,
        NotificationRead, NotificationManage,
        AuditRead,
    };

    public static readonly IReadOnlySet<string> AdminPermissions = new HashSet<string>
    {
        UserRead, UserUpdate, UserDelete, UserManage,
        RoleRead, RoleManage, RoleAssign,
        PermissionRead, PermissionManage, PermissionAssign,
        ConfigRead, ConfigManage,
        AuditRead,
        NotificationRead, NotificationManage,
        ProductRead, ProductManage,
        CrawlSubmit,
        CartRead, CartManage,
        OrderRead, OrderCreate, OrderDeposit, OrderManage,
        ComplaintRead, ComplaintManage,
        PlatformRead, PlatformManage,
        ExchangeRateRead, ExchangeRateManage,
        WarehouseRead, WarehouseManage,
        PackageRead, PackageManage,
        ShipmentRead, ShipmentManage,
        DeliveryRead, DeliveryManage,
        WalletRead, WalletTopup, WalletWithdraw, WalletManage,
        InvoiceRead, InvoiceManage,
        ReportRead, ReportManage,
    };
}
