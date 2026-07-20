using LG.Module1.Domain.Entities;

namespace LG.Module1.ApplicationServices.Common;

public static class RankingHelpers
{
    // Sắp items theo thứ tự id bên ngoài trả về; phần tử bị bỏ sót được nối cuối (không mất hàng).
    public static List<ProductMaster> ReorderByIds(IReadOnlyList<ProductMaster> items, IReadOnlyList<Guid> order)
    {
        var byId = items.ToDictionary(p => p.Id);
        var seen = new HashSet<Guid>();
        var result = new List<ProductMaster>(items.Count);
        foreach (var id in order)
            if (byId.TryGetValue(id, out var p) && seen.Add(id)) result.Add(p);
        foreach (var p in items)
            if (seen.Add(p.Id)) result.Add(p);
        return result;
    }
}
