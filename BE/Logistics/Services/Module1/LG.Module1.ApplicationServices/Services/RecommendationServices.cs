using LG.Module1.ApplicationServices.DTOs.Product;
using LG.Module1.ApplicationServices.DTOs.Recommendation;
using LG.Module1.ApplicationServices.Interfaces;
using LG.Module1.Domain.Entities;
using LG.Module1.Domain.Repositories;
using Pgvector;

namespace LG.Module1.ApplicationServices.Services;

// Engine gợi ý theo phân khúc khách (Plan D) + rank đa tín hiệu có trọng số (#1),
// for_you dùng lịch sử mua + shop yêu thích (#2), co-view (#3).
// AI vector (Plan G) là 1 nguồn recall; thiếu embedding → fallback heuristic.
public class RecommendationService(
    IProductRepository          productRepo,
    ITrendingProductRepository  trendingRepo,
    IUserActivityRepository     activityRepo,
    IUserFavoriteRepository     favoriteRepo,
    ICustomerOrderRepository    orderRepo,
    IProductEmbeddingRepository embeddingRepo,
    IProductCoViewRepository    coViewRepo
) : IRecommendationService
{
    private const int LoyalMinOrders = 3;

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
            completed >= LoyalMinOrders                 ? "loyal"
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

                // for_you: vector (mua + thích + xem) → fallback danh mục theo trọng số; rồi rank.
                var (vp, vsims) = await RecallVectorAsync(seed, shown, perSection * 4, ct);
                if (vp.Count > 0)
                    RankAddLoaded(sections, shown, "for_you", vp, vsims, profile, perSection);
                else
                {
                    var topCats = profile.CategoryWeights.OrderByDescending(kv => kv.Value)
                                         .Take(6).Select(kv => kv.Key).ToList();
                    var cp = await productRepo.GetTopByCategoriesAsync(topCats, shown.Concat(favIds), perSection * 4, ct);
                    RankAddLoaded(sections, shown, "for_you", cp, null, profile, perSection);
                }

                await AddCoViewAsync(sections, shown, seed, profile, perSection, ct);
                await AddSection(sections, shown, "recently_viewed", recentViewed, perSection, ct);
                await AddTrending(sections, shown, perSection, ct);
                break;
            }

            case "returning":
            {
                var profile = await BuildProfileAsync(cid, recentViewed, ct);
                await AddSection(sections, shown, "recently_viewed", recentViewed, perSection, ct);

                // similar: vector từ sản phẩm đã xem → fallback danh mục; rồi rank.
                var (vp, vsims) = await RecallVectorAsync(recentViewed, shown, perSection * 4, ct);
                if (vp.Count > 0)
                    RankAddLoaded(sections, shown, "similar_to_viewed", vp, vsims, profile, perSection);
                else
                {
                    var cats = await activityRepo.GetRecentCategoryIdsAsync(cid, 5, ct);
                    var cp   = await productRepo.GetTopByCategoriesAsync(cats, shown, perSection * 4, ct);
                    RankAddLoaded(sections, shown, "similar_to_viewed", cp, null, profile, perSection);
                }

                await AddCoViewAsync(sections, shown, recentViewed, profile, perSection, ct);
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
        AddCat(purchased, 3.0);
        AddCat(favIds, 2.0);
        AddCat(recentViewed, 1.0);

        // Shop yêu thích = shop đã mua + shop của sản phẩm đã thích.
        foreach (var s in await orderRepo.GetPurchasedShopIdsAsync(cid, ct)) profile.PreferredShopIds.Add(s);
        foreach (var id in favIds) if (byId.TryGetValue(id, out var p)) profile.PreferredShopIds.Add(p.ShopId);

        var prices = signalIds.Where(byId.ContainsKey).Select(id => (double)MinPrice(byId[id])).Where(x => x > 0).ToList();
        if (prices.Count > 0) profile.PreferredPriceCny = prices.Average();

        return profile;
    }

    // ── Rank đa tín hiệu (#1) ───────────────────────────────────────────────────
    private static List<ProductMaster> Rank(List<ProductMaster> candidates, UserProfile profile,
        IReadOnlyDictionary<Guid, double>? sims, int take)
    {
        if (candidates.Count == 0) return candidates;

        double maxCatW = profile.CategoryWeights.Count > 0 ? profile.CategoryWeights.Values.Max() : 1;
        if (maxCatW <= 0) maxCatW = 1;
        double maxPop = candidates.Max(p => Math.Log(1 + p.ViewCount + p.TotalSoldLocal));
        if (maxPop <= 0) maxPop = 1;
        var now = DateTime.UtcNow;

        double Score(ProductMaster p)
        {
            double sim     = sims != null && sims.TryGetValue(p.Id, out var s) ? s : 0;
            double cat     = profile.CategoryWeights.GetValueOrDefault(p.CategoryId) / maxCatW;
            double pop     = Math.Log(1 + p.ViewCount + p.TotalSoldLocal) / maxPop;
            double recency = 1.0 / (1.0 + Math.Max(0, (now - p.CreatedAt).TotalDays) / 30.0);
            double price   = 1.0;
            if (profile.PreferredPriceCny is double pref && pref > 0)
            {
                double mp = (double)MinPrice(p);
                price = mp > 0 ? Math.Max(0, 1 - Math.Min(1, Math.Abs(mp - pref) / pref)) : 0.5;
            }
            double featured = p.IsFeatured ? 1 : 0;
            double shop     = profile.PreferredShopIds.Contains(p.ShopId) ? 1 : 0;

            return 0.35 * sim + 0.20 * cat + 0.15 * pop + 0.10 * recency
                 + 0.10 * price + 0.05 * featured + 0.05 * shop;
        }

        return candidates.OrderByDescending(Score).Take(take).ToList();
    }

    private void RankAddLoaded(List<RecSection> sections, HashSet<Guid> shown, string key,
        List<ProductMaster> products, IReadOnlyDictionary<Guid, double>? sims, UserProfile profile, int perSection)
    {
        var pick = products.Where(p => !shown.Contains(p.Id)).ToList();
        if (pick.Count == 0) return;

        var ranked = Rank(pick, profile, sims, perSection);
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

    // Co-view (#3): "người xem X cũng xem Y" từ cache, rồi rank.
    private async Task AddCoViewAsync(List<RecSection> sections, HashSet<Guid> shown,
        List<Guid> seedIds, UserProfile profile, int perSection, CancellationToken ct)
    {
        var ids = await coViewRepo.GetRelatedAsync(seedIds, shown, perSection * 4, ct);
        if (ids.Count == 0) return;
        var products = await productRepo.GetByIdsAsync(ids, ct);
        RankAddLoaded(sections, shown, "also_viewed", products, null, profile, perSection);
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
