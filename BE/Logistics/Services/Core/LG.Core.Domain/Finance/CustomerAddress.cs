using LG.Core.Domain.Finance;
using LG.EntitiesBase;
using LG.Shared.Constants.Common.Database;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LG.Core.Domain.Finance
{
    [Table(nameof(CustomerAddress), Schema = DbSchemas.LGFinance)]
    public class CustomerAddress : ICreatedBy, IModifiedBy, ISoftDelted
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid(); 

        [Required]
        public Guid CustomerId { get; set; }

        [MaxLength(100)]
        public string? Label { get; set; } // Nhãn địa chỉ (VD: Nhà riêng, Công ty, ...)

        [Required]
        [MaxLength(255)]
        public string RecipientName { get; set; }   // Tên người nhận hàng

        [Required]
        [MaxLength(20)]
        public string Phone { get; set; }   // Số điện thoại người nhận hàng

        [Required]
        public string AddressLine { get; set; } // Địa chỉ chi tiết (số nhà, tên đường, ...)

        [MaxLength(20)]
        public string? WardCode { get; set; } //Mã phường/xã

        [MaxLength(20)]
        public string? DistrictCode { get; set; } //Mã quận/huyện

        [MaxLength(20)]
        public string? ProvinceCode { get; set; } //Mã tỉnh/thành phố

        public bool IsDefault { get; set; } = false; // Địa chỉ mặc định

        public bool IsActive { get; set; } = true; // Địa chỉ có đang được sử dụng hay không
        public DateTime? DeletedDate { get; set; }
        public bool Deleted { get; set; }
        public Guid? DeletedBy { get; set; }
        public DateTime? CreatedDate { get; set; }
        public Guid? CreatedBy { get; set; }
        public DateTime? ModifiedDate { get; set; }
        public Guid? ModifiedBy { get; set; }
    }
}
