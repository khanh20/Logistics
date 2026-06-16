using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LG.Untils.EnumFinance
{
    public enum WithdrawStatusEnum
    {
        Pending = 1,
        Approved = 2,
        Processing = 3,
        Completed = 4,
        Rejected = 5,
        Cancelled = 6
    }
}
