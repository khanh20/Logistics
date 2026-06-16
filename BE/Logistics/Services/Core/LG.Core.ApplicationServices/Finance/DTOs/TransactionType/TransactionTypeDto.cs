using LG.Untils.EnumFinance;
using System;

namespace LG.Core.ApplicationServices.Finance.DTOs.TransactionType
{
    public class TransactionTypeDto
    {
        public Guid Id { get; set; }
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public TransactionDirectionEnum? Direction { get; set; }
        public bool IsReversible { get; set; }
    }
}
