using LG.Core.ApplicationServices.Common.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Net;
using System.Net.Mail;
using System.Threading.Tasks;

namespace LG.Core.ApplicationServices.Common.Services
{
    public class EmailService : IEmailService
    {
        private readonly IConfiguration _config;
        private readonly ILogger<EmailService> _logger;

        public EmailService(IConfiguration config, ILogger<EmailService> logger)
        {
            _config = config;
            _logger = logger;
        }

        public async Task SendEmailAsync(string toEmail, string subject, string body)
        {
            var host = _config["SmtpSettings:Host"];
            var port = int.Parse(_config["SmtpSettings:Port"] ?? "587");
            var email = _config["SmtpSettings:Email"];
            var password = _config["SmtpSettings:Password"];

            if (string.IsNullOrEmpty(host) || string.IsNullOrEmpty(email) || string.IsNullOrEmpty(password))
            {
                _logger.LogWarning("SMTP Settings are not configured properly. Email to {toEmail} was not sent.", toEmail);
                return;
            }

            using var client = new SmtpClient(host, port)
            {
                Credentials = new NetworkCredential(email, password),
                EnableSsl = true
            };

            var mailMessage = new MailMessage
            {
                From = new MailAddress(email),
                Subject = subject,
                Body = body,
                IsBodyHtml = true,
            };
            mailMessage.To.Add(toEmail);

            try
            {
                await client.SendMailAsync(mailMessage);
                _logger.LogInformation("Email sent successfully to {toEmail}", toEmail);
            }
            catch (System.Exception ex)
            {
                _logger.LogError(ex, "Failed to send email to {toEmail}", toEmail);
                throw;
            }
        }
    }
}
