using System;

namespace LG.Core.Domain.Exceptions
{
    public class CoreException : Exception
    {
        public int ErrorCode { get; }
        public int StatusCode { get; }
        public object[] Parameters { get; }

        public CoreException(int errorCode, int statusCode = 400, params object[] parameters)
            : base($"Core error {errorCode}")
        {
            ErrorCode = errorCode;
            StatusCode = statusCode;
            Parameters = parameters;
        }
    }
}
