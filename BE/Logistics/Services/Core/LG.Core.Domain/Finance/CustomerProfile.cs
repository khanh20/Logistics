using LG.EntitiesBase;
using LG.Shared.Constants.Common.Database;
using LG.Untils.EnumFinance;
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
    public class CustomerProfile : ICreatedBy, IModifiedBy, ISoftDelted
    {
        [Key]
        public int Id { get; set; } 

        [Required]
        public int UserId { get; set; }

        [Required]
        [MaxLength(30)]
        public string CustomerCode { get; set; }

        public int? VipTierId { get; set; }

        [Required]
        [MaxLength(255)]
        public string? FullName { get; set; }

        public DateTime? DateOfBirth { get; set; }

        public Gender? Gender { get; set; }

        public PreferredChannel PreferredChannel { get; set; } = PreferredChannel.Zalo;

        [MaxLength(100)]
        public string? ZaloUserId { get; set; }

        [MaxLength(20)]
        public string? ReferralCode { get; set; }

        public int? ReferredById { get; set; }

        public decimal LifetimeValueVnd { get; set; } = 0;

        public int TotalOrders { get; set; } = 0;

        public DateTime? DeletedDate { get; set; }
        public bool Deleted { get; set; }
        public int? DeletedBy { get; set; }
        public DateTime? CreatedDate { get; set; }
        public int? CreatedBy { get; set; }
        public DateTime? ModifiedDate { get; set; }
        public int? ModifiedBy { get; set; }
    }
}
