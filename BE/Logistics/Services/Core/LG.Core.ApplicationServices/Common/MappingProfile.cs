using AutoMapper;
using LG.Core.ApplicationServices.Finance.DTOs.Customer;
using LG.Core.ApplicationServices.Finance.DTOs.Transaction;
using LG.Core.Domain.Finance;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

using LG.Core.ApplicationServices.Finance.DTOs.Refund;
using LG.Core.ApplicationServices.Finance.DTOs.VipTier;
using LG.Core.ApplicationServices.Finance.DTOs.FeeRule;
using LG.Core.ApplicationServices.Finance.DTOs.Management;
using LG.Core.ApplicationServices.Finance.DTOs.BankAccount;
using LG.Core.ApplicationServices.Finance.DTOs.TransactionType;
using LG.Core.ApplicationServices.Finance.DTOs.CustomerProfile;
using LG.Core.ApplicationServices.Finance.DTOs.CustomerAddress;
using LG.Core.ApplicationServices.Finance.DTOs.WalletTransaction;
using LG.Core.ApplicationServices.Finance.DTOs.PaymentLock;
using LG.Core.ApplicationServices.Finance.DTOs.FraudDetection;
using LG.Core.ApplicationServices.Finance.DTOs.PlatformReconcile;
using LG.Core.ApplicationServices.Finance.DTOs.BankWebhookLog;
using LG.Core.ApplicationServices.Finance.DTOs.EmailNotification;

namespace LG.Core.ApplicationServices.Common
{
    public class MappingProfile : Profile
    {
        public MappingProfile()
        {
            //CreateMap<Source, Destination>();
            CreateMap < CustomerKycDto, CustomerKYC>().ReverseMap();
            CreateMap <TopupResponseDto,TopupRequest>().ReverseMap();
            CreateMap <WithdrawResponseDto, WithdrawRequest>().ReverseMap();
            CreateMap<Wallet, WalletDto>().ReverseMap();

            // TransactionType Mappings
            CreateMap<TransactionType, TransactionTypeDto>().ReverseMap();
            CreateMap<CreateTransactionTypeDto, TransactionType>();
            CreateMap<UpdateTransactionTypeDto, TransactionType>();

            // Refund Mappings
            CreateMap<RefundProcess, RefundDto>().ReverseMap();
            CreateMap<CreateRefundDto, RefundProcess>();

            // VipTier Mappings
            CreateMap<VipTier, VipTierDto>().ReverseMap();
            CreateMap<CreateVipTierDto, VipTier>();

            // FeeRule Mappings
            CreateMap<FeeRule, FeeRuleDto>().ReverseMap();
            CreateMap<CreateFeeRuleDto, FeeRule>();

            // Finance Management Mappings
            CreateMap<CreditLimit, CreditLimitDto>().ReverseMap();
            CreateMap<DebtRecord, DebtRecordDto>().ReverseMap();

            // BankAccount Mappings
            CreateMap<BankAccount, BankAccountDto>().ReverseMap();
            CreateMap<CreateBankAccountDto, BankAccount>();

            // CustomerProfile Mappings
            CreateMap<CustomerProfile, CustomerProfileDto>().ReverseMap();
            CreateMap<CreateCustomerProfileDto, CustomerProfile>();
            CreateMap<UpdateCustomerProfileDto, CustomerProfile>();

            // CustomerAddress Mappings
            CreateMap<CustomerAddress, CustomerAddressDto>().ReverseMap();
            CreateMap<CreateCustomerAddressDto, CustomerAddress>();
            CreateMap<UpdateCustomerAddressDto, CustomerAddress>();

            // WalletTransaction Mappings
            CreateMap<WalletTransaction, WalletTransactionDto>().ReverseMap();

            // PaymentLock Mappings
            CreateMap<PaymentLock, PaymentLockDto>().ReverseMap();
            CreateMap<CreatePaymentLockDto, PaymentLock>();

            // FraudDetection Mappings
            CreateMap<FraudDetection, FraudDetectionDto>().ReverseMap();

            // PlatformReconcile Mappings
            CreateMap<PlatformReconcile, PlatformReconcileDto>().ReverseMap();
            CreateMap<CreatePlatformReconcileDto, PlatformReconcile>();

            // BankWebhookLog Mappings
            CreateMap<BankWebhookLog, BankWebhookLogDto>().ReverseMap();

            // EmailNotification Mappings
            CreateMap<EmailNotification, EmailNotificationDto>().ReverseMap();
            CreateMap<SendEmailNotificationDto, EmailNotification>();
        }
    }
}
