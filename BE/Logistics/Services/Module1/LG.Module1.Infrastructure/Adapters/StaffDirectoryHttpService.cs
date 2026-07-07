using System.Net.Http.Json;
using LG.Module1.Domain.Adapters;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;

namespace LG.Module1.Infrastructure.Adapters;

// Gọi sang Auth service để resolve thông tin nhân thân NV (tên/email) theo Id hoặc role.
// Module 1 KHÔNG sở hữu User — đây là cross-module read-only qua X-Internal-Key.
// HttpClient được DI inject với BaseAddress + header sẵn (giống StaffRosterHttpService).
public class StaffDirectoryHttpService(
    HttpClient                       httpClient,
    IMemoryCache                     cache,
    ILogger<StaffDirectoryHttpService> logger
) : IStaffDirectoryService
{
    private static readonly TimeSpan CacheTtl = TimeSpan.FromSeconds(60);

    public async Task<IReadOnlyDictionary<Guid, StaffDirectoryEntry>> ResolveAsync(
        IEnumerable<Guid> ids, CancellationToken ct = default)
    {
        var idList = ids.Distinct().ToList();
        if (idList.Count == 0) return new Dictionary<Guid, StaffDirectoryEntry>();

        var result  = new Dictionary<Guid, StaffDirectoryEntry>();
        var missing = new List<Guid>();

        // Lấy từ cache trước (per-id).
        foreach (var id in idList)
        {
            if (cache.TryGetValue<StaffDirectoryEntry>(CacheKey(id), out var cached) && cached is not null)
                result[id] = cached;
            else
                missing.Add(id);
        }
        if (missing.Count == 0) return result;

        try
        {
            var resp = await httpClient.PostAsJsonAsync("/api/internal/users/by-ids", missing, ct);
            if (resp.IsSuccessStatusCode)
            {
                var items = await resp.Content.ReadFromJsonAsync<List<DirectoryItem>>(cancellationToken: ct) ?? [];
                foreach (var i in items)
                {
                    var entry = new StaffDirectoryEntry(i.Id, i.FullName, i.Email, i.Status ?? "Active");
                    result[i.Id] = entry;
                    cache.Set(CacheKey(i.Id), entry, CacheTtl);
                }
            }
            else
            {
                logger.LogWarning("Directory resolve failed: {Status} from Auth", resp.StatusCode);
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Directory resolve HTTP call to Auth failed");
        }

        return result;
    }

    public async Task<IReadOnlyList<StaffDirectoryEntry>> GetByRoleAsync(
        string role, bool activeOnly = true, CancellationToken ct = default)
    {
        try
        {
            var url  = $"/api/internal/staff-roster?role={Uri.EscapeDataString(role)}&activeOnly={activeOnly}";
            var resp = await httpClient.GetAsync(url, ct);
            if (!resp.IsSuccessStatusCode)
            {
                logger.LogWarning("Directory roster failed: {Status} from Auth", resp.StatusCode);
                return [];
            }

            var items = await resp.Content.ReadFromJsonAsync<List<DirectoryItem>>(cancellationToken: ct) ?? [];
            var list  = items
                .Select(i => new StaffDirectoryEntry(i.Id, i.FullName, i.Email, i.Status ?? "Active"))
                .ToList();

            // Prime cache per-id để ResolveAsync sau dùng lại.
            foreach (var e in list) cache.Set(CacheKey(e.Id), e, CacheTtl);
            return list;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Directory roster HTTP call to Auth failed");
            return [];
        }
    }

    private static string CacheKey(Guid id) => $"staff-dir:{id}";

    // Khớp shape của StaffRosterItemResponse + by-ids (Status có thể null từ roster).
    private record DirectoryItem(Guid Id, string FullName, string Email, string? Status = null);
}
