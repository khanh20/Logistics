using LG.Module2.ApplicationServices.Interfaces;
using LG.Module2.Domain.Repositories;

namespace LG.Module2.ApplicationServices.Services;

public class BarcodeService(IPackageRepository packageRepo) : IBarcodeService
{
    public async Task<string> GenerateAsync(CancellationToken ct = default)
    {
        string barcode;
        int attempt = 0;
        do
        {
            if (++attempt > 10)
                throw new InvalidOperationException("Không thể sinh barcode duy nhất sau 10 lần thử.");
            var datePart   = DateTime.UtcNow.ToString("yyyyMMdd");
            var randomPart = Convert.ToHexString(Guid.NewGuid().ToByteArray())[..8];
            barcode = $"LG-{datePart}-{randomPart}";
        }
        while (await packageRepo.BarcodeExistsAsync(barcode, ct));

        return barcode;
    }
}
