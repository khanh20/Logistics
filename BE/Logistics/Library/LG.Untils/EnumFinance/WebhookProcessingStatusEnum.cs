using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LG.Untils.EnumFinance
{
    public enum WebhookProcessingStatusEnum
    {
        Pending,
        Matched,
        Unmatched,
        Error,
        Ignored
    }
}
