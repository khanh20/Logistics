using LG.Module1.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LG.Module1.Infrastructure.Data.Configurations;

// ── Phase 1 lookup configs ────────────────────────────────────────────────────
public class ProductCategoryConfig : IEntityTypeConfiguration<ProductCategory>
{
    public void Configure(EntityTypeBuilder<ProductCategory> b)
    {
        b.ToTable("product_categories");
        b.HasKey(x => x.Id);
        b.Property(x => x.NameVn).HasMaxLength(255).IsRequired();
        b.Property(x => x.NameCn).HasMaxLength(255);
        b.Property(x => x.Slug).HasMaxLength(255).IsRequired();
        b.HasIndex(x => x.Slug).IsUnique();
        b.Property(x => x.IconUrl).HasMaxLength(500);
        b.HasOne(x => x.Parent).WithMany(x => x.Children)
         .HasForeignKey(x => x.ParentId).IsRequired(false).OnDelete(DeleteBehavior.Restrict);

        // Seed cơ bản
        var now = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        b.HasData(
            new { Id = Guid.Parse("10000000-0000-0000-0000-000000000001"), NameVn = "Thời trang", NameCn = "服装", Slug = "thoi-trang", SortOrder = 1, IsActive = true, CreatedAt = now },
            new { Id = Guid.Parse("10000000-0000-0000-0000-000000000002"), NameVn = "Điện tử",   NameCn = "电子",  Slug = "dien-tu",   SortOrder = 2, IsActive = true, CreatedAt = now },
            new { Id = Guid.Parse("10000000-0000-0000-0000-000000000003"), NameVn = "Gia dụng",  NameCn = "家居",  Slug = "gia-dung",  SortOrder = 3, IsActive = true, CreatedAt = now },
            new { Id = Guid.Parse("10000000-0000-0000-0000-000000000004"), NameVn = "Phụ kiện",  NameCn = "配件",  Slug = "phu-kien",  SortOrder = 4, IsActive = true, CreatedAt = now }
        );
    }
}

public class ForbiddenCategoryConfig : IEntityTypeConfiguration<ForbiddenCategory>
{
    public void Configure(EntityTypeBuilder<ForbiddenCategory> b)
    {
        b.ToTable("forbidden_categories");
        b.HasKey(x => x.Id);
        b.Property(x => x.Name).HasMaxLength(255).IsRequired();
        b.Property(x => x.Severity).HasConversion<string>().HasMaxLength(10);

        // Seed danh sách hàng cấm thực tế
        var now = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        b.HasData(
            new { Id = Guid.Parse("20000000-0000-0000-0000-000000000001"), Name = "Pin Lithium rời", KeywordsCn = "锂电池,锂电,li-ion电池,磷酸铁锂", KeywordsVn = "pin lithium,pin lipo,pin li-ion,pin 18650", Reason = "Hàng cấm vận chuyển hàng không do nguy cơ cháy nổ", Severity = ForbiddenSeverity.Block, IsActive = true, CreatedAt = now },
            new { Id = Guid.Parse("20000000-0000-0000-0000-000000000002"), Name = "Hàng nhái thương hiệu", KeywordsCn = "仿牌,高仿,复刻,1:1", KeywordsVn = "hàng nhái,hàng fake,replica,1:1", Reason = "Vi phạm quyền sở hữu trí tuệ", Severity = ForbiddenSeverity.Block, IsActive = true, CreatedAt = now },
            new { Id = Guid.Parse("20000000-0000-0000-0000-000000000003"), Name = "Chất lỏng dễ cháy", KeywordsCn = "易燃液体,打火机油,酒精", KeywordsVn = "chất lỏng dễ cháy,dầu bật lửa,cồn công nghiệp", Reason = "Nguy hiểm cháy nổ khi vận chuyển hàng không", Severity = ForbiddenSeverity.Block, IsActive = true, CreatedAt = now },
            new { Id = Guid.Parse("20000000-0000-0000-0000-000000000004"), Name = "Vũ khí & phụ kiện", KeywordsCn = "枪,刀,匕首,弹弓", KeywordsVn = "súng,dao,vũ khí,kích điện", Reason = "Hàng cấm theo quy định pháp luật Việt Nam", Severity = ForbiddenSeverity.Block, IsActive = true, CreatedAt = now },
            new { Id = Guid.Parse("20000000-0000-0000-0000-000000000005"), Name = "Thực phẩm tươi sống", KeywordsCn = "生鲜,海鲜,肉类", KeywordsVn = "thực phẩm tươi,hải sản,thịt tươi", Reason = "Không đảm bảo an toàn thực phẩm khi vận chuyển quốc tế", Severity = ForbiddenSeverity.Block, IsActive = true, CreatedAt = now }
        );
    }
}

public class CancelReasonConfig : IEntityTypeConfiguration<CancelReason>
{
    public void Configure(EntityTypeBuilder<CancelReason> b)
    {
        b.ToTable("cancel_reasons");
        b.HasKey(x => x.Id);
        b.Property(x => x.Code).HasMaxLength(50).IsRequired();
        b.HasIndex(x => x.Code).IsUnique();
        b.Property(x => x.Description).IsRequired();
        b.Property(x => x.InitiatedBy).HasConversion<string>().HasMaxLength(20);

        var now = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        b.HasData(
            new { Id = Guid.Parse("30000000-0000-0000-0000-000000000001"), Code = "CUST_CHANGE_MIND",    Description = "Khách đổi ý / không muốn mua nữa", InitiatedBy = CancelInitiator.Customer, PenaltyApplies = false, IsActive = true, CreatedAt = now },
            new { Id = Guid.Parse("30000000-0000-0000-0000-000000000002"), Code = "CUST_FOUND_CHEAPER",  Description = "Khách tìm được nơi rẻ hơn",          InitiatedBy = CancelInitiator.Customer, PenaltyApplies = false, IsActive = true, CreatedAt = now },
            new { Id = Guid.Parse("30000000-0000-0000-0000-000000000003"), Code = "STAFF_OUT_OF_STOCK",  Description = "Hết hàng trên sàn",                   InitiatedBy = CancelInitiator.Staff,    PenaltyApplies = false, IsActive = true, CreatedAt = now },
            new { Id = Guid.Parse("30000000-0000-0000-0000-000000000004"), Code = "STAFF_PRICE_CHANGED", Description = "Giá thay đổi đáng kể (>10%)",          InitiatedBy = CancelInitiator.Staff,    PenaltyApplies = false, IsActive = true, CreatedAt = now },
            new { Id = Guid.Parse("30000000-0000-0000-0000-000000000005"), Code = "CUST_AFTER_PURCHASE", Description = "Khách hủy sau khi NV đã đặt hàng",     InitiatedBy = CancelInitiator.Customer, PenaltyApplies = true,  IsActive = true, CreatedAt = now },
            new { Id = Guid.Parse("30000000-0000-0000-0000-000000000006"), Code = "SYS_DEPOSIT_TIMEOUT", Description = "Hết thời gian đặt cọc (30 phút)",       InitiatedBy = CancelInitiator.System,   PenaltyApplies = false, IsActive = true, CreatedAt = now }
        );
    }
}

public class DepositConfigConfig : IEntityTypeConfiguration<DepositConfig>
{
    public void Configure(EntityTypeBuilder<DepositConfig> b)
    {
        b.ToTable("deposit_configs");
        b.HasKey(x => x.Id);
        b.Property(x => x.Name).HasMaxLength(100).IsRequired();
        b.Property(x => x.DepositPct).HasPrecision(5, 4);
        b.Property(x => x.AppliesTo).HasConversion<string>().HasMaxLength(20);

        var now = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        b.HasData(new
        {
            Id = Guid.Parse("40000000-0000-0000-0000-000000000001"),
            Name = "Mặc định 65%", VipTierId = (Guid?)null,
            DepositPct = 0.65m, AppliesTo = DepositAppliesTo.All, IsActive = true, CreatedAt = now
        });
    }
}

public class ExchangeRateHistoryConfig : IEntityTypeConfiguration<ExchangeRateHistory>
{
    public void Configure(EntityTypeBuilder<ExchangeRateHistory> b)
    {
        b.ToTable("exchange_rate_histories");
        b.HasKey(x => x.Id);
        b.Property(x => x.RateVndPerCny).HasPrecision(10, 2).IsRequired();
        b.Property(x => x.Source).HasMaxLength(100).IsRequired();
        b.HasIndex(x => x.IsCurrent);

        var now = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        b.HasData(new
        {
            Id = Guid.Parse("50000000-0000-0000-0000-000000000001"),
            RateVndPerCny = 3480m, Source = "Manual", EffectiveFrom = now,
            EffectiveTo = (DateTime?)null, IsCurrent = true, SetBy = (Guid?)null
        });
    }
}

// ── Phase 2 configs ───────────────────────────────────────────────────────────
public class PlatformConfig : IEntityTypeConfiguration<Platform>
{
    public void Configure(EntityTypeBuilder<Platform> b)
    {
        b.ToTable("platforms");
        b.HasKey(x => x.Id);
        b.Property(x => x.Name).HasMaxLength(50).IsRequired();
        b.HasIndex(x => x.Name).IsUnique();
        b.Property(x => x.BaseUrl).HasMaxLength(255).IsRequired();
        b.Property(x => x.ApiProvider).HasConversion<string>().HasMaxLength(20);
        b.Property(x => x.LogoUrl).HasMaxLength(500);
        // ApiKey / ApiSecret — không index, encrypt trước khi lưu
        b.Property(x => x.ApiKey).HasMaxLength(500);
        b.Property(x => x.ApiSecret).HasMaxLength(500);
        b.Property(x => x.CrawlConfigJson).HasColumnType("jsonb");

        b.HasMany(x => x.Shops).WithOne(x => x.Platform).HasForeignKey(x => x.PlatformId);
        b.HasMany(x => x.Accounts).WithOne(x => x.Platform).HasForeignKey(x => x.PlatformId);

        var now = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        b.HasData(
            new { Id = Guid.Parse("60000000-0000-0000-0000-000000000001"), Name = "Taobao",     BaseUrl = "https://www.taobao.com",      ApiProvider = ApiProvider.Apify,     IsActive = true, CreatedAt = now },
            new { Id = Guid.Parse("60000000-0000-0000-0000-000000000002"), Name = "1688",       BaseUrl = "https://www.1688.com",         ApiProvider = ApiProvider.Apify,     IsActive = true, CreatedAt = now },
            new { Id = Guid.Parse("60000000-0000-0000-0000-000000000003"), Name = "AliExpress", BaseUrl = "https://www.aliexpress.com",   ApiProvider = ApiProvider.PublicApi, IsActive = true, CreatedAt = now },
            new { Id = Guid.Parse("60000000-0000-0000-0000-000000000004"), Name = "eBay",       BaseUrl = "https://www.ebay.com",         ApiProvider = ApiProvider.PublicApi, IsActive = true, CreatedAt = now }
        );
    }
}

public class PlatformShopConfig : IEntityTypeConfiguration<PlatformShop>
{
    public void Configure(EntityTypeBuilder<PlatformShop> b)
    {
        b.ToTable("platform_shops");
        b.HasKey(x => x.Id);
        b.Property(x => x.ShopIdOnPlatform).HasMaxLength(100).IsRequired();
        b.Property(x => x.ShopName).HasMaxLength(255).IsRequired();
        b.Property(x => x.ShopUrl).HasMaxLength(500);
        b.Property(x => x.InternalRating).HasPrecision(3, 2);
        b.Property(x => x.AvgShipDays).HasPrecision(5, 2);
        b.Property(x => x.DisputeRate).HasPrecision(5, 4);
        b.HasIndex(x => new { x.PlatformId, x.ShopIdOnPlatform }).IsUnique();
    }
}

public class PlatformAccountConfig : IEntityTypeConfiguration<PlatformAccount>
{
    public void Configure(EntityTypeBuilder<PlatformAccount> b)
    {
        b.ToTable("platform_accounts");
        b.HasKey(x => x.Id);
        b.Property(x => x.Username).HasMaxLength(100).IsRequired();
        b.HasIndex(x => new { x.PlatformId, x.Username }).IsUnique();
        b.Property(x => x.AlipayBalance).HasPrecision(14, 2);
        b.Property(x => x.DailySpendLimit).HasPrecision(14, 2);
        b.Property(x => x.DailySpentToday).HasPrecision(14, 2);
        b.Property(x => x.PasswordEncrypted).HasMaxLength(500);
    }
}

public class ProductMasterConfig : IEntityTypeConfiguration<ProductMaster>
{
    public void Configure(EntityTypeBuilder<ProductMaster> b)
    {
        b.ToTable("product_masters");
        b.HasKey(x => x.Id);
        b.Property(x => x.PlatformProductId).HasMaxLength(200).IsRequired();
        b.Property(x => x.OriginalTitle).IsRequired();
        b.Property(x => x.Slug).HasMaxLength(300).IsRequired();
        b.HasIndex(x => x.Slug).IsUnique();
        b.HasIndex(x => new { x.ShopId, x.PlatformProductId }).IsUnique();

        b.HasOne(x => x.Shop).WithMany(x => x.Products)
         .HasForeignKey(x => x.ShopId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne(x => x.Category).WithMany(x => x.Products)
         .HasForeignKey(x => x.CategoryId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne(x => x.ForbiddenCategory).WithMany()
         .HasForeignKey(x => x.ForbiddenCategoryId).IsRequired(false).OnDelete(DeleteBehavior.SetNull);

        b.HasMany(x => x.Variants).WithOne(x => x.Product)
         .HasForeignKey(x => x.ProductId).OnDelete(DeleteBehavior.Cascade);
        b.HasMany(x => x.Images).WithOne(x => x.Product)
         .HasForeignKey(x => x.ProductId).OnDelete(DeleteBehavior.Cascade);
        b.HasMany(x => x.Attributes).WithOne(x => x.Product)
         .HasForeignKey(x => x.ProductId).OnDelete(DeleteBehavior.Cascade);
    }
}

public class ProductVariantConfig : IEntityTypeConfiguration<ProductVariant>
{
    public void Configure(EntityTypeBuilder<ProductVariant> b)
    {
        b.ToTable("product_variants");
        b.HasKey(x => x.Id);
        b.Property(x => x.VariantName).HasMaxLength(500).IsRequired();
        b.Property(x => x.TranslatedName).HasMaxLength(500);
        b.Property(x => x.PriceCnyCurrent).HasPrecision(12, 2).IsRequired();
        b.Property(x => x.PriceCnyMin).HasPrecision(12, 2);
        b.Property(x => x.SkuIdOnPlatform).HasMaxLength(200);
        b.Property(x => x.ImageUrl).HasMaxLength(500);

        b.HasMany(x => x.PriceTiers).WithOne(x => x.Variant)
         .HasForeignKey(x => x.VariantId).OnDelete(DeleteBehavior.Cascade);
    }
}

public class ProductPriceTierConfig : IEntityTypeConfiguration<ProductPriceTier>
{
    public void Configure(EntityTypeBuilder<ProductPriceTier> b)
    {
        b.ToTable("product_price_tiers");
        b.HasKey(x => x.Id);
        b.Property(x => x.PriceCny).HasPrecision(12, 2).IsRequired();
        b.HasIndex(x => new { x.VariantId, x.MinQuantity }).IsUnique();
    }
}

public class ProductImageConfig : IEntityTypeConfiguration<ProductImage>
{
    public void Configure(EntityTypeBuilder<ProductImage> b)
    {
        b.ToTable("product_images");
        b.HasKey(x => x.Id);
        b.Property(x => x.SourceUrl).IsRequired();
        b.Property(x => x.LocalCdnUrl).HasMaxLength(500);
        b.Property(x => x.SourceUrlHash).HasMaxLength(64);
        b.HasIndex(x => x.SourceUrlHash);
    }
}

public class ProductAttributeConfig : IEntityTypeConfiguration<ProductAttribute>
{
    public void Configure(EntityTypeBuilder<ProductAttribute> b)
    {
        b.ToTable("product_attributes");
        b.HasKey(x => x.Id);
        b.Property(x => x.KeyCn).HasMaxLength(200);
        b.Property(x => x.KeyVn).HasMaxLength(200);
    }
}
