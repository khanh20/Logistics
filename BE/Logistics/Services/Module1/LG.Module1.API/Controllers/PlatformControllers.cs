using LG.Module1.ApplicationServices.DTOs.Platform;
using LG.Module1.ApplicationServices.Interfaces;
using LG.Shared.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LG.Module1.API.Controllers;

[Route("api/platforms")]
public class PlatformController(IPlatformService platformService) : Module1BaseController
{

    /// Danh sách tất cả platform (kể cả inactive).
    [HttpGet]
    [Authorize(Policy = Permissions.PlatformManage)]
    [ProducesResponseType(typeof(ApiResponse<List<PlatformResponse>>), 200)]
    [ProducesResponseType(401)]
    [ProducesResponseType(403)]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var result = await platformService.GetAllAsync(ct);
        return Ok(ApiResponse<List<PlatformResponse>>.Ok(result));
    }

    /// Danh sách platform đang active (slim — không có count).
    [HttpGet("active")]
    [Authorize(Policy = Permissions.PlatformRead)]
    [ProducesResponseType(typeof(ApiResponse<List<PlatformSlimResponse>>), 200)]
    [ProducesResponseType(401)]
    [ProducesResponseType(403)]
    public async Task<IActionResult> GetActive(CancellationToken ct)
    {
        var result = await platformService.GetAllActiveAsync(ct);
        return Ok(ApiResponse<List<PlatformSlimResponse>>.Ok(result));
    }

    /// Chi tiết một platform.
    [HttpGet("{id:guid}")]
    [Authorize(Policy = Permissions.PlatformManage)]
    [ProducesResponseType(typeof(ApiResponse<PlatformResponse>), 200)]
    [ProducesResponseType(401)]
    [ProducesResponseType(403)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var result = await platformService.GetByIdAsync(id, ct);
        return Ok(ApiResponse<PlatformResponse>.Ok(result));
    }

    /// Tạo platform mới.
    [HttpPost]
    [Authorize(Policy = Permissions.PlatformManage)]
    [ProducesResponseType(typeof(ApiResponse<PlatformResponse>), 201)]
    [ProducesResponseType(400)]
    [ProducesResponseType(401)]
    [ProducesResponseType(403)]
    public async Task<IActionResult> Create([FromBody] CreatePlatformRequest req, CancellationToken ct)
    {
        var result = await platformService.CreateAsync(req, ct);
        return StatusCode(201, ApiResponse<PlatformResponse>.Ok(result, "Platform đã được tạo."));
    }

    /// Cập nhật thông tin platform (không bao gồm ApiKey/Secret).
    [HttpPut("{id:guid}")]
    [Authorize(Policy = Permissions.PlatformManage)]
    [ProducesResponseType(typeof(ApiResponse<PlatformResponse>), 200)]
    [ProducesResponseType(400)]
    [ProducesResponseType(401)]
    [ProducesResponseType(403)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdatePlatformRequest req, CancellationToken ct)
    {
        var result = await platformService.UpdateAsync(id, req, ct);
        return Ok(ApiResponse<PlatformResponse>.Ok(result, "Platform đã cập nhật."));
    }

    /// Cập nhật ApiKey/ApiSecret cho platform (encrypted trước khi lưu).
    /// Response KHÔNG trả key/secret về client.
    [HttpPut("{id:guid}/credentials")]
    [Authorize(Policy = Permissions.PlatformManage)]
    [ProducesResponseType(200)]
    [ProducesResponseType(400)]
    [ProducesResponseType(401)]
    [ProducesResponseType(403)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> SetCredentials(Guid id, [FromBody] SetCredentialsRequest req, CancellationToken ct)
    {
        await platformService.SetCredentialsAsync(id, req, ct);
        return Ok(ApiResponse.Ok("Credentials đã được cập nhật và mã hóa."));
    }
}


[Route("api/platforms/{platformId:guid}/shops")]
public class PlatformShopsController(IPlatformService platformService) : Module1BaseController
{
    /// Danh sách shop của một platform.
    [HttpGet]
    [Authorize(Policy = Permissions.PlatformRead)]
    [ProducesResponseType(typeof(ApiResponse<List<PlatformShopResponse>>), 200)]
    [ProducesResponseType(401)]
    [ProducesResponseType(403)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetByPlatform(Guid platformId, CancellationToken ct)
    {
        var result = await platformService.GetShopsByPlatformAsync(platformId, ct);
        return Ok(ApiResponse<List<PlatformShopResponse>>.Ok(result));
    }

    /// Chi tiết một shop.
    [HttpGet("{shopId:guid}")]
    [Authorize(Policy = Permissions.PlatformRead)]
    [ProducesResponseType(typeof(ApiResponse<PlatformShopResponse>), 200)]
    [ProducesResponseType(401)]
    [ProducesResponseType(403)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetShop(Guid platformId, Guid shopId, CancellationToken ct)
    {
        var result = await platformService.GetShopByIdAsync(shopId, ct);
        return Ok(ApiResponse<PlatformShopResponse>.Ok(result));
    }

    /// Blacklist một shop — chặn đặt hàng từ shop này.
    [HttpPost("{shopId:guid}/blacklist")]
    [Authorize(Policy = Permissions.PlatformManage)]
    [ProducesResponseType(200)]
    [ProducesResponseType(400)]
    [ProducesResponseType(401)]
    [ProducesResponseType(403)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Blacklist(
        Guid platformId, Guid shopId,
        [FromBody] BlacklistShopRequest req,
        CancellationToken ct)
    {
        await platformService.BlacklistShopAsync(shopId, req, CurrentUserId, ct);
        return Ok(ApiResponse.Ok("Shop đã bị blacklist."));
    }

    /// Gỡ blacklist shop.
    [HttpDelete("{shopId:guid}/blacklist")]
    [Authorize(Policy = Permissions.PlatformManage)]
    [ProducesResponseType(200)]
    [ProducesResponseType(401)]
    [ProducesResponseType(403)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Unblacklist(Guid platformId, Guid shopId, CancellationToken ct)
    {
        await platformService.UnblacklistShopAsync(shopId, ct);
        return Ok(ApiResponse.Ok("Shop đã được gỡ blacklist."));
    }

    /// Cập nhật rating nội bộ của shop (NV đánh giá sau khi giao dịch).
    [HttpPatch("{shopId:guid}/rating")]
    [Authorize(Policy = Permissions.PlatformManage)]
    [ProducesResponseType(200)]
    [ProducesResponseType(401)]
    [ProducesResponseType(403)]
    public async Task<IActionResult> UpdateRating(
        Guid platformId, Guid shopId,
        [FromQuery] decimal rating,
        CancellationToken ct)
    {
        await platformService.UpdateShopRatingAsync(shopId, rating, ct);
        return Ok(ApiResponse.Ok($"Rating shop cập nhật: {rating}/5."));
    }
}


[Route("api/platforms/{platformId:guid}/accounts")]
public class PlatformAccountsController(IPlatformService platformService) : Module1BaseController
{
    /// Danh sách account của một platform.
    [HttpGet]
    [Authorize(Policy = Permissions.PlatformManage)]
    [ProducesResponseType(typeof(ApiResponse<List<PlatformAccountSummaryResponse>>), 200)]
    [ProducesResponseType(401)]
    [ProducesResponseType(403)]
    public async Task<IActionResult> GetAccounts(Guid platformId, CancellationToken ct)
    {
        var result = await platformService.GetAccountsByPlatformAsync(platformId, ct);
        return Ok(ApiResponse<List<PlatformAccountSummaryResponse>>.Ok(result));
    }

    /// Lấy account còn capacity để đặt hàng (dùng nội bộ, staff không cần biết).
    [HttpGet("available")]
    [Authorize(Policy = Permissions.PlatformManage)]
    [ProducesResponseType(typeof(ApiResponse<PlatformAccountSummaryResponse>), 200)]
    [ProducesResponseType(401)]
    [ProducesResponseType(403)]
    public async Task<IActionResult> GetAvailable(
        Guid platformId,
        [FromQuery] decimal requiredAmountCny = 0,
        CancellationToken ct = default)
    {
        var result = await platformService.GetAvailableAccountAsync(platformId, requiredAmountCny, ct);
        if (result is null)
            return Ok(ApiResponse<PlatformAccountSummaryResponse?>.Ok(null,
                "Không có account nào còn capacity hôm nay."));
        return Ok(ApiResponse<PlatformAccountSummaryResponse?>.Ok(result));
    }

    /// Thêm account mua hàng mới. Password được encrypt tự động.
    [HttpPost]
    [Authorize(Policy = Permissions.PlatformManage)]
    [ProducesResponseType(typeof(ApiResponse<PlatformAccountSummaryResponse>), 201)]
    [ProducesResponseType(400)]
    [ProducesResponseType(401)]
    [ProducesResponseType(403)]
    public async Task<IActionResult> Create(
        Guid platformId,
        [FromBody] CreatePlatformAccountRequest req,
        CancellationToken ct)
    {
        // platformId lấy từ route, override giá trị trong body nếu có
        var fixedReq = req with { PlatformId = platformId };
        var result = await platformService.CreateAccountAsync(fixedReq, ct);
        return StatusCode(201, ApiResponse<PlatformAccountSummaryResponse>.Ok(result, "Account đã được tạo."));
    }

    /// Freeze account (ngừng dùng tạm thời). Quyền: Admin.
    [HttpPost("{accountId:guid}/freeze")]
    [Authorize(Policy = Permissions.PlatformManage)]
    [ProducesResponseType(200)]
    [ProducesResponseType(401)]
    [ProducesResponseType(403)]
    public async Task<IActionResult> Freeze(Guid platformId, Guid accountId, CancellationToken ct)
    {
        await platformService.FreezeAccountAsync(accountId, ct);
        return Ok(ApiResponse.Ok("Account đã bị freeze."));
    }

    /// Unfreeze account. Quyền: Admin.
    [HttpPost("{accountId:guid}/unfreeze")]
    [Authorize(Policy = Permissions.PlatformManage)]
    [ProducesResponseType(200)]
    [ProducesResponseType(401)]
    [ProducesResponseType(403)]
    public async Task<IActionResult> Unfreeze(Guid platformId, Guid accountId, CancellationToken ct)
    {
        await platformService.UnfreezeAccountAsync(accountId, ct);
        return Ok(ApiResponse.Ok("Account đã được unfreeze."));
    }

    /// Cập nhật số dư Alipay (đồng bộ thủ công). Quyền: Admin.
    [HttpPatch("{accountId:guid}/balance")]
    [Authorize(Policy = Permissions.PlatformManage)]
    [ProducesResponseType(200)]
    [ProducesResponseType(401)]
    [ProducesResponseType(403)]
    public async Task<IActionResult> UpdateBalance(
        Guid platformId, Guid accountId,
        [FromBody] UpdateAccountBalanceRequest req,
        CancellationToken ct)
    {
        await platformService.UpdateBalanceAsync(accountId, req, ct);
        return Ok(ApiResponse.Ok($"Số dư cập nhật: {req.AlipayBalance} CNY."));
    }
}