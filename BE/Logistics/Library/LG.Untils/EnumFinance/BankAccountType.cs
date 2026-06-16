using System;

namespace LG.Untils.EnumFinance
{
    public enum BankAccountType
    {
        /// <summary>
        /// Tài khoản ngân hàng của Hệ thống (để nhận tiền nạp)
        /// </summary>
        System = 1,

        /// <summary>
        /// Tài khoản ngân hàng cá nhân của Khách hàng (để rút tiền)
        /// </summary>
        Customer = 2
    }
}
