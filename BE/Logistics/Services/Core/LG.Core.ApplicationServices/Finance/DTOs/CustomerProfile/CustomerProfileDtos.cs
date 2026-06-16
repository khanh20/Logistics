using LG.Untils.EnumFinance;
using System;
using System.ComponentModel.DataAnnotations;

namespace LG.Core.ApplicationServices.Finance.DTOs.CustomerProfile
{
    public class CustomerProfileDto
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public string CustomerCode { get; set; }
        public Guid? VipTierId { get; set; }
        public string? FullName { get; set; }
        public DateTime? DateOfBirth { get; set; }
        public Gender? Gender { get; set; }
        public PreferredChannel PreferredChannel { get; set; }
        public string? ZaloUserId { get; set; }
        public string? ReferralCode { get; set; }
        public decimal LifetimeValueVnd { get; set; }
        public int TotalOrders { get; set; }
        public DateTime? CreatedDate { get; set; }
    }

    public class CreateCustomerProfileDto
    {
        [Required, MaxLength(30)]
        public string CustomerCode { get; set; }

        [MaxLength(255)]
        public string? FullName { get; set; }

        public DateTime? DateOfBirth { get; set; }
        public Gender? Gender { get; set; }
        public PreferredChannel PreferredChannel { get; set; } = PreferredChannel.Zalo;

        [MaxLength(100)]
        public string? ZaloUserId { get; set; }
    }

    public class UpdateCustomerProfileDto
    {
        [MaxLength(255)]
        public string? FullName { get; set; }

        public DateTime? DateOfBirth { get; set; }
        public Gender? Gender { get; set; }
        public PreferredChannel? PreferredChannel { get; set; }

        [MaxLength(100)]
        public string? ZaloUserId { get; set; }
    }
}
