using LG.Core.ApplicationServices.Finance.DTOs.WalletPayment;
using System;
using System.Threading.Tasks;

namespace LG.Core.ApplicationServices.Finance.Interfaces
{
    /// <summary>
    /// Wallet Payment API — được Module1 (Order) gọi server-to-server
    /// để trừ/hoàn tiền ví khi đóng cọc, thanh toán cuối kỳ, hủy đơn.
    /// </summary>
    public interface IWalletPaymentService
    {
        /// <summary>
        /// Lấy số dư ví của khách hàng.
        /// </summary>
        Task<WalletBalanceResponse> GetBalanceAsync(Guid customerId);

        /// <summary>
        /// Trừ tiền ví (đóng cọc hoặc thanh toán cuối kỳ).
        /// Kiểm tra: ví không bị đóng băng, số dư đủ.
        /// </summary>
        Task<WalletDeductResponse> DeductAsync(WalletDeductRequest request);

        /// <summary>
        /// Hoàn tiền ví (hủy đơn đã cọc).
        /// </summary>
        Task<WalletRefundResponse> RefundAsync(WalletRefundRequest request);

        /// <summary>
        /// Tính phí checkout (phí dịch vụ, kiểm hàng, bảo hiểm) dựa trên FeeRule.
        /// </summary>
        Task<CalculateFeesResponse> CalculateCheckoutFeesAsync(CalculateFeesRequest request);

        /// <summary>
        /// Tính phí ship quốc tế + lưu kho (khi có cân nặng/thể tích thực tế).
        /// </summary>
        Task<CalculateShippingFeesResponse> CalculateShippingFeesAsync(CalculateShippingFeesRequest request);
    }
}
