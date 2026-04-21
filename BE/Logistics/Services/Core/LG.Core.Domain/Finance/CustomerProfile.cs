using LG.Shared.Constants.Common.Database;
using LG.Untils.Enum.EnumFinance;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;

namespace LG.Core.Domain.finance
{

    [Table(nameof(CustomerProfile), Schema = DbSchemas.LGFinance)]
    public class CustomerProfile
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid Id { get; set; }

        [Required]
        public Guid UserId { get; set; }

        [Required]
        [MaxLength(30)]
        public string CustomerCode { get; set; }

        public Guid? VipTierId { get; set; }

        [Required]
        [MaxLength(255)]
        public string? FullName { get; set; }

        public DateTime? DateOfBirth { get; set; }

        public Gender? Gender { get; set; }

        public PreferredChannel PreferredChannel { get; set; } = PreferredChannel.zalo;

        [MaxLength(100)]
        public string? ZaloUserId { get; set; }

        [MaxLength(20)]
        public string? ReferralCode { get; set; }

        public Guid? ReferredById { get; set; }

        public decimal LifetimeValueVnd { get; set; } = 0;

        public int TotalOrders { get; set; } = 0;

        public DateTime? LastOrderAt { get; set; }

        [Required]
        public DateTime CreatedAt { get; set; }

        public DateTime? UpdatedAt { get; set; }
    }
}
