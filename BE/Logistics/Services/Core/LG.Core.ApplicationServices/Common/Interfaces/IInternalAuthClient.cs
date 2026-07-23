using System;
using System.Threading;
using System.Threading.Tasks;

namespace LG.Core.ApplicationServices.Common.Interfaces
{
    public record SendNotificationRequest(
        Guid UserId,
        string Title,
        string Content,
        string Type,
        string? ReferenceType = null,
        Guid? ReferenceId = null
    );

    public interface IInternalAuthClient
    {
        Task SendCustomerNotificationAsync(SendNotificationRequest req, CancellationToken ct = default);
    }
}
