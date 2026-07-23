using LG.Module1.ApplicationServices.DTOs.Staff;
using LG.Module1.ApplicationServices.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace LG.Module1.API.Hubs;

[Authorize]
public class StaffNotificationHub : Hub
{
}

public class SignalRStaffNotificationPusher(IHubContext<StaffNotificationHub> hubContext) : IStaffNotificationPusher
{
    public async Task PushToStaffAsync(Guid staffId, StaffNotificationDto notification, CancellationToken ct = default)
    {
        await hubContext.Clients.User(staffId.ToString()).SendAsync("ReceiveStaffNotification", notification, ct);
    }
}
