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

    protected override void OnModelCreating(ModelBuilder mb)
    {
        mb.HasDefaultSchema("mod1");
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
