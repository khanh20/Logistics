using LG.Module2.ApplicationServices.DTOs.Package;
using LG.Module2.ApplicationServices.Interfaces;
using LG.Shared.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LG.Module2.API.Controllers;

// ── Package (Staff/Admin) ─────────────────────────────────────────────────────
[Route("api/packages")]
public class PackagesController(IPackageService packageService) : Module2BaseController
{
    // POST /api/packages
    [HttpPost]
    [Authorize(Policy = Permissions.WarehouseManage)]
    public async Task<IActionResult> Create([FromBody] CreatePackageRequest req, CancellationToken ct)
    {
        var result = await packageService.CreateAsync(req, ct);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, ApiResponse<object>.Ok(result, "Tạo kiện hàng thành công."));
    }

    // GET /api/packages/{id}
    [HttpGet("{id:guid}")]
    [Authorize(Policy = Permissions.WarehouseRead)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var pkg = await packageService.GetByIdAsync(id, ct);
        return Ok(ApiResponse<object>.Ok(pkg));
    }

    // GET /api/packages/barcode/{barcode}
    [HttpGet("barcode/{barcode}")]
    [Authorize(Policy = Permissions.WarehouseRead)]
    public async Task<IActionResult> GetByBarcode(string barcode, CancellationToken ct)
    {
        var pkg = await packageService.GetByBarcodeAsync(barcode, ct);
        return Ok(ApiResponse<object>.Ok(pkg));
    }

    // GET /api/packages/{id}/tracking
    [HttpGet("{id:guid}/tracking")]
    [Authorize(Policy = Permissions.WarehouseRead)]
    public async Task<IActionResult> GetTracking(Guid id, CancellationToken ct)
    {
        var events = await packageService.GetTrackingAsync(id, ct);
        return Ok(ApiResponse<object>.Ok(events));
    }

    // POST /api/packages/{id}/images
    [HttpPost("{id:guid}/images")]
    [Authorize(Policy = Permissions.WarehouseManage)]
    public async Task<IActionResult> UploadImage(Guid id, [FromBody] UploadPackageImageRequest req, CancellationToken ct)
    {
        var result = await packageService.UploadImageAsync(CurrentUserId, req with { PackageId = id }, ct);
        return Ok(ApiResponse<object>.Ok(result, "Tải ảnh thành công."));
    }
}

// ── Package tracking (Customer) ───────────────────────────────────────────────
[Route("api/my/packages")]
public class MyPackagesController(IPackageService packageService) : Module2BaseController
{
    // GET /api/my/packages
    [HttpGet]
    [Authorize(Policy = Permissions.OrderRead)]
    public async Task<IActionResult> GetMyPackages(CancellationToken ct)
    {
        var list = await packageService.GetByCustomerAsync(CurrentUserId, ct);
        return Ok(ApiResponse<object>.Ok(list));
    }

    // GET /api/my/packages/{id}/tracking
    [HttpGet("{id:guid}/tracking")]
    [Authorize(Policy = Permissions.OrderRead)]
    public async Task<IActionResult> GetTracking(Guid id, CancellationToken ct)
    {
        var events = await packageService.GetTrackingAsync(id, ct);
        return Ok(ApiResponse<object>.Ok(events));
    }
}
