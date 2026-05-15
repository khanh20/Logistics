using System.Threading.Tasks;

namespace LG.Core.ApplicationServices.Common.Interfaces
{
    public interface IEmailService
    {
        Task SendEmailAsync(string toEmail, string subject, string body);
    }
}
