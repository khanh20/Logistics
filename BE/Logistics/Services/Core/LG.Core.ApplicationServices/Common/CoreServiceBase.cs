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
                using var command = _dbContext.Database.GetDbConnection().CreateCommand();
                command.CommandText = @"
                    INSERT INTO auth.notifications 
                    (""Id"", ""UserId"", ""Title"", ""Content"", ""Type"", ""ReferenceType"", ""ReferenceId"", ""IsRead"", ""CreatedAt"")
                    VALUES (@id, @userId, @title, @content, @type, @refType, @refId, false, @createdAt)";
                
                var paramId = command.CreateParameter(); paramId.ParameterName = "@id"; paramId.Value = Guid.NewGuid(); command.Parameters.Add(paramId);
                var paramUserId = command.CreateParameter(); paramUserId.ParameterName = "@userId"; paramUserId.Value = userId; command.Parameters.Add(paramUserId);
                var paramTitle = command.CreateParameter(); paramTitle.ParameterName = "@title"; paramTitle.Value = title; command.Parameters.Add(paramTitle);
                var paramContent = command.CreateParameter(); paramContent.ParameterName = "@content"; paramContent.Value = content; command.Parameters.Add(paramContent);
                var paramType = command.CreateParameter(); paramType.ParameterName = "@type"; paramType.Value = type; command.Parameters.Add(paramType);
                var paramRefType = command.CreateParameter(); paramRefType.ParameterName = "@refType"; paramRefType.Value = (object?)referenceType ?? DBNull.Value; command.Parameters.Add(paramRefType);
                var paramRefId = command.CreateParameter(); paramRefId.ParameterName = "@refId"; paramRefId.Value = (object?)referenceId ?? DBNull.Value; command.Parameters.Add(paramRefId);
                var paramCreatedAt = command.CreateParameter(); paramCreatedAt.ParameterName = "@createdAt"; paramCreatedAt.Value = DateTime.UtcNow; command.Parameters.Add(paramCreatedAt);
                
                await _dbContext.Database.OpenConnectionAsync();
                await command.ExecuteNonQueryAsync();
            }
            catch (Exception)
            {
                // Silently fail if notification DB is unavailable to not block main transaction
            }
            finally
            {
                await _dbContext.Database.CloseConnectionAsync();
            }
        }
    }
}
