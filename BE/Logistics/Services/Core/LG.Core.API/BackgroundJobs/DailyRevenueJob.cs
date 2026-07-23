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
            // Delay 10 giây ban đầu khi khởi động ứng dụng để các service khác sẵn sàng
            await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken);

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    _logger.LogInformation("DailyRevenueJob is executing periodic run...");
                    await RunJobAsync();
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "An error occurred while running the DailyRevenueJob.");
                }

                // Chạy định kỳ mỗi 30 phút
                var interval = TimeSpan.FromMinutes(30);
                _logger.LogInformation("DailyRevenueJob sleeping for {IntervalTime}", interval);
                
                await Task.Delay(interval, stoppingToken);
            }
        }

        private async Task RunJobAsync()
        {
            using var scope = _services.CreateScope();
            var revenueService = scope.ServiceProvider.GetRequiredService<IDailyRevenueService>();

            // Lấy ngày hiện tại và ngày hôm qua theo múi giờ Việt Nam (UTC + 7) để tính toán chính xác theo giờ đơn hàng
            var nowVietNam = DateTime.UtcNow.AddHours(7);
            var today = DateOnly.FromDateTime(nowVietNam);
            var yesterday = today.AddDays(-1);
            
            _logger.LogInformation("DailyRevenueJob executing update for Yesterday: {Yesterday} and Today: {Today}", yesterday, today);

            // 1. Cập nhật số liệu cho ngày hôm qua
            await revenueService.GenerateForDateAsync(yesterday);

            // 2. Cập nhật số liệu cho ngày hôm nay (để số liệu nhảy realtime trong ngày)
            await revenueService.GenerateForDateAsync(today);

            _logger.LogInformation("DailyRevenueJob completed successfully for yesterday and today.");
        }
    }
}
