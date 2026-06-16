using LG.ApplicationBase.Localization;
using Microsoft.AspNetCore.Http;

namespace LG.Shared.Common.Localization
{
    public class LGLocalization : LocalizationBase
    {
        public LGLocalization(IHttpContextAccessor httpContextAccessor) : base(httpContextAccessor)
        {
            LoadDictionary("LG.Shared.Common.Localization.SourceFiles");
        }
    }
}
