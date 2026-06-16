using LG.ApplicationBase.Localization;
using LG.ApplicationBase.MapError;
using LG.Shared.Constants.ErrorCodes;
using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LG.Core.ApplicationServices.Common
{
    public class CoreMapErrorCode : MapErrorCodeBase<CoreErrorCode>
    {
        public CoreMapErrorCode(LocalizationBase localization, IHttpContextAccessor httpContext) : base(localization, httpContext)
        {
        }
    }
}
