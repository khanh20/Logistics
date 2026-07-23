using LG.Module1.ApplicationServices.Interfaces;
using LG.Module1.Domain.Adapters;
using LG.Module1.Domain.Repositories;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace LG.Module1.API.BackgroundJobs;

// Quét đánh giá Pending chưa chấm, gọi ViSoBERT gắn điểm spam.
// Nguyên tắc: AI chỉ TỰ DUYỆT khi tin chắc không spam (giảm tải), KHÔNG bao giờ tự từ chối —
// spam luôn để nhân viên quyết.
public class ReviewSpamScanJob(
    IServiceScopeFactory scopeFactory,
    IConfiguration cfg,
    ILogger<ReviewSpamScanJob> logger
) : BackgroundService
{
    private readonly bool   _enabled          = cfg.GetValue("ReviewSpam:Enabled", true);
    private readonly int    _intervalSeconds  = cfg.GetValue("ReviewSpam:IntervalSeconds", 60);
    private readonly int    _batchSize        = cfg.GetValue("ReviewSpam:BatchSize", 32);
    private readonly bool   _autoApprove      = cfg.GetValue("ReviewSpam:AutoApprove", false);
    private readonly double _approveThreshold = cfg.GetValue("ReviewSpam:ApproveThreshold", 0.15);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!_enabled)
        {
            logger.LogInformation("ReviewSpamScanJob disabled.");
            return;
        }
        logger.LogInformation("ReviewSpamScanJob started (interval: {Interval}s, autoApprove: {Auto})",
            _intervalSeconds, _autoApprove);

        while (!stoppingToken.IsCancellationRequested)
        {
            try { await ScanAsync(stoppingToken); }
            catch (Exception ex) when (ex is not OperationCanceledException)
            { logger.LogError(ex, "ReviewSpamScanJob failed during execution"); }

            await Task.Delay(TimeSpan.FromSeconds(_intervalSeconds), stoppingToken);
        }
    }

    private async Task ScanAsync(CancellationToken ct)
    {
        using var scope = scopeFactory.CreateScope();
        var reviewRepo = scope.ServiceProvider.GetRequiredService<IProductReviewRepository>();
        var classifier = scope.ServiceProvider.GetRequiredService<IReviewSpamClassifier>();
        var uow        = scope.ServiceProvider.GetRequiredService<IModule1UnitOfWork>();

        var pending = await reviewRepo.GetPendingUnscannedAsync(_batchSize, ct);
        if (pending.Count == 0) return;

        var scores = await classifier.ScoreAsync(
            pending.Select(r => (r.Id, r.Content)).ToList(), ct);
        if (scores.Count == 0) return;   // gateway offline -> để nguyên, thử lại sau

        int scanned = 0, autoApproved = 0;
        foreach (var review in pending)
        {
            if (!scores.TryGetValue(review.Id, out var score)) continue;
            review.ApplyAiSpamScore(score);
            if (_autoApprove && score < _approveThreshold)
            {
                review.AutoApprove();
                autoApproved++;
            }
            await reviewRepo.UpdateAsync(review, ct);
            scanned++;
        }

        await uow.SaveChangesAsync(ct);
        logger.LogInformation("ReviewSpamScanJob: chấm {Scanned} đánh giá, tự duyệt {Auto}",
            scanned, autoApproved);
    }
}
