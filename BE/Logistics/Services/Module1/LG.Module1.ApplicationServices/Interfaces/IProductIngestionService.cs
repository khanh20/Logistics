using LG.Module1.ApplicationServices.DTOs.Ingestion;

namespace LG.Module1.ApplicationServices.Interfaces;

public interface IProductIngestionService
{
    /// Crawl theo keyword trên 1 sàn cụ thể.
    /// Quy trình: adapter.SearchAsync → mapping shop+price → ProductService.UpsertFromRawAsync
    /// Hàng cấm tự động bị flag bởi UpsertFromRawAsync.
    Task<CrawlResultResponse> CrawlByKeywordAsync(
        CrawlByKeywordRequest req, CancellationToken ct = default);

    /// Crawl 1 sản phẩm cụ thể từ URL.
    /// Tự động detect platform từ domain trong URL.
    Task<CrawlUrlResultResponse> CrawlByUrlAsync(
        CrawlByUrlRequest req, CancellationToken ct = default);

    /// Liệt kê platform mà hệ thống có adapter sẵn sàng.
    List<string> GetAvailablePlatforms();

    /// Customer dán URL trên web → resolve thành ProductDetail để hiện popup chọn variant.
    /// ScrapedData != null (1688/Taobao/Tmall): chỉ upsert từ data extension đã scrape.
    /// ScrapedData == null: tự resolve qua adapter API (eBay/Rakuten); nếu không adapter nào
    /// nhận URL → trả Status="NeedExtension".
    Task<ResolveUrlResponse> ResolveUrlForCustomerAsync(
        ResolveUrlRequest req, CancellationToken ct = default);
}