using LG.Core.ApplicationServices.Finance.DTOs.ZaloPay;
using LG.Core.Domain.Finance;
using System.Threading.Tasks;

namespace LG.Core.ApplicationServices.Finance.Interfaces
{
    public interface IZaloPayService
    {
        /// <summary>
        /// Tạo đơn thanh toán ZaloPay từ yêu cầu nạp tiền (TopupRequest).
        /// </summary>
        Task<ZaloPayCreateOrderResponseDto> CreatePaymentAsync(TopupRequest topup);

        /// <summary>
        /// Tạo đơn thanh toán ZaloPay cho Đơn hàng (Order).
        /// </summary>
        Task<ZaloPayCreateOrderResponseDto> CreateOrderPaymentAsync(Guid orderId, decimal amount, Guid customerId, string description);

        /// <summary>
        /// Xử lý callback (webhook) từ ZaloPay.
        /// </summary>
        Task<bool> ProcessCallbackAsync(ZaloPayCallbackDto callback);
    }
}
