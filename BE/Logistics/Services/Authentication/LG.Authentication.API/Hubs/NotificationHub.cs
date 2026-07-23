using LG.Authentication.ApplicationServices.DTOs.Support;
using LG.Authentication.ApplicationServices.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace LG.Authentication.API.Hubs;

[Authorize]
public class CustomerNotificationHub : Hub
{
    // Clients connect to this hub and are automatically grouped by their UserId claim
    // Thanks to the default IUserIdProvider which uses ClaimTypes.NameIdentifier
}

public class SignalRCustomerNotificationPusher(IHubContext<CustomerNotificationHub> hubContext) : INotificationPusher
{
    public async Task PushToUserAsync(Guid userId, NotificationResponse notification, CancellationToken ct = default)
    {
        await hubContext.Clients.User(userId.ToString()).SendAsync("ReceiveNotification", notification, ct);
    }
}
