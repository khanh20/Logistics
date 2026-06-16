using LG.Shared.Constants;
using Microsoft.AspNetCore.Http;
using System;
using System.Security.Claims;

namespace LG.Shared.Common
{
    public static class HttpContextExtensions
    {
        private static Claim FindClaim(this ClaimsIdentity? claims, string claimType)
        {
            return claims?.FindFirst(claimType) 
                   ?? throw new InvalidOperationException($"Claim \"{claimType}\" not found.");
        }

        public static Guid GetCurrentUserId(this IHttpContextAccessor httpContextAccessor)
        {
            var claims = httpContextAccessor.HttpContext?.User?.Identity as ClaimsIdentity;
            var claim = claims.FindClaim(UserClaimTypes.UserId);
            
            if (Guid.TryParse(claim.Value, out var userId))
            {
                return userId;
            }
            throw new InvalidOperationException($"Claim {UserClaimTypes.UserId} is not a valid Guid.");
        }

        public static string GetCurrentUserEmail(this IHttpContextAccessor httpContextAccessor)
        {
            var claims = httpContextAccessor.HttpContext?.User?.Identity as ClaimsIdentity;
            var claim = claims?.FindFirst(UserClaimTypes.Email);
            return claim?.Value ?? string.Empty;
        }

        // ── HttpContext Extensions ──────────────────────────────────────────────────
        
        public static Guid GetCurrentUserId(this HttpContext httpContext)
        {
            var claims = httpContext.User?.Identity as ClaimsIdentity;
            var claim = claims.FindClaim(UserClaimTypes.UserId);
            
            if (Guid.TryParse(claim.Value, out var userId))
            {
                return userId;
            }
            throw new InvalidOperationException($"Claim {UserClaimTypes.UserId} is not a valid Guid.");
        }
    }
}
