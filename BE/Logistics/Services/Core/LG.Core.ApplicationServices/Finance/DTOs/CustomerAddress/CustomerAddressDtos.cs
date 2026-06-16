using System;
using System.ComponentModel.DataAnnotations;

namespace LG.Core.ApplicationServices.Finance.DTOs.CustomerAddress
{
    public class CustomerAddressDto
    {
        public Guid Id { get; set; }
        public Guid CustomerId { get; set; }
        public string? Label { get; set; }
        public string RecipientName { get; set; }
        public string Phone { get; set; }
        public string AddressLine { get; set; }
        public string? WardCode { get; set; }
        public string? DistrictCode { get; set; }
        public string? ProvinceCode { get; set; }
        public bool IsDefault { get; set; }
        public bool IsActive { get; set; }
        public DateTime? CreatedDate { get; set; }
    }

    public class CreateCustomerAddressDto
    {
        [MaxLength(100)]
        public string? Label { get; set; }

        [Required, MaxLength(255)]
        public string RecipientName { get; set; }

        [Required, MaxLength(20)]
        public string Phone { get; set; }

        [Required]
        public string AddressLine { get; set; }

        [MaxLength(20)]
        public string? WardCode { get; set; }

        [MaxLength(20)]
        public string? DistrictCode { get; set; }

        [MaxLength(20)]
        public string? ProvinceCode { get; set; }

        public bool IsDefault { get; set; } = false;
    }

    public class UpdateCustomerAddressDto
    {
        [MaxLength(100)]
        public string? Label { get; set; }

        [MaxLength(255)]
        public string? RecipientName { get; set; }

        [MaxLength(20)]
        public string? Phone { get; set; }

        public string? AddressLine { get; set; }

        [MaxLength(20)]
        public string? WardCode { get; set; }

        [MaxLength(20)]
        public string? DistrictCode { get; set; }

        [MaxLength(20)]
        public string? ProvinceCode { get; set; }

        public bool? IsDefault { get; set; }
    }
}
