namespace LG.Authentication.Domain.Exceptions;

public abstract class DomainException(string message, string code) : Exception(message)
{
    public string Code { get; } = code;
}

public class NotFoundException(string entity, object id)
    : DomainException($"{entity} with id '{id}' was not found.", "NOT_FOUND");

public class ConflictException(string message)
    : DomainException(message, "CONFLICT");

public class UnauthorizedException(string message = "Unauthorized.")
    : DomainException(message, "UNAUTHORIZED");

public class ForbiddenException(string message = "Access denied.")
    : DomainException(message, "FORBIDDEN");

public class ValidationException(string message)
    : DomainException(message, "VALIDATION");

public class InvalidTokenException(string message = "Token is invalid or expired.")
    : DomainException(message, "INVALID_TOKEN");

public class AccountLockedException(string message = "Account is banned or suspended.")
    : DomainException(message, "ACCOUNT_LOCKED");
