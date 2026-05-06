using LG.Module1.ApplicationServices.DTOs.Cart;
using LG.Module1.ApplicationServices.Interfaces;
using LG.Shared.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LG.Module1.API.Controllers;

/// Cart management.
/// Tất cả endpoint yêu cầu customer đăng nhập (CartRead / CartManage).
[Route("api/cart")]
public class CartController(ICartService cartService) : Module1BaseController
{
    // GET /api/cart
    [HttpGet]
    [Authorize(Policy = Permissions.CartRead)]
    public async Task<IActionResult> GetCart(CancellationToken ct)
    {
        var cart = await cartService.GetOrCreateCartAsync(CurrentUserId, ct);
        return Ok(ApiResponse<CartResponse>.Ok(cart));
    }

    // POST /api/cart/items
    [HttpPost("items")]
    [Authorize(Policy = Permissions.CartManage)]
    public async Task<IActionResult> AddItem([FromBody] AddCartItemRequest req, CancellationToken ct)
    {
        var cart = await cartService.AddItemAsync(CurrentUserId, req, ct);
        return Ok(ApiResponse<CartResponse>.Ok(cart, "Đã thêm vào giỏ hàng."));
    }

    // PATCH /api/cart/items/{cartItemId}
    [HttpPatch("items/{cartItemId:guid}")]
    [Authorize(Policy = Permissions.CartManage)]
    public async Task<IActionResult> UpdateItemQuantity(Guid cartItemId,
        [FromBody] UpdateCartItemQuantityRequest req, CancellationToken ct)
    {
        var cart = await cartService.UpdateItemQuantityAsync(CurrentUserId, cartItemId, req, ct);
        return Ok(ApiResponse<CartResponse>.Ok(cart));
    }

    // DELETE /api/cart/items/{cartItemId}
    [HttpDelete("items/{cartItemId:guid}")]
    [Authorize(Policy = Permissions.CartManage)]
    public async Task<IActionResult> RemoveItem(Guid cartItemId, CancellationToken ct)
    {
        var cart = await cartService.RemoveItemAsync(CurrentUserId, cartItemId, ct);
        return Ok(ApiResponse<CartResponse>.Ok(cart, "Đã xóa sản phẩm khỏi giỏ hàng."));
    }

    // DELETE /api/cart
    [HttpDelete]
    [Authorize(Policy = Permissions.CartManage)]
    public async Task<IActionResult> ClearCart(CancellationToken ct)
    {
        var cart = await cartService.ClearCartAsync(CurrentUserId, ct);
        return Ok(ApiResponse<CartResponse>.Ok(cart, "Đã xóa toàn bộ giỏ hàng."));
    }

    // POST /api/cart/checkout/preview
    [HttpPost("checkout/preview")]
    [Authorize(Policy = Permissions.CartManage)]
    public async Task<IActionResult> PreviewCheckout([FromBody] CheckoutPreviewRequest req, CancellationToken ct)
    {
        var preview = await cartService.PreviewCheckoutAsync(CurrentUserId, req, ct);
        return Ok(ApiResponse<CheckoutPreviewResponse>.Ok(preview));
    }

    // POST /api/cart/checkout/confirm
    [HttpPost("checkout/confirm")]
    [Authorize(Policy = Permissions.CartManage)]
    public async Task<IActionResult> ConfirmCheckout([FromBody] ConfirmCheckoutRequest req, CancellationToken ct)
    {
        var result = await cartService.ConfirmCheckoutAsync(CurrentUserId, req, ct);
        return Ok(ApiResponse<ConfirmCheckoutResponse>.Ok(result,
            $"Đã tạo {result.OrdersCreated} đơn hàng. Tổng cọc: {result.TotalDepositVnd:N0} VNĐ."));
    }
}
