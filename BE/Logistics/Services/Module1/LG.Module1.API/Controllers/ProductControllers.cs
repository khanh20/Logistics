using LG.Module1.ApplicationServices.DTOs.Product;
using LG.Module1.ApplicationServices.Interfaces;
using LG.Shared.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LG.Module1.API.Controllers;

// ─────────────────────────────────────────────────────────────────────────────
// VARIANTS  —  /api/products/{productId}/variants
//
// Public:   GET variants (khách cần xem màu/size trước khi mua)
// Staff:    POST, PUT, DELETE variant         → product.manage
// Staff:    PUT /variants/{id}/price-tiers    → product.manage
// ─────────────────────────────────────────────────────────────────────────────
[Route("api/products/{productId:guid}/variants")]
public class ProductVariantsController(IProductVariantService variantService) : Module1BaseController
{

    [HttpGet]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ApiResponse<List<ProductVariantResponse>>), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetByProduct(Guid productId, CancellationToken ct)
    {
        var result = await variantService.GetByProductAsync(productId, ct);
        return Ok(ApiResponse<List<ProductVariantResponse>>.Ok(result));
    }

    [HttpGet("{variantId:guid}")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ApiResponse<ProductVariantResponse>), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetById(Guid productId, Guid variantId, CancellationToken ct)
    {
        var result = await variantService.GetByIdAsync(variantId, ct);
        return Ok(ApiResponse<ProductVariantResponse>.Ok(result));
    }

    
    /// Thêm một variant mới vào sản phẩm.
    /// Quyền: NV_MuaHang, Admin (product.manage).
    [HttpPost]
    [Authorize(Policy = Permissions.ProductManage)]
    [ProducesResponseType(typeof(ApiResponse<ProductVariantResponse>), 201)]
    [ProducesResponseType(400)]
    [ProducesResponseType(401)]
    [ProducesResponseType(403)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Add(Guid productId, [FromBody] AddVariantRequest req, CancellationToken ct)
    {
        var result = await variantService.AddAsync(productId, req, ct);
        return StatusCode(201, ApiResponse<ProductVariantResponse>.Ok(result, "Variant đã được thêm."));
    }

    
    /// Cập nhật thông tin variant (tên, giá, tồn kho, sắp xếp).
    /// Quyền: NV_MuaHang, Admin (product.manage).
    [HttpPut("{variantId:guid}")]
    [Authorize(Policy = Permissions.ProductManage)]
    [ProducesResponseType(typeof(ApiResponse<ProductVariantResponse>), 200)]
    [ProducesResponseType(400)]
    [ProducesResponseType(401)]
    [ProducesResponseType(403)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Update(
        Guid productId, Guid variantId,
        [FromBody] UpdateVariantRequest req,
        CancellationToken ct)
    {
        var result = await variantService.UpdateAsync(variantId, req, ct);
        return Ok(ApiResponse<ProductVariantResponse>.Ok(result, "Variant đã cập nhật."));
    }

    
    /// Xóa variant.
    /// Quyền: NV_MuaHang, Admin (product.manage).
    [HttpDelete("{variantId:guid}")]
    [Authorize(Policy = Permissions.ProductManage)]
    [ProducesResponseType(200)]
    [ProducesResponseType(401)]
    [ProducesResponseType(403)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Delete(Guid productId, Guid variantId, CancellationToken ct)
    {
        await variantService.DeleteAsync(variantId, ct);
        return Ok(ApiResponse.Ok("Variant đã xóa."));
    }

    
    /// Thay thế toàn bộ price tiers của variant.
    /// Gửi danh sách tier đầy đủ — server replace hoàn toàn.
    /// Quyền: NV_MuaHang, Admin (product.manage).
    [HttpPut("{variantId:guid}/price-tiers")]
    [Authorize(Policy = Permissions.ProductManage)]
    [ProducesResponseType(typeof(ApiResponse<ProductVariantResponse>), 200)]
    [ProducesResponseType(400)]
    [ProducesResponseType(401)]
    [ProducesResponseType(403)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> SyncPriceTiers(
        Guid productId, Guid variantId,
        [FromBody] SyncPriceTiersRequest req,
        CancellationToken ct)
    {
        var result = await variantService.SyncPriceTiersAsync(variantId, req, ct);
        return Ok(ApiResponse<ProductVariantResponse>.Ok(result, $"{req.Tiers.Count} tiers đã được cập nhật."));
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// IMAGES  —  /api/products/{productId}/images
//
// Public:   GET images
// Staff:    POST, DELETE, PATCH primary, PUT reorder, PUT cdn  → product.manage
// ─────────────────────────────────────────────────────────────────────────────
[Route("api/products/{productId:guid}/images")]
public class ProductImagesController(IProductImageService imageService) : Module1BaseController
{
    [HttpGet]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ApiResponse<List<ProductImageResponse>>), 200)]
    public async Task<IActionResult> GetByProduct(Guid productId, CancellationToken ct)
    {
        var result = await imageService.GetByProductAsync(productId, ct);
        return Ok(ApiResponse<List<ProductImageResponse>>.Ok(result));
    }

    
    /// Thêm ảnh mới. Tự động bỏ qua nếu SourceUrlHash đã tồn tại.
    /// Quyền: NV_MuaHang, Admin (product.manage).
    [HttpPost]
    [Authorize(Policy = Permissions.ProductManage)]
    [ProducesResponseType(typeof(ApiResponse<ProductImageResponse>), 201)]
    [ProducesResponseType(400)]
    [ProducesResponseType(401)]
    [ProducesResponseType(403)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Add(Guid productId, [FromBody] AddImageRequest req, CancellationToken ct)
    {
        var result = await imageService.AddAsync(productId, req, ct);
        return StatusCode(201, ApiResponse<ProductImageResponse>.Ok(result, "Ảnh đã được thêm."));
    }

    
    /// Cập nhật local CDN URL sau khi rehost ảnh về server.
    /// Quyền: NV_MuaHang, Admin (product.manage).
    [HttpPut("{imageId:guid}/cdn")]
    [Authorize(Policy = Permissions.ProductManage)]
    [ProducesResponseType(typeof(ApiResponse<ProductImageResponse>), 200)]
    [ProducesResponseType(401)]
    [ProducesResponseType(403)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> SetCdnUrl(
        Guid productId, Guid imageId,
        [FromBody] SetImageCdnRequest req,
        CancellationToken ct)
    {
        var result = await imageService.SetCdnUrlAsync(imageId, req, ct);
        return Ok(ApiResponse<ProductImageResponse>.Ok(result, "CDN URL đã cập nhật."));
    }

    
    /// Đặt ảnh này làm ảnh chính (primary).
    /// Tự động bỏ primary của ảnh cũ.
    /// Quyền: NV_MuaHang, Admin (product.manage).
    [HttpPatch("{imageId:guid}/primary")]
    [Authorize(Policy = Permissions.ProductManage)]
    [ProducesResponseType(typeof(ApiResponse<ProductImageResponse>), 200)]
    [ProducesResponseType(401)]
    [ProducesResponseType(403)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> SetPrimary(Guid productId, Guid imageId, CancellationToken ct)
    {
        var result = await imageService.SetPrimaryAsync(imageId, ct);
        return Ok(ApiResponse<ProductImageResponse>.Ok(result, "Ảnh chính đã được cập nhật."));
    }

    
    /// Cập nhật thứ tự hiển thị của nhiều ảnh cùng lúc.
    /// Client gửi mảng { id, sortOrder } mới.
    /// Quyền: NV_MuaHang, Admin (product.manage).
    [HttpPut("reorder")]
    [Authorize(Policy = Permissions.ProductManage)]
    [ProducesResponseType(200)]
    [ProducesResponseType(400)]
    [ProducesResponseType(401)]
    [ProducesResponseType(403)]
    public async Task<IActionResult> Reorder(
        Guid productId,
        [FromBody] ReorderImagesRequest req,
        CancellationToken ct)
    {
        await imageService.ReorderAsync(productId, req, ct);
        return Ok(ApiResponse.Ok("Thứ tự ảnh đã được cập nhật."));
    }

    
    /// Xóa ảnh.
    /// Quyền: NV_MuaHang, Admin (product.manage).
    [HttpDelete("{imageId:guid}")]
    [Authorize(Policy = Permissions.ProductManage)]
    [ProducesResponseType(200)]
    [ProducesResponseType(401)]
    [ProducesResponseType(403)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Delete(Guid productId, Guid imageId, CancellationToken ct)
    {
        await imageService.DeleteAsync(imageId, ct);
        return Ok(ApiResponse.Ok("Ảnh đã xóa."));
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// ATTRIBUTES  —  /api/products/{productId}/attributes
//
// Public:   GET attributes (FE filter sidebar)
// Staff:    POST, PUT, DELETE, PUT sync → product.manage
// ─────────────────────────────────────────────────────────────────────────────
[Route("api/products/{productId:guid}/attributes")]
public class ProductAttributesController(IProductAttributeService attrService) : Module1BaseController
{
    [HttpGet]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ApiResponse<List<ProductAttributeResponse>>), 200)]
    public async Task<IActionResult> GetByProduct(Guid productId, CancellationToken ct)
    {
        var result = await attrService.GetByProductAsync(productId, ct);
        return Ok(ApiResponse<List<ProductAttributeResponse>>.Ok(result));
    }

    
    /// Thêm một thuộc tính mới.
    /// Quyền: NV_MuaHang, Admin (product.manage).
    [HttpPost]
    [Authorize(Policy = Permissions.ProductManage)]
    [ProducesResponseType(typeof(ApiResponse<ProductAttributeResponse>), 201)]
    [ProducesResponseType(401)]
    [ProducesResponseType(403)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Add(Guid productId, [FromBody] AddAttributeRequest req, CancellationToken ct)
    {
        var result = await attrService.AddAsync(productId, req, ct);
        return StatusCode(201, ApiResponse<ProductAttributeResponse>.Ok(result, "Thuộc tính đã thêm."));
    }

    
    /// Cập nhật thuộc tính.
    /// Quyền: NV_MuaHang, Admin (product.manage).
    [HttpPut("{attributeId:guid}")]
    [Authorize(Policy = Permissions.ProductManage)]
    [ProducesResponseType(typeof(ApiResponse<ProductAttributeResponse>), 200)]
    [ProducesResponseType(401)]
    [ProducesResponseType(403)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Update(
        Guid productId, Guid attributeId,
        [FromBody] AddAttributeRequest req,
        CancellationToken ct)
    {
        var result = await attrService.UpdateAsync(attributeId, req, ct);
        return Ok(ApiResponse<ProductAttributeResponse>.Ok(result));
    }

    
    /// Xóa thuộc tính.
    /// Quyền: NV_MuaHang, Admin (product.manage).
    [HttpDelete("{attributeId:guid}")]
    [Authorize(Policy = Permissions.ProductManage)]
    [ProducesResponseType(200)]
    [ProducesResponseType(401)]
    [ProducesResponseType(403)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Delete(Guid productId, Guid attributeId, CancellationToken ct)
    {
        await attrService.DeleteAsync(attributeId, ct);
        return Ok(ApiResponse.Ok("Thuộc tính đã xóa."));
    }

    
    /// Thay thế toàn bộ attributes của sản phẩm (dùng sau crawl để sync lại).
    /// Gửi danh sách đầy đủ — server delete cũ, insert mới trong 1 transaction.
    /// Quyền: NV_MuaHang, Admin (product.manage).
    [HttpPut("sync")]
    [Authorize(Policy = Permissions.ProductManage)]
    [ProducesResponseType(typeof(ApiResponse<List<ProductAttributeResponse>>), 200)]
    [ProducesResponseType(401)]
    [ProducesResponseType(403)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Sync(
        Guid productId,
        [FromBody] List<AddAttributeRequest> attributes,
        CancellationToken ct)
    {
        var result = await attrService.SyncAsync(productId, attributes, ct);
        return Ok(ApiResponse<List<ProductAttributeResponse>>.Ok(result,
            $"{result.Count} thuộc tính đã được đồng bộ."));
    }
}