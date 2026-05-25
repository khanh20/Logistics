namespace LG.Module2.ApplicationServices.DTOs.Common;

public record PagedResult<T>(List<T> Items, int TotalCount, int Page, int PageSize);
