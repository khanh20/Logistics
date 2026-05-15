using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LG.Shared.Constants.ErrorCodes
{
    public class CoreErrorCode : ErrorCode
    {
        protected CoreErrorCode() : base()
        {
        }

        //public const int <Tên Error> = <giá trị>;
        public const int CoreCustomerNotFound = 4000;
        public const int CoreTransactionBankNotFoundOrInactive = 4001;
        public const int CoreWalletFrozen = 4002;
        public const int CoreInsufficientBalance = 4003;
        public const int CoreInvalidReceiveBankAccount = 4004;
        public const int CoreWithdrawRequestNotFoundOrProcessed = 4005;
        public const int CoreWalletNotFound = 4006;

        // Bank Account 401x
        public const int CoreBankAccountNotFound = 4011;
        public const int CoreBankAccountDuplicateNumber = 4012;
        public const int CoreBankAccountInvalidNumberLength = 4013;

        // OCR / Scan ID 402x
        public const int CoreFptAIConfigMissing = 4020;
        public const int CoreFptAIConnectionError = 4021;
        public const int CoreInvalidIdImage = 4022;

        // KYC 403x
        public const int CoreKycNotFound = 4031;
        public const int CoreKycImageRequired = 4032;
        public const int CoreKycInvalidImageType = 4033;
        public const int CoreKycImageTooLarge = 4034;
        public const int CoreKycDataRequired = 4035;
        
        // General Auth/User 404x
        public const int CoreUserIdNotFoundInToken = 4041;
        public const int CoreInvalidUserIdInToken = 4042;

        // Transaction Type 405x
        public const int CoreTransactionTypeCodeExists = 4051;
        public const int CoreTransactionTypeUsedInTransactions = 4052;
        public const int CoreTransactionTypeConfigMissing = 4053;
           


    }
}
