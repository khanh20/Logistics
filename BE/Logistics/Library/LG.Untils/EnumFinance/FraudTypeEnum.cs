using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LG.Untils.EnumFinance
{
    public enum FraudTypeEnum
    {
        MultipleTopupCancel = 1,
        SuspiciousWithdraw = 2,
        AccountTakeover = 3,
        ReferralAbuse = 4,
        VelocityAbuse = 5,
        Other = 6
    }
}
