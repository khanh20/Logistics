using LG.Core.ApplicationServices.Finance.Interfaces;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace LG.Core.API.BackgroundJobs
{
    public class DailyRevenueJob : BackgroundService
    {
        private readonly IServiceProvider _services;
        private readonly ILogger<DailyRevenueJob> _logger;

        public DailyRevenueJob(IServiceProvider services, ILogger<DailyRevenueJob> logger)
        {
            _services = services;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                var now = DateTime.UtcNow;
                // Target execution time is 01:00 AM UTC (you can adjust to local time if preferred)
                var nextRun = now.Date.AddDays(1).AddHours(1);

                // For testing/development, you might want to run this immediately or run every minute
                // var delay = TimeSpan.FromMinutes(1);
                var delay = nextRun - now;

                _logger.LogInformation("DailyRevenueJob is scheduled to run in {DelayTime}", delay);

                await Task.Delay(delay, stoppingToken);

                if (stoppingToken.IsCancellationRequested) break;

                try
                {
                    await RunJobAsync();
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "An error occurred while running the DailyRevenueJob.");
                }
            }
        }

        private async Task RunJobAsync()
        {
            using var scope = _services.CreateScope();
            var revenueService = scope.ServiceProvider.GetRequiredService<IDailyRevenueService>();

            // Generate report for yesterday
            var targetDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-1));
            
            _logger.LogInformation("DailyRevenueJob executing for date: {TargetDate}", targetDate);

            await revenueService.GenerateForDateAsync(targetDate);

            _logger.LogInformation("DailyRevenueJob completed successfully for date: {TargetDate}", targetDate);
        }
    }
}
