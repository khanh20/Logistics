

using LG.Untils.Linq;

namespace LG.ApplicationBase.Common
{
    /// <summary>
    /// Phân trang
    /// </summary>
    public static class PagingExtension
    {
        public static class PagingParameter
        {
            public const int DefaultPageSize = -1;
        }
        public static IQueryable<T> Paging<T>(this IQueryable<T> query, PagingRequestBaseDto input)
        {
            if (input.PageSize != PagingParameter.DefaultPageSize)
            {
                query = query.Skip(input.GetSkip()).Take(input.PageSize);
            }
            return query;
        }

        /// <summary>
        /// Phân trang có sort
        /// </summary>
        /// <typeparam name="T"></typeparam>
        /// <param name="query"></param>
        /// <param name="input"></param>
        /// <returns></returns>
        public static IQueryable<T> PagingAndSorting<T>(this IQueryable<T> query, PagingRequestBaseDto input) where T : class
        {
            query = query.OrderDynamic(input.Sort);
            query = query.Paging(input);
            return query;
        }
    }
}
