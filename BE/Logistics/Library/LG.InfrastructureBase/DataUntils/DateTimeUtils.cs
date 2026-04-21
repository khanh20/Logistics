using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LG.InfrastructureBase.DataUntils
{
    public class DateTimeUtils
    {
        public static DateTime? FromDateStrDD_MM_YYYY_ToDate(string? input)
        {
            if (input == null) return null;
            try
            {
                return DateTime.ParseExact(input, "dd/MM/yyyy", System.Globalization.CultureInfo.InvariantCulture);
            }
            catch
            {
                try
                {
                    return DateTime.ParseExact(input, "yyyy", System.Globalization.CultureInfo.InvariantCulture);

                }
                catch (Exception)
                {
                    try
                    {
                        return DateTime.ParseExact(input, "dd/MM/yyy", System.Globalization.CultureInfo.InvariantCulture);
                    }
                    catch
                    {
                        return null;
                    }
                }
            }
        }

        public static DateTime? FromDateStrDD_MM_YY_ToDate(string input)
        {
            try
            {
                return DateTime.ParseExact(input, "dd/MM/yyy", System.Globalization.CultureInfo.InvariantCulture);
            }
            catch
            {
                return null;
            }
        }

        public static DateTime? FromStrToDate(string input)
        {
            try
            {
                return Convert.ToDateTime(input);
            }
            catch (Exception)
            {

                try
                {
                    return DateTime.ParseExact(input, "dd/MM/yyy", System.Globalization.CultureInfo.InvariantCulture);
                }
                catch (Exception)
                {

                    return null;
                }
            }
        }
        public static DateTime GetDate()
        {
            return DateTime.UtcNow.AddHours(7);
        }

        public static string ConvertDateStringVbccNgaySinh(string input)
        {
            if (string.IsNullOrWhiteSpace(input))
                return null;

            if (DateTime.TryParseExact(
                    input,
                    "dd/MM/yyyy",
                    CultureInfo.InvariantCulture,
                    DateTimeStyles.None,
                    out DateTime parsedDate))
            {
                return parsedDate.ToString("yyyy-MM-dd");
            }

            return null; // or throw exception, depending on your needs
        }
    }
}
