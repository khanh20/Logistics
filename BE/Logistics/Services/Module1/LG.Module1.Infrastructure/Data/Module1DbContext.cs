using LG.Module1.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace LG.Module1.Infrastructure.Data;

public class Module1DbContext(DbContextOptions<Module1DbContext> options) : DbContext(options)
{
    // ── Phase 1 — Lookup ──────────────────────────────────────────────────────
    public DbSet<ProductCategory>     ProductCategories     => Set<ProductCategory>();
    public DbSet<ForbiddenCategory>   ForbiddenCategories   => Set<ForbiddenCategory>();
    public DbSet<CancelReason>        CancelReasons         => Set<CancelReason>();
    public DbSet<DepositConfig>       DepositConfigs        => Set<DepositConfig>();
    public DbSet<ExchangeRateHistory> ExchangeRateHistories => Set<ExchangeRateHistory>();

    // ── Phase 2 — Platform + Product ─────────────────────────────────────────
    public DbSet<Platform>          Platforms        => Set<Platform>();
    public DbSet<PlatformShop>      PlatformShops    => Set<PlatformShop>();
    public DbSet<PlatformAccount>   PlatformAccounts => Set<PlatformAccount>();
    public DbSet<ProductMaster>     ProductMasters   => Set<ProductMaster>();
    public DbSet<ProductVariant>    ProductVariants  => Set<ProductVariant>();
    public DbSet<ProductPriceTier>  ProductPriceTiers => Set<ProductPriceTier>();
    public DbSet<ProductImage>      ProductImages    => Set<ProductImage>();
    public DbSet<ProductAttribute>  ProductAttributes => Set<ProductAttribute>();
    public DbSet<Cart>     Carts     => Set<Cart>();
    public DbSet<CartItem> CartItems => Set<CartItem>();
    public DbSet<CustomerOrder>      CustomerOrders      => Set<CustomerOrder>();
    public DbSet<OrderItem>          OrderItems          => Set<OrderItem>();
    public DbSet<PlatformOrder>      PlatformOrders      => Set<PlatformOrder>();
    public DbSet<OrderStatusHistory> OrderStatusHistories => Set<OrderStatusHistory>();
    public DbSet<OrderFeeDetail>     OrderFeeDetails     => Set<OrderFeeDetail>();
    public DbSet<StaffAssignment>    StaffAssignments    => Set<StaffAssignment>();

    public DbSet<ExtensionScrapeLog> ExtensionScrapeLogs => Set<ExtensionScrapeLog>();

    // ── Staff Operations expansion ───────────────────────────────────────────
    public DbSet<StaffWorkSetting>      StaffWorkSettings      => Set<StaffWorkSetting>();
    public DbSet<StaffPerformanceDaily> StaffPerformanceDailies => Set<StaffPerformanceDaily>();
    public DbSet<StaffNotification>     StaffNotifications     => Set<StaffNotification>();
    public DbSet<OrderComplaint>        OrderComplaints        => Set<OrderComplaint>();
    public DbSet<SupplierChatLog>       SupplierChatLogs       => Set<SupplierChatLog>();

    // ── Engagement / Recommendation (Plan C) ─────────────────────────────────
    public DbSet<UserActivityEvent> UserActivityEvents => Set<UserActivityEvent>();
    public DbSet<UserFavorite>      UserFavorites      => Set<UserFavorite>();
    public DbSet<ProductReview>     ProductReviews     => Set<ProductReview>();
    public DbSet<TrendingProduct>   TrendingProducts   => Set<TrendingProduct>();
    public DbSet<ProductEmbedding>  ProductEmbeddings  => Set<ProductEmbedding>();
    public DbSet<ProductCoView>     ProductCoViews     => Set<ProductCoView>();

    protected override void OnModelCreating(ModelBuilder mb)
    {
        mb.HasDefaultSchema("mod1");
        mb.HasPostgresExtension("vector"); // pgvector cho ProductEmbedding (Plan G)
        mb.ApplyConfigurationsFromAssembly(typeof(Module1DbContext).Assembly);

        // UTC auto-convert
        var utcConverter = new ValueConverter<DateTime, DateTime>(
            v => v.Kind == DateTimeKind.Utc ? v : v.ToUniversalTime(),
            v => DateTime.SpecifyKind(v, DateTimeKind.Utc));
        var utcNullConverter = new ValueConverter<DateTime?, DateTime?>(
            v => v == null ? null : v.Value.Kind == DateTimeKind.Utc ? v : v.Value.ToUniversalTime(),
            v => v == null ? null : DateTime.SpecifyKind(v.Value, DateTimeKind.Utc));

        foreach (var entity in mb.Model.GetEntityTypes())
        foreach (var prop in entity.GetProperties())
        {
            if (prop.ClrType == typeof(DateTime))  prop.SetValueConverter(utcConverter);
            if (prop.ClrType == typeof(DateTime?)) prop.SetValueConverter(utcNullConverter);
        }
    }
}
