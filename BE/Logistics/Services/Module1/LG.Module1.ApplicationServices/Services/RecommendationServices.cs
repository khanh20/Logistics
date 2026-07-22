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
                var seed      = await BuildWeightedSeedsAsync(cid, ct, favIds);
                var pool      = perSection * opts.CandidatePoolMultiplier;

                var (forYou, forYouSims, _) = await RecallVectorAsync(seed, shown, pool, ct);
                if (forYou.Count == 0)
                {
                    var topCats = profile.CategoryWeights.OrderByDescending(kv => kv.Value)
                                         .Take(6).Select(kv => kv.Key).ToList();
                    forYou = await productRepo.GetTopByCategoriesAsync(topCats, shown.Concat(favIds), pool, ct);
                    forYouSims = null;
                }
                var coView = await RecallCoViewAsync(seed.Select(s => s.ProductId).ToList(), shown, pool, ct);

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
                var weightedSeeds = await BuildWeightedSeedsAsync(cid, ct);
                var (similar, similarSims, similarOrder) = await RecallVectorAsync(weightedSeeds, shown, pool, ct);
                if (similar.Count == 0)
                {
                    var cats = await activityRepo.GetRecentCategoryIdsAsync(cid, 5, ct);
                    similar = await productRepo.GetTopByCategoriesAsync(cats, shown, pool, ct);
                    similarSims = null;
                }
                var coView = await RecallCoViewAsync(recentViewed, shown, pool, ct);

                // similar_to_viewed xếp theo similarity, không qua ML (xem ghi chú ở AddRankedSection).
                var ml = await MlRerankAsync(cid, new[] { ("also_viewed", coView) }, ct);
                AddRankedSection(sections, shown, "similar_to_viewed", similar, similarSims, profile, perSection,
                    similarOrder);
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
    // bySimilarity: xếp thuần theo độ giống seed, bỏ qua ML. Dùng cho section mà hợp đồng
    // với người dùng LÀ độ giống ("giống thứ bạn đã xem"). Model reco học từ hành vi mô
    // phỏng nên tối ưu độ phổ biến — đo thực tế nó đẩy SP sim=0.47 lên trên SP sim=1.00,
    // tức phá đúng thứ section này hứa hẹn.
    private void AddRankedSection(List<RecSection> sections, HashSet<Guid> shown, string key,
        List<ProductMaster> products, IReadOnlyDictionary<Guid, double>? sims, UserProfile profile,
        int perSection, IReadOnlyList<Guid>? mlOrder, bool bySimilarity = false)
    {
        var pick = products.Where(p => !shown.Contains(p.Id)).ToList();
        if (pick.Count == 0) return;

        var ranked = bySimilarity && sims is { Count: > 0 }
            ? pick.OrderByDescending(p => sims.GetValueOrDefault(p.Id)).Take(perSection).ToList()
            : mlOrder is { Count: > 0 }
                ? Common.RankingHelpers.ReorderByIds(pick, mlOrder).Take(perSection).ToList()
                : Rank(pick, profile, sims, perSection);
        if (ranked.Count == 0) return;

        foreach (var p in ranked) shown.Add(p.Id);
        sections.Add(new RecSection(key, ranked.Select(ProductMapper.ToListItem).ToList()));
    }

    // ── Recall sources ──────────────────────────────────────────────────────────

    // Dựng seed có trọng số từ chuỗi hành vi: tách phiên hiện tại (ý định tức thời) khỏi
    // lịch sử cũ (sở thích ổn định), rồi cân hai bên bằng α động.
    //
    // Vì sao α phải động: phiên mới có 1 item thì chưa đủ căn cứ nói người dùng đang muốn
    // gì, phải dựa vào lịch sử; phiên đã 5-6 item thì ý định đã rõ và phải ưu tiên nó.
    // Ngược lại nếu lịch sử quá mỏng thì chính nó mới là nhiễu, lúc đó α tự đẩy về 1.
    private async Task<List<WeightedSeed>> BuildWeightedSeedsAsync(
        Guid cid, CancellationToken ct, IEnumerable<Guid>? favoriteIds = null)
    {
        var h = opts.Horizon;
        var events = await activityRepo.GetRecentEventsAsync(cid, h.MaxEventsScanned, ct);
        if (events.Count == 0) return new();

        var now = DateTime.UtcNow;
        events = events.Where(e => (now - e.CreatedAt).TotalDays <= h.LongTermCutoffDays)
                       .OrderByDescending(e => e.CreatedAt).ToList();
        if (events.Count == 0) return new();

        // Phiên hiện tại = chuỗi liên tục từ sự kiện mới nhất, cắt khi có khoảng lặng.
        // Không tin vào SessionKey: nhiều sự kiện (checkout, mua) không mang key.
        var session = new List<BehaviorEventRow> { events[0] };
        for (int i = 1; i < events.Count; i++)
        {
            if ((events[i - 1].CreatedAt - events[i].CreatedAt).TotalMinutes > h.SessionGapMinutes) break;
            session.Add(events[i]);
        }

        var sessionIds = session.Select(e => e.ProductId).ToHashSet();
        var history    = events.Skip(session.Count).ToList();

        // n_phiên/n_lịch_sử đếm theo SẢN PHẨM khác nhau — sự kiện đang bị ghi trùng nên
        // đếm theo lượt sẽ thổi phồng độ tự tin.
        var nSession = sessionIds.Count;
        var nHistory = history.Select(e => e.ProductId).Distinct().Count(id => !sessionIds.Contains(id));

        var alpha = h.AlphaMax * (1 - Math.Exp(-nSession / Math.Max(0.1, h.AlphaTau)));
        var beta  = 1 - Math.Exp(-nHistory / Math.Max(0.1, h.HistoryTau));
        var denom = alpha + (1 - alpha) * beta;
        var alphaFinal = denom <= 0 ? 1.0 : alpha / denom;

        // Gom thô từng nhánh trước, CHƯA nhân α. Cùng sản phẩm lặp lại thì giữ lượt nặng
        // nhất chứ không cộng dồn — cộng dồn sẽ khuếch đại đúng các sự kiện bị ghi trùng.
        var shortRaw = new Dictionary<Guid, double>();
        var longRaw  = new Dictionary<Guid, double>();

        static void Bump(Dictionary<Guid, double> bag, Guid pid, double w)
        {
            if (!bag.TryGetValue(pid, out var cur) || w > cur) bag[pid] = w;
        }

        // Ngắn hạn: suy giảm theo vị trí lùi từ cuối phiên (session[0] là mới nhất).
        for (int i = 0; i < session.Count; i++)
        {
            var e = session[i];
            Bump(shortRaw, e.ProductId,
                 Math.Exp(-i / Math.Max(0.1, h.SessionPositionLambda)) * TypeWeight(e.EventType));
        }

        // Dài hạn: bán rã theo tuổi.
        foreach (var e in history)
        {
            if (sessionIds.Contains(e.ProductId)) continue;
            var ageDays = Math.Max(0, (now - e.CreatedAt).TotalDays);
            Bump(longRaw, e.ProductId,
                 Math.Pow(0.5, ageDays / Math.Max(0.1, h.LongTermHalflifeDays)) * TypeWeight(e.EventType));
        }

        // Yêu thích là tín hiệu bền do người dùng chủ động khai báo — không suy giảm theo
        // thời gian như lượt xem, nhưng vẫn thuộc nhánh dài hạn.
        foreach (var pid in favoriteIds ?? Enumerable.Empty<Guid>())
            if (!sessionIds.Contains(pid)) Bump(longRaw, pid, opts.SignalWeights.Favorite);

        // Chuẩn hoá TỪNG nhánh về max = 1 rồi mới nhân α. Không chuẩn hoá thì trọng số
        // loại sự kiện (mua = 3× xem) lớn hơn cả tỉ lệ α và nuốt mất phần cân bằng
        // ngắn/dài hạn — đo thực tế: một lượt mua 4 ngày trước đè bẹp cả phiên đang xem.
        // Sau chuẩn hoá, recency và loại sự kiện chỉ còn quyết định thứ tự TRONG nhánh.
        var seeds = new Dictionary<Guid, WeightedSeed>();
        Emit(shortRaw, alphaFinal, true);
        Emit(longRaw, 1 - alphaFinal, false);

        void Emit(Dictionary<Guid, double> bag, double share, bool fromSession)
        {
            if (bag.Count == 0 || share <= 0) return;
            var max = bag.Values.Max();
            if (max <= 0) return;
            foreach (var (pid, w) in bag)
            {
                var scaled = share * (w / max);
                if (seeds.TryGetValue(pid, out var cur) && cur.Weight >= scaled) continue;
                seeds[pid] = new WeightedSeed(pid, scaled, fromSession);
            }
        }

        return seeds.Values.OrderByDescending(s => s.Weight).Take(h.MaxSeeds).ToList();
    }

    private double TypeWeight(ActivityEventType t) => t switch
    {
        ActivityEventType.Purchase   => opts.SignalWeights.Purchase,
        ActivityEventType.AddToCart  => opts.SignalWeights.Favorite,
        _                            => opts.SignalWeights.View,
    };

    // Vector ANN quanh TỪNG seed rồi gộp (similarity = tới seed gần nhất).
    // Trước đây gộp seed thành một vector trung bình, nhưng seed của một người thường
    // rất tạp (đồ trẻ em + điện thoại + túi giấy...) nên vector trung bình rơi vào vùng
    // dày nhất của catalog và trả về toàn hàng phổ biến chung chung. Đo trên tài khoản
    // thật: centroid cho sim 0.62-0.70 toàn áo quần brand, per-seed cho 0.60-0.85 đúng
    // chủng loại đã xem.
    private async Task<(List<ProductMaster> Products, Dictionary<Guid, double>? Sims, List<Guid> Order)>
        RecallVectorAsync(IReadOnlyList<WeightedSeed> seeds, HashSet<Guid> shown, int pool, CancellationToken ct)
    {
        var use = seeds.Where(s => s.ProductId != Guid.Empty && s.Weight > 0).ToList();
        if (use.Count == 0) return (new(), null, new());

        // Mỗi seed đóng góp một phần pool, tối thiểu 3 để seed yếu vẫn có đại diện.
        var perSeed = Math.Max(3, (int)Math.Ceiling((double)pool / use.Count) + 2);
        var matches = await embeddingRepo.FindNearestPerSeedAsync(
            use, shown.Concat(use.Select(s => s.ProductId)), perSeed, pool, ct);
        if (matches.Count == 0) return (new(), null, new());

        var products = await productRepo.GetByIdsAsync(matches.Select(m => m.ProductId).ToList(), ct);
        var scores   = matches.ToDictionary(m => m.ProductId, m => m.Score);

        // Luân phiên theo seed thay vì xếp thuần theo điểm.
        var weightOf = use.ToDictionary(s => s.ProductId, s => s.Weight);
        var groups = matches
            .GroupBy(m => m.SeedId)
            .OrderByDescending(g => weightOf.GetValueOrDefault(g.Key))
            .Select(g => g.OrderByDescending(m => m.Score).Select(m => m.ProductId).ToList())
            .ToList();

        var order = new List<Guid>();
        for (int round = 0; order.Count < matches.Count; round++)
        {
            var added = false;
            foreach (var g in groups)
            {
                if (round >= g.Count) continue;
                order.Add(g[round]);
                added = true;
            }
            if (!added) break;
        }

        return (products, scores, order);
    }

    // Co-view: "người xem X cũng xem Y" từ cache.
    private async Task<List<ProductMaster>> RecallCoViewAsync(
        List<Guid> seedIds, HashSet<Guid> shown, int pool, CancellationToken ct)
    {
        var ids = await coViewRepo.GetRelatedAsync(seedIds, shown, pool, ct);
        return ids.Count == 0 ? new() : await productRepo.GetByIdsAsync(ids, ct);
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
