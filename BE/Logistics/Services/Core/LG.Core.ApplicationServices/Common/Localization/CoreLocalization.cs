using LG.ApplicationBase.Localization;
using LG.Shared.Common.Localization;
using Microsoft.AspNetCore.Http;

namespace LG.Core.ApplicationServices.Common.Localization
{
    public class CoreLocalization : LGLocalization
    {
        public CoreLocalization(IHttpContextAccessor httpContextAccessor) : base(httpContextAccessor)
        {
            LoadDictionary("LG.Core.ApplicationServices.Common.Localization.SourceFiles");
        }
    }
}
