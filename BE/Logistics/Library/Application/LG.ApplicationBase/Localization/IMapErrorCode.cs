namespace LG.ApplicationBase.MapError
{
    public interface IMapErrorCode
    {
        /// <summary>
        /// Lấy error message
        /// </summary>
        /// <param name="errorCode"></param>
        /// <returns></returns>
        string GetErrorMessage(int errorCode);

        /// <summary>
        /// Lấy message key cho error code
        /// </summary>
        /// <param name="errorCode"></param>
        /// <returns></returns>
        /// <exception cref="InvalidOperationException"></exception>
        string GetErrorMessageKey(int errorCode);
    }
}
