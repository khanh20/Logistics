using LG.Module1.Domain.Repositories;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace LG.Module1.ApplicationServices.Services;

// Phân loại category chạy NỀN cho luồng resolve-url của khách. Product được lưu ngay
// với category tạm (cats[0]) để resolve-url trả nhanh và click/add-cart được liền
// (id thật đã ở DB); service này gọi model ML sau rồi cập nhật lại category cho đúng.
// Mỗi lần chạy tự mở DI scope riêng vì scope của request đã dispose khi resolve-url trả về.
public class BackgroundCategoryClassifier(
    IServiceScopeFactory scopeFactory,
    ILogger<BackgroundCategoryClassifier> logger)
{
    public void Enqueue(Guid productId, string? title, string? imageUrl, string? originalCategory)
    {
        _ = Task.Run(async () =>
        {
            try
            {
                using var scope = scopeFactory.CreateScope();
                var classifier  = scope.ServiceProvider.GetRequiredService<CategoryAutoClassifier>();
                var productRepo = scope.ServiceProvider.GetRequiredService<IProductRepository>();
                var uow         = scope.ServiceProvider.GetRequiredService<IModule1UnitOfWork>();

                var predicted = await classifier.PredictAsync(title, imageUrl, originalCategory);
                if (predicted is not { } categoryId) return;   // model không chắc -> giữ category tạm

                var product = await productRepo.GetByIdAsync(productId);
                if (product is null || product.CategoryId == categoryId) return;

                product.SetCategory(categoryId);
                await productRepo.UpdateAsync(product);
                await uow.SaveChangesAsync();
                logger.LogInformation("Background classify: product {Product} → category {Cat}",
                    productId, categoryId);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Background classify lỗi cho product {Product} — giữ category tạm.",
                    productId);
            }
        });
    }
}
