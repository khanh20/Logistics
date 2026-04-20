using LG.Authentication.API.Filters;
using LG.Authentication.ApplicationServices.DTOs.Role;
using LG.Authentication.ApplicationServices.Interfaces;
using LG.Shared.Constants;
using Microsoft.AspNetCore.Mvc;

namespace LG.Authentication.API.Controllers;

[Route("api/roles")]
public class RolesController(IRoleService roleService) : BaseController
{
    /// Get all roles
    [HttpGet]
    [RequirePermission(Permissions.RoleRead)]
    [ProducesResponseType(typeof(List<RoleResponse>), 200)]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var result = await roleService.GetAllAsync(ct);
        return Ok(result);
    }

    /// Get role by ID
    [HttpGet("{id:guid}")]
    [RequirePermission(Permissions.RoleRead)]
    [ProducesResponseType(typeof(RoleResponse), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var result = await roleService.GetByIdAsync(id, ct);
        return Ok(result);
    }

    /// Get roles of a specific user
    [HttpGet("user/{userId:guid}")]
    [RequirePermission(Permissions.RoleRead)]
    [ProducesResponseType(typeof(List<RoleSlimResponse>), 200)]
    public async Task<IActionResult> GetByUser(Guid userId, CancellationToken ct)
    {
        var result = await roleService.GetByUserAsync(userId, ct);
        return Ok(result);
    }

    /// Create a new role
    [HttpPost]
    [RequirePermission(Permissions.RoleManage)]
    [ProducesResponseType(typeof(RoleResponse), 201)]
    [ProducesResponseType(409)]
    public async Task<IActionResult> Create([FromBody] CreateRoleRequest req, CancellationToken ct)
    {
        var result = await roleService.CreateAsync(req, ct);
        return Created(result, "Role created.");
    }

    /// Update a role (cannot update system roles)
    [HttpPut("{id:guid}")]
    [RequirePermission(Permissions.RoleManage)]
    [ProducesResponseType(typeof(RoleResponse), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateRoleRequest req, CancellationToken ct)
    {
        var result = await roleService.UpdateAsync(id, req, ct);
        return Ok(result, "Role updated.");
    }

    /// Delete a role (cannot delete system roles)
    [HttpDelete("{id:guid}")]
    [RequirePermission(Permissions.RoleManage)]
    [ProducesResponseType(200)]
    [ProducesResponseType(403)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await roleService.DeleteAsync(id, ct);
        return Ok<object?>(null, "Role deleted.");
    }

    /// Assign a role to a user
    [HttpPost("assign")]
    [RequirePermission(Permissions.RoleAssign)]
    [ProducesResponseType(200)]
    public async Task<IActionResult> Assign([FromBody] AssignRoleRequest req, CancellationToken ct)
    {
        await roleService.AssignRoleAsync(req, CurrentUserId, ct);
        return Ok<object?>(null, "Role assigned.");
    }

    /// Remove a role from a user
    [HttpPost("remove")]
    [RequirePermission(Permissions.RoleAssign)]
    [ProducesResponseType(200)]
    public async Task<IActionResult> Remove([FromBody] RemoveRoleRequest req, CancellationToken ct)
    {
        await roleService.RemoveRoleAsync(req, CurrentUserId, ct);
        return Ok<object?>(null, "Role removed.");
    }
}

// ─────────────────────────────────────────────────────────────────────────────

[Route("api/permissions")]
public class PermissionsController(IPermissionService permService) : BaseController
{
    /// Get all permissions in the system
    [HttpGet]
    [RequirePermission(Permissions.PermissionRead)]
    [ProducesResponseType(typeof(List<PermissionResponse>), 200)]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var result = await permService.GetAllAsync(ct);
        return Ok(result);
    }

    /// Get permissions assigned to a role
    [HttpGet("role/{roleId:guid}")]
    [RequirePermission(Permissions.PermissionRead)]
    [ProducesResponseType(typeof(List<PermissionResponse>), 200)]
    public async Task<IActionResult> GetByRole(Guid roleId, CancellationToken ct)
    {
        var result = await permService.GetByRoleAsync(roleId, ct);
        return Ok(result);
    }

    /// Get permissions of a user (union across all roles)
    [HttpGet("user/{userId:guid}")]
    [RequirePermission(Permissions.PermissionRead)]
    [ProducesResponseType(typeof(List<PermissionResponse>), 200)]
    public async Task<IActionResult> GetByUser(Guid userId, CancellationToken ct)
    {
        var result = await permService.GetByUserAsync(userId, ct);
        return Ok(result);
    }

    /// 
    /// Sync (replace) all permissions for a role.
    /// Pass the complete desired set — extras are removed, missing are added.
    /// 
    [HttpPut("role/sync")]
    [RequirePermission(Permissions.PermissionAssign)]
    [ProducesResponseType(200)]
    [ProducesResponseType(403)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> SyncRolePermissions(
        [FromBody] SyncRolePermissionsRequest req, CancellationToken ct)
    {
        await permService.SyncRolePermissionsAsync(req, ct);
        return Ok<object?>(null, "Permissions synced.");
    }
}
