using LG.Module2.ApplicationServices.Interfaces;

namespace LG.Module2.ApplicationServices.Services.Carrier;

/// Chọn gateway chuyên biệt (vd GHTK) nếu có; nếu không → gateway fallback (stub).
public class CarrierGatewayResolver(IEnumerable<ICarrierGateway> gateways) : ICarrierGatewayResolver
{
    public ICarrierGateway Resolve(string carrierName)
    {
        var specific = gateways.FirstOrDefault(g => !g.IsFallback && g.Supports(carrierName));
        if (specific is not null) return specific;

        return gateways.FirstOrDefault(g => g.IsFallback)
               ?? throw new InvalidOperationException("Không có carrier gateway fallback nào được đăng ký.");
    }
}
