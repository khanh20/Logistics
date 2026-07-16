using LG.Module1.ApplicationServices.Configuration;
using LG.Module1.ApplicationServices.DTOs.Product;
using LG.Module1.ApplicationServices.DTOs.Recommendation;
using LG.Module1.ApplicationServices.Interfaces;
using LG.Module1.Domain.Adapters;
using LG.Module1.Domain.Entities;
using LG.Module1.Domain.Repositories;
using Pgvector;

namespace LG.Module1.ApplicationServices.Services;

// Engine gợi ý theo phân khúc khách: recall đa nguồn (vector/co-view/
// trending/category) → xếp hạng. Tầng xếp hạng ưu tiên RERANKER ML (LightGBM bên
// serving_pipeline, học từ hành vi); lỗi/thiếu model → fallback công thức linear.
public class RecommendationService(
    IProductRepository          productRepo,
    ITrendingProductRepository  trendingRepo,
    IUserActivityRepository     activityRepo,
    IUserFavoriteRepository     favoriteRepo,
    ICustomerOrderRepository    orderRepo,
    IProductEmbeddingRepository embeddingRepo,
    IProductCoViewRepository    coViewRepo,
    IRecoReranker               recoReranker,
    RecommendationOptions       opts
) : IRecommendationService
{

    public async Task<RecommendationResponse> GetAsync(
        Guid? customerId, string? sessionKey, int perSection, CancellationToken ct = default)
    {
        perSection = Math.Clamp(perSection <= 0 ? 12 : perSection, 4, 40);
        var sections = new List<RecSection>();
        var shown    = new HashSet<Guid>();

        if (customerId is null)
        {
            await AddTrending(sections, shown, perSection, ct);
            await AddFeatured(sections, shown, perSection, ct);
            return new RecommendationResponse("first_time", sections);
        }

        var cid          = customerId.Value;
        var completed    = await orderRepo.CountCompletedByCustomerAsync(cid, ct);
        var recentViewed = await activityRepo.GetRecentlyViewedProductIdsAsync(cid, perSection, ct);

        string segment =
            completed >= opts.LoyalMinOrders            ? "loyal"
            : (completed > 0 || recentViewed.Count > 0) ? "returning"
            : "first_time";

        switch (segment)
        {
            case "loyal":
            {
                var profile   = await BuildProfileAsync(cid, recentViewed, ct);
                var purchased = await orderRepo.GetPurchasedProductIdsAsync(cid, 30, ct);
                var favIds    = (await favoriteRepo.GetByCustomerAsync(cid, ct)).Select(f => f.ProductId).ToList();
                var seed      = purchased.Concat(favIds).Concat(recentViewed).Distinct().ToList();
                var pool      = perSection * opts.CandidatePoolMultiplier;

                var (forYou, forYouSims) = await RecallVectorAsync(seed, shown, pool, ct);
                if (forYou.Count == 0)
                {
                    var topCats = profile.CategoryWeights.OrderByDescending(kv => kv.Value)
                                         .Take(6).Select(kv => kv.Key).ToList();
                    forYou = await productRepo.GetTopByCategoriesAsync(topCats, shown.Concat(favIds), pool, ct);
                    forYouSims = null;
                }
                var coView = await RecallCoViewAsync(seed, shown, pool, ct);

                // ML rerank cả 2 section trong MỘT lượt gọi; null -> rank linear.
                var ml = await MlRerankAsync(cid,
                    new[] { ("for_you", forYou), ("also_viewed", coView) }, ct);
                AddRankedSection(sections, shown, "for_you", forYou, forYouSims, profile, perSection,
                    ml?.GetValueOrDefault("for_you"));
                AddRankedSection(sections, shown, "also_viewed", coView, null, profile, perSection,
                    ml?.GetValueOrDefault("also_viewed"));
                await AddSection(sections, shown, "recently_viewed", recentViewed, perSection, ct);
                await AddTrending(sections, shown, perSection, ct);
                break;
            }

            case "returning":
            {
                var profile = await BuildProfileAsync(cid, recentViewed, ct);
                await AddSection(sections, shown, "recently_viewed", recentViewed, perSection, ct);

                var pool = perSection * opts.CandidatePoolMultiplier;
                var (similar, similarSims) = await RecallVectorAsync(recentViewed, shown, pool, ct);
                if (similar.Count == 0)
                {
                    var cats = await activityRepo.GetRecentCategoryIdsAsync(cid, 5, ct);
                    similar = await productRepo.GetTopByCategoriesAsync(cats, shown, pool, ct);
                    similarSims = null;
                }
                var coView = await RecallCoViewAsync(recentViewed, shown, pool, ct);

                var ml = await MlRerankAsync(cid,
                    new[] { ("similar_to_viewed", similar), ("also_viewed", coView) }, ct);
                AddRankedSection(sections, shown, "similar_to_viewed", similar, similarSims, profile, perSection,
                    ml?.GetValueOrDefault("similar_to_viewed"));
                AddRankedSection(sections, shown, "also_viewed", coView, null, profile, perSection,
                    ml?.GetValueOrDefault("also_viewed"));
                await AddTrending(sections, shown, perSection, ct);
                break;
            }

            default: // first_time đã đăng nhập nhưng chưa có hành vi
                await AddTrending(sections, shown, perSection, ct);
                await AddFeatured(sections, shown, perSection, ct);
                break;
        }

        return new RecommendationResponse(segment, sections);
    }

    // ── User profile (#2): trọng số danh mục từ mua×3 / thích×2 / xem×1 + shop + giá ──
    private sealed class UserProfile
    {
        public Dictionary<Guid, double> CategoryWeights { get; } = new();
        public HashSet<Guid>            PreferredShopIds { get; } = new();
        public double?                  PreferredPriceCny { get; set; }
    }

    private async Task<UserProfile> BuildProfileAsync(Guid cid, List<Guid> recentViewed, CancellationToken ct)
    {
        var profile   = new UserProfile();
        var purchased = await orderRepo.GetPurchasedProductIdsAsync(cid, 50, ct);
        var favIds    = (await favoriteRepo.GetByCustomerAsync(cid, ct)).Select(f => f.ProductId).ToList();

        var signalIds = purchased.Concat(favIds).Concat(recentViewed).Distinct().ToList();
        var products  = await productRepo.GetByIdsAsync(signalIds, ct);
        var byId      = products.ToDictionary(p => p.Id);

        void AddCat(List<Guid> ids, double w)
        {
            foreach (var id in ids)
                if (byId.TryGetValue(id, out var p))
                    profile.CategoryWeights[p.CategoryId] = profile.CategoryWeights.GetValueOrDefault(p.CategoryId) + w;
        }
        AddCat(purchased, opts.SignalWeights.Purchase);
        AddCat(favIds, opts.SignalWeights.Favorite);
        AddCat(recentViewed, opts.SignalWeights.View);

        // Shop yêu thích = shop đã mua + shop của sản phẩm đã thích.
        foreach (var s in await orderRepo.GetPurchasedShopIdsAsync(cid, ct)) profile.PreferredShopIds.Add(s);
        foreach (var id in favIds) if (byId.TryGetValue(id, out var p)) profile.PreferredShopIds.Add(p.ShopId);

        var prices = signalIds.Where(byId.ContainsKey).Select(id => (double)MinPrice(byId[id])).Where(x => x > 0).ToList();
        if (prices.Count > 0) profile.PreferredPriceCny = prices.Average();

        return profile;
    }

    // ── Rank linear (fallback + baseline) ──
    private List<ProductMaster> Rank(List<ProductMaster> candidates, UserProfile profile,
        IReadOnlyDictionary<Guid, double>? sims, int take)
    {
        if (candidates.Count == 0) return candidates;

        double maxCatW = profile.CategoryWeights.Count > 0 ? profile.CategoryWeights.Values.Max() : 1;
        if (maxCatW <= 0) maxCatW = 1;
        double maxPop = candidates.Max(p => Math.Log(1 + p.ViewCount + p.TotalSoldLocal));
        if (maxPop <= 0) maxPop = 1;
        var now = DateTime.UtcNow;
        var w = opts.RankWeights;

        double Score(ProductMaster p)
        {
            double sim     = sims != null && sims.TryGetValue(p.Id, out var s) ? s : 0;
            double cat     = profile.CategoryWeights.GetValueOrDefault(p.CategoryId) / maxCatW;
            double pop     = Math.Log(1 + p.ViewCount + p.TotalSoldLocal) / maxPop;
            double recency = 1.0 / (1.0 + Math.Max(0, (now - p.CreatedAt).TotalDays) / opts.RecencyHalflifeDays);
            double price   = 1.0;
            if (profile.PreferredPriceCny is double pref && pref > 0)
            {
                double mp = (double)MinPrice(p);
                price = mp > 0 ? Math.Max(0, 1 - Math.Min(1, Math.Abs(mp - pref) / pref)) : 0.5;
            }
            double featured = p.IsFeatured ? 1 : 0;
            double shop     = profile.PreferredShopIds.Contains(p.ShopId) ? 1 : 0;

            return w.Sim * sim + w.Category * cat + w.Pop * pop + w.Recency * recency
                 + w.Price * price + w.Featured * featured + w.Shop * shop;
        }

        return candidates.OrderByDescending(Score).Take(take).ToList();
    }

    // Gọi ML reranker cho nhiều section một lượt; tắt cờ/rỗng -> null (dùng rank linear).
    private async Task<IReadOnlyDictionary<string, IReadOnlyList<Guid>>?> MlRerankAsync(
        Guid customerId, (string Key, List<ProductMaster> Products)[] secs, CancellationToken ct)
    {
        if (!opts.UseMlReranker) return null;
        var payload = secs.Where(s => s.Products.Count > 0)
            .Select(s => (s.Key, (IReadOnlyList<Guid>)s.Products.Select(p => p.Id).ToList()))
            .ToList();
        return payload.Count == 0 ? null : await recoReranker.RerankAsync(customerId, payload, ct);
    }

    // Xếp 1 section: theo thứ tự ML nếu có, ngược lại rank linear.
    private void AddRankedSection(List<RecSection> sections, HashSet<Guid> shown, string key,
        List<ProductMaster> products, IReadOnlyDictionary<Guid, double>? sims, UserProfile profile,
        int perSection, IReadOnlyList<Guid>? mlOrder)
    {
        var pick = products.Where(p => !shown.Contains(p.Id)).ToList();
        if (pick.Count == 0) return;

        var ranked = mlOrder is { Count: > 0 }
            ? Common.RankingHelpers.ReorderByIds(pick, mlOrder).Take(perSection).ToList()
            : Rank(pick, profile, sims, perSection);
        if (ranked.Count == 0) return;

        foreach (var p in ranked) shown.Add(p.Id);
        sections.Add(new RecSection(key, ranked.Select(ProductMapper.ToListItem).ToList()));
    }

    // ── Recall sources ──────────────────────────────────────────────────────────

    // Vector ANN: user-vector = trung bình embedding seed → top-K + similarity.
    private async Task<(List<ProductMaster> Products, Dictionary<Guid, double>? Sims)> RecallVectorAsync(
        List<Guid> seedIds, HashSet<Guid> shown, int pool, CancellationToken ct)
    {
        var seeds = seedIds.Where(id => id != Guid.Empty).Distinct().Take(20).ToList();
        if (seeds.Count == 0) return (new(), null);

        var vectors = await embeddingRepo.GetVectorsAsync(seeds, ct);
        if (vectors.Count == 0) return (new(), null);

        var userVec = AverageVectors(vectors);
        var scored  = await embeddingRepo.FindNearestWithScoreAsync(userVec, shown.Concat(seeds), pool, ct);
        if (scored.Count == 0) return (new(), null);

        var products = await productRepo.GetByIdsAsync(scored.Select(s => s.Id).ToList(), ct);
        var sims     = scored.ToDictionary(s => s.Id, s => Math.Max(0, 1.0 - s.Distance));
        return (products, sims);
    }

    // Co-view: "người xem X cũng xem Y" từ cache.
    private async Task<List<ProductMaster>> RecallCoViewAsync(
        List<Guid> seedIds, HashSet<Guid> shown, int pool, CancellationToken ct)
    {
        var ids = await coViewRepo.GetRelatedAsync(seedIds, shown, pool, ct);
        return ids.Count == 0 ? new() : await productRepo.GetByIdsAsync(ids, ct);
    }

    private static Vector AverageVectors(List<Vector> vectors)
    {
        var dim = vectors[0].ToArray().Length;
        var sum = new float[dim];
        foreach (var v in vectors)
        {
            var arr = v.ToArray();
            var n   = Math.Min(dim, arr.Length);
            for (int i = 0; i < n; i++) sum[i] += arr[i];
        }
        for (int i = 0; i < dim; i++) sum[i] /= vectors.Count;
        return new Vector(sum);
    }

    private static decimal MinPrice(ProductMaster p)
    {
        if (p.Variants.Count == 0) return 0;
        var avail = p.Variants.Where(v => v.IsAvailable).Select(v => v.PriceCnyCurrent).ToList();
        return avail.Count > 0 ? avail.Min() : p.Variants.Min(v => v.PriceCnyCurrent);
    }

    // ── Non-personalized sections (giữ thứ tự tự nhiên) ─────────────────────────

    private async Task AddSection(List<RecSection> sections, HashSet<Guid> shown,
        string key, List<Guid> ids, int perSection, CancellationToken ct)
    {
        var pick = ids.Where(id => !shown.Contains(id)).ToList();
        if (pick.Count == 0) return;

        var products = await productRepo.GetByIdsAsync(pick, ct);
        var byId     = products.ToDictionary(p => p.Id);
        var ordered  = pick.Where(byId.ContainsKey).Select(id => byId[id]).Take(perSection).ToList();
        if (ordered.Count == 0) return;

        foreach (var p in ordered) shown.Add(p.Id);
        sections.Add(new RecSection(key, ordered.Select(ProductMapper.ToListItem).ToList()));
    }

    private async Task AddTrending(List<RecSection> sections, HashSet<Guid> shown, int perSection, CancellationToken ct)
    {
        var ids  = await trendingRepo.GetTopProductIdsAsync(perSection * 2, ct);
        var pick = ids.Where(id => !shown.Contains(id)).ToList();

        var products = new List<ProductMaster>();
        if (pick.Count > 0)
        {
            var loaded = await productRepo.GetByIdsAsync(pick, ct);
            var byId   = loaded.ToDictionary(p => p.Id);
            products   = pick.Where(byId.ContainsKey).Select(id => byId[id]).Take(perSection).ToList();
        }

        if (products.Count == 0) // cache trống → fallback Featured
            products = (await productRepo.GetFeaturedAsync(perSection, ct))
                       .Where(p => !shown.Contains(p.Id)).ToList();

        if (products.Count == 0) return;
        foreach (var p in products) shown.Add(p.Id);
        sections.Add(new RecSection("trending", products.Select(ProductMapper.ToListItem).ToList()));
    }

    private async Task AddFeatured(List<RecSection> sections, HashSet<Guid> shown, int perSection, CancellationToken ct)
    {
        var products = (await productRepo.GetFeaturedAsync(perSection, ct))
                       .Where(p => !shown.Contains(p.Id)).Take(perSection).ToList();
        if (products.Count == 0) return;

        foreach (var p in products) shown.Add(p.Id);
        sections.Add(new RecSection("featured", products.Select(ProductMapper.ToListItem).ToList()));
    }
}

// ── Engagement: ghi hành vi + yêu thích (Plan D phụ trợ) ─────────────────────
public class EngagementService(
    IUserActivityRepository activityRepo,
    IUserFavoriteRepository favoriteRepo,
    IProductRepository      productRepo,
    IModule1UnitOfWork      uow
) : IEngagementService
{
    public async Task TrackAsync(Guid? customerId, TrackActivityRequest req, CancellationToken ct = default)
    {
        var ev = UserActivityEvent.Create(req.Type, customerId, req.SessionKey,
                                           req.ProductId, req.CategoryId, req.Keyword);
        await activityRepo.AddAsync(ev, ct);
        await uow.SaveChangesAsync(ct);
    }

    public async Task<List<ProductListItemResponse>> GetFavoritesAsync(Guid customerId, CancellationToken ct = default)
    {
        var favs = await favoriteRepo.GetByCustomerAsync(customerId, ct);
        var ids  = favs.Select(f => f.ProductId).ToList();
        if (ids.Count == 0) return new();

        var products = await productRepo.GetByIdsAsync(ids, ct);
        var byId     = products.ToDictionary(p => p.Id);
        return ids.Where(byId.ContainsKey).Select(id => ProductMapper.ToListItem(byId[id])).ToList();
    }

    public async Task<bool> AddFavoriteAsync(Guid customerId, Guid productId, CancellationToken ct = default)
    {
        if (await favoriteRepo.ExistsAsync(customerId, productId, ct)) return false;
        await favoriteRepo.AddAsync(UserFavorite.Create(customerId, productId), ct);
        await uow.SaveChangesAsync(ct);
        return true;
    }

    public async Task RemoveFavoriteAsync(Guid customerId, Guid productId, CancellationToken ct = default)
    {
        var fav = await favoriteRepo.GetAsync(customerId, productId, ct);
        if (fav is null) return;
        await favoriteRepo.RemoveAsync(fav, ct);
        await uow.SaveChangesAsync(ct);
    }
}
