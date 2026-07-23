using CR.ApplicationBase;
using LG.Core.Infrastructure;
using LG.ApplicationBase.Localization;
using LG.ApplicationBase.MapError;
using AutoMapper;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using LG.Shared.Common;
using System;
using System.Threading.Tasks;
using System.Data.Common;
using Microsoft.EntityFrameworkCore;
namespace LG.Core.ApplicationServices.Common
{
    public abstract class CoreServiceBase : ServiceBase<CoreDbContext>
    {
        protected CoreServiceBase(ILogger logger, IHttpContextAccessor httpContext) 
            : base(logger, httpContext)
        {
        }

        protected CoreServiceBase(
            ILogger logger,
            IHttpContextAccessor httpContext,
            CoreDbContext dbContext,
            LocalizationBase localizationBase,
            IMapper mapper
        ) : base(logger, httpContext, dbContext, localizationBase, mapper)
        {
        }

        protected CoreServiceBase(
            ILogger logger,
            IMapErrorCode mapErrorCode,
            IHttpContextAccessor httpContext,
            CoreDbContext dbContext,
            LocalizationBase localizationBase,
            IMapper mapper
        ) : base(logger, mapErrorCode, httpContext, dbContext, localizationBase, mapper)
        {
        }

        protected Guid GetCurrentUserId()
        {
            return _httpContext.GetCurrentUserId();
        }

        protected string? GetCurrentUserFullName()
        {
            return _httpContext.GetCurrentUserFullName();
        }

        protected async Task<string?> GetUserEmailAsync(Guid userId)
        {
            using var command = _dbContext.Database.GetDbConnection().CreateCommand();
            command.CommandText = "SELECT \"Email\" FROM auth.users WHERE \"Id\" = @id";
            
            var param = command.CreateParameter();
            param.ParameterName = "@id";
            param.Value = userId;
            command.Parameters.Add(param);
            
            await _dbContext.Database.OpenConnectionAsync();
            try
            {
                var result = await command.ExecuteScalarAsync();
                return result as string;
            }
            finally
            {
                await _dbContext.Database.CloseConnectionAsync();
            }
        }

        protected async Task CreateWebNotificationAsync(Guid userId, string title, string content, string type, string? referenceType = null, Guid? referenceId = null)
        {
            try
            {
                // Gọi API sang Auth để vừa lưu DB vừa đẩy SignalR
                var authClient = _httpContext.HttpContext?.RequestServices.GetService(typeof(LG.Core.ApplicationServices.Common.Interfaces.IInternalAuthClient)) 
                    as LG.Core.ApplicationServices.Common.Interfaces.IInternalAuthClient;
                
                if (authClient != null)
                {
                    await authClient.SendCustomerNotificationAsync(new LG.Core.ApplicationServices.Common.Interfaces.SendNotificationRequest(
                        UserId: userId,
                        Title: title,
                        Content: content,
                        Type: type,
                        ReferenceType: referenceType,
                        ReferenceId: referenceId
                    ));
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to send web notification for user {UserId}", userId);
            }
        }
    }
}
