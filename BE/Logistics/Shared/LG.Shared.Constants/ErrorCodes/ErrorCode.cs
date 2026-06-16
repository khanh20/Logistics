using LG.EntitiesBase;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LG.Shared.Constants.ErrorCodes
{
    public class ErrorCode : IErrorCode
    {
        protected ErrorCode()
        {
        }

        //Các mã lỗi căn bản
        public const int System = 1;
        public const int BadRequest = 400;
        public const int Unauthorized = 401;
        public const int NotFound = 404;
        public const int InternalServerError = 500;
        public const int CaptchaInvalid = 501;
        public const int CandidateLoginInvalid = 502;

        // Authentication 1xxx
        public const int UsernameOrPasswordIncorrect = 1000;
        public const int UserNotFound = 1001;
        public const int RoleNotFound = 1002;
        public const int UserIsDeactive = 1003;
        public const int InvalidUserType = 1004;
        public const int UserOldPasswordIncorrect = 1005;
        public const int UserNotHavePermission = 1006;
        public const int UsernameHasBeenUsed = 1007;
        public const int UserStatusIsInvalid = 1008;
        public const int OptCodeNotValid = 1009;
        public const int OptCodeIsExpired = 1010;
        public const int UserIsLock = 1011;
        public const int SysVarsIsNotConfig = 1012;
        public const int RoleNameExist = 1013;

        // Image && File 2xxx
        public const int FileNotFound = 2000;
        public const int FileMaxLength = 2001;
        public const int FileExtention = 2002;

    }
}
