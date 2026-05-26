namespace LG.Shared.Constants;

public class ApiResponse<T>
{
    public bool   Success { get; init; }
    public string Message { get; init; } = string.Empty;
    public T?     Data    { get; init; }
    public string? ErrorCode { get; init; }

    public static ApiResponse<T> Ok(T data, string message = "Success") =>
        new() { Success = true, Message = message, Data = data };

    public static ApiResponse<T> Fail(string message, string? code = null) =>
        new() { Success = false, Message = message, ErrorCode = code };
}

public static class ApiResponse
{
    public static ApiResponse<object?> Ok(string message = "Success") =>
        new() { Success = true, Message = message };

    public static ApiResponse<object?> Fail(string message, string? code = null) =>
        new() { Success = false, Message = message, ErrorCode = code };
}
