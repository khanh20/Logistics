using System.Text.Json;
using LG.Module1.ApplicationServices.DTOs.Staff;
using LG.Module1.ApplicationServices.Interfaces;
using LG.Module1.Domain.Adapters;
using LG.Module1.Domain.Entities;
using LG.Module1.Domain.Exceptions;
using LG.Module1.Domain.Repositories;

namespace LG.Module1.ApplicationServices.Services;

// ── ComplaintService — khiếu nại khách + xử lý CSKH ──────────────────────────
public class ComplaintService(
    IOrderComplaintRepository complaintRepo,
    ICustomerOrderRepository  orderRepo,
    IStaffDirectoryService    directory,
    IStaffNotifier            notifier,
    IModule1UnitOfWork        uow
) : IComplaintService
{
    public async Task<ComplaintResponse> SubmitAsync(Guid customerId, Guid orderId,
        SubmitComplaintRequest req, CancellationToken ct = default)
    {
        var order = await orderRepo.GetByIdAsync(orderId, ct)
                    ?? throw new OrderNotFoundException(orderId);
        if (order.CustomerId != customerId)
            throw new UnauthorizedAccessException("Đơn hàng không thuộc về khách hàng này.");

        if (!Enum.TryParse<ComplaintType>(req.Type, ignoreCase: true, out var type))
            type = ComplaintType.Other;

        var evidenceJson = req.EvidenceUrls is { Count: > 0 }
            ? JsonSerializer.Serialize(req.EvidenceUrls)
            : null;

        var complaint = OrderComplaint.Create(orderId, customerId, type, req.Description,
            req.OrderItemId, evidenceJson);

        await complaintRepo.AddAsync(complaint, ct);
        await uow.SaveChangesAsync(ct);

        return MapToResponse(complaint, order.OrderCode, null);
    }

    public async Task<List<ComplaintResponse>> GetByOrderForCustomerAsync(Guid customerId, Guid orderId,
        CancellationToken ct = default)
    {
        var order = await orderRepo.GetByIdAsync(orderId, ct)
                    ?? throw new OrderNotFoundException(orderId);
        if (order.CustomerId != customerId)
            throw new UnauthorizedAccessException("Đơn hàng không thuộc về khách hàng này.");

        var list = await complaintRepo.GetByOrderAsync(orderId, ct);
        return list.Select(c => MapToResponse(c, order.OrderCode, null)).ToList();
    }

    public async Task<(List<ComplaintResponse> Items, int TotalCount)> GetQueueAsync(
        ComplaintStatus? status, Guid? assignedToStaffId, int page, int pageSize, CancellationToken ct = default)
    {
        var (items, total) = await complaintRepo.SearchAsync(status, assignedToStaffId, null, page, pageSize, ct);
        var staffIds = items.Where(c => c.AssignedToStaffId.HasValue).Select(c => c.AssignedToStaffId!.Value);
        var names    = await SafeResolveAsync(staffIds, ct);
        var result   = items.Select(c => MapToResponse(c, c.Order?.OrderCode ?? "—",
            c.AssignedToStaffId.HasValue ? names.GetValueOrDefault(c.AssignedToStaffId.Value)?.FullName : null)).ToList();
        return (result, total);
    }

    public async Task<ComplaintResponse> AssignAsync(Guid complaintId, Guid staffId, CancellationToken ct = default)
    {
        var complaint = await complaintRepo.GetByIdAsync(complaintId, ct)
                        ?? throw new ComplaintNotFoundException(complaintId);
        complaint.AssignTo(staffId);
        await complaintRepo.UpdateAsync(complaint, ct);
        await uow.SaveChangesAsync(ct);

        await SafeNotifyAsync(staffId, StaffNotificationType.ComplaintAssigned,
            "Khiếu nại được phân công",
            $"Bạn được phân công xử lý khiếu nại đơn {complaint.Order?.OrderCode ?? "—"}.",
            complaint.OrderId, ct);

        return MapToResponse(complaint, complaint.Order?.OrderCode ?? "—", null);
    }

    public async Task<ComplaintResponse> ResolveAsync(Guid complaintId, Guid staffId,
        ResolveComplaintRequest req, CancellationToken ct = default)
    {
        var complaint = await complaintRepo.GetByIdAsync(complaintId, ct)
                        ?? throw new ComplaintNotFoundException(complaintId);
        complaint.Resolve(staffId, req.Resolution, req.ResolvedAmountVnd);
        await complaintRepo.UpdateAsync(complaint, ct);
        await uow.SaveChangesAsync(ct);
        return MapToResponse(complaint, complaint.Order?.OrderCode ?? "—", null);
    }

    public async Task<ComplaintResponse> RejectAsync(Guid complaintId, Guid staffId,
        RejectComplaintRequest req, CancellationToken ct = default)
    {
        var complaint = await complaintRepo.GetByIdAsync(complaintId, ct)
                        ?? throw new ComplaintNotFoundException(complaintId);
        complaint.Reject(staffId, req.Reason);
        await complaintRepo.UpdateAsync(complaint, ct);
        await uow.SaveChangesAsync(ct);
        return MapToResponse(complaint, complaint.Order?.OrderCode ?? "—", null);
    }

    private async Task<IReadOnlyDictionary<Guid, StaffDirectoryEntry>> SafeResolveAsync(
        IEnumerable<Guid> ids, CancellationToken ct)
    {
        try { return await directory.ResolveAsync(ids, ct); }
        catch { return new Dictionary<Guid, StaffDirectoryEntry>(); }
    }

    private async Task SafeNotifyAsync(Guid staffId, StaffNotificationType type, string title,
        string body, Guid? refOrderId, CancellationToken ct)
    {
        try { await notifier.NotifyAsync(staffId, type, title, body, refOrderId, ct); }
        catch { /* không để notify fail làm vỡ flow */ }
    }

    private static ComplaintResponse MapToResponse(OrderComplaint c, string orderCode, string? assignedName)
    {
        var evidence = new List<string>();
        if (!string.IsNullOrWhiteSpace(c.EvidenceUrls))
        {
            try { evidence = JsonSerializer.Deserialize<List<string>>(c.EvidenceUrls) ?? []; }
            catch { /* ignore malformed */ }
        }

        return new ComplaintResponse(
            Id:                  c.Id,
            OrderId:             c.OrderId,
            OrderCode:           orderCode,
            OrderItemId:         c.OrderItemId,
            CustomerId:          c.CustomerId,
            Type:                c.Type.ToString(),
            Description:         c.Description,
            EvidenceUrls:        evidence,
            Status:              c.Status.ToString(),
            AssignedToStaffId:   c.AssignedToStaffId,
            AssignedToStaffName: assignedName,
            Resolution:          c.Resolution,
            ResolvedAmountVnd:   c.ResolvedAmountVnd,
            CreatedAt:           c.CreatedAt,
            ResolvedAt:          c.ResolvedAt
        );
    }
}

// ── SupplierChatLogService ────────────────────────────────────────────────────
public class SupplierChatLogService(
    ISupplierChatLogRepository repo,
    IModule1UnitOfWork         uow
) : ISupplierChatLogService
{
    public async Task<List<SupplierChatLogDto>> GetByOrderAsync(Guid orderId, CancellationToken ct = default)
    {
        var list = await repo.GetByOrderAsync(orderId, ct);
        return list.Select(MapToDto).ToList();
    }

    public async Task<SupplierChatLogDto> AddAsync(Guid orderId, Guid staffId, AddSupplierChatRequest req,
        CancellationToken ct = default)
    {
        var direction = Enum.TryParse<ChatDirection>(req.Direction, ignoreCase: true, out var d)
            ? d : ChatDirection.Sent;
        var log = SupplierChatLog.Create(orderId, staffId, direction, req.Message,
            req.ScreenshotUrl, req.PlatformChatTool);
        await repo.AddAsync(log, ct);
        await uow.SaveChangesAsync(ct);
        return MapToDto(log);
    }

    private static SupplierChatLogDto MapToDto(SupplierChatLog l) => new(
        l.Id, l.OrderId, l.StaffId, l.Direction.ToString(), l.Message,
        l.ScreenshotUrl, l.PlatformChatTool, l.SentAt);
}
