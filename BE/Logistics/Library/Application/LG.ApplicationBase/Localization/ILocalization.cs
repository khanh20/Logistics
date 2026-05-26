namespace LG.ApplicationBase.Localization
{
    public interface ILocalization
    {
        /// <summary>
        /// Dịch từ key name ra message trong file xml
        /// </summary>
        /// <param name="keyName"></param>
        /// <returns></returns>
        string Localize(string keyName);
        /// <summary>
        /// Dịch từ key name ra message trong file xml với list param truyền vào
        /// </summary>
        /// <param name="keyName"></param>
        /// <param name="listParam"></param>
        /// <returns></returns>
        string Localize(string keyName, params string[] listParam);
    }
}
