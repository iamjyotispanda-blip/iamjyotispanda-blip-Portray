using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

namespace PortRayAPI.Services;

public class EmailService : IEmailService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IConfiguration configuration, ILogger<EmailService> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public async Task SendEmailConfirmationAsync(string email, string confirmationLink)
    {
        var subject = "PortRay - Confirm Your Email";
        var body = $@"
            <html>
                <body style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
                    <div style='padding: 20px; background: linear-gradient(135deg, #1e40af, #f97316); color: white; text-align: center;'>
                        <h1>Welcome to PortRay!</h1>
                        <p>Your Port Management System</p>
                    </div>
                    <div style='padding: 30px; background: #f8fafc;'>
                        <h2 style='color: #1e40af;'>Confirm Your Email Address</h2>
                        <p>Thank you for registering with PortRay. Please click the button below to confirm your email address and activate your account.</p>
                        <div style='text-align: center; margin: 30px 0;'>
                            <a href='{confirmationLink}' style='background: #1e40af; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;'>
                                Confirm Email
                            </a>
                        </div>
                        <p style='color: #64748b; font-size: 14px;'>If the button doesn't work, copy and paste this link into your browser:</p>
                        <p style='color: #64748b; font-size: 14px; word-break: break-all;'>{confirmationLink}</p>
                        <hr style='border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;'>
                        <p style='color: #64748b; font-size: 12px;'>This email was sent from PortRay Port Management System. If you didn't create an account, please ignore this email.</p>
                    </div>
                </body>
            </html>";

        await SendEmailAsync(email, subject, body);
    }

    public async Task SendPasswordResetAsync(string email, string resetLink)
    {
        var subject = "PortRay - Reset Your Password";
        var body = $@"
            <html>
                <body style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
                    <div style='padding: 20px; background: linear-gradient(135deg, #1e40af, #f97316); color: white; text-align: center;'>
                        <h1>PortRay</h1>
                        <p>Password Reset Request</p>
                    </div>
                    <div style='padding: 30px; background: #f8fafc;'>
                        <h2 style='color: #1e40af;'>Reset Your Password</h2>
                        <p>You requested to reset your password. Click the button below to create a new password.</p>
                        <div style='text-align: center; margin: 30px 0;'>
                            <a href='{resetLink}' style='background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;'>
                                Reset Password
                            </a>
                        </div>
                        <p style='color: #64748b; font-size: 14px;'>If the button doesn't work, copy and paste this link into your browser:</p>
                        <p style='color: #64748b; font-size: 14px; word-break: break-all;'>{resetLink}</p>
                        <p style='color: #dc2626; font-size: 14px;'><strong>This link will expire in 1 hour.</strong></p>
                        <hr style='border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;'>
                        <p style='color: #64748b; font-size: 12px;'>If you didn't request a password reset, please ignore this email and your password will remain unchanged.</p>
                    </div>
                </body>
            </html>";

        await SendEmailAsync(email, subject, body);
    }

    private async Task SendEmailAsync(string toEmail, string subject, string body)
    {
        try
        {
            var smtpHost = Environment.GetEnvironmentVariable("SMTP_HOST") ?? "smtp.gmail.com";
            var smtpPort = int.Parse(Environment.GetEnvironmentVariable("SMTP_PORT") ?? "587");
            var smtpUser = Environment.GetEnvironmentVariable("SMTP_USER") ?? "";
            var smtpPass = Environment.GetEnvironmentVariable("SMTP_PASSWORD") ?? "";
            var fromEmail = Environment.GetEnvironmentVariable("FROM_EMAIL") ?? smtpUser;
            var fromName = Environment.GetEnvironmentVariable("FROM_NAME") ?? "PortRay Support";

            if (string.IsNullOrEmpty(smtpUser) || string.IsNullOrEmpty(smtpPass))
            {
                _logger.LogWarning("SMTP credentials not configured. Email not sent to {Email}", toEmail);
                return;
            }

            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(fromName, fromEmail));
            message.To.Add(new MailboxAddress("", toEmail));
            message.Subject = subject;

            message.Body = new TextPart("html")
            {
                Text = body
            };

            using var client = new SmtpClient();
            await client.ConnectAsync(smtpHost, smtpPort, SecureSocketOptions.StartTls);
            await client.AuthenticateAsync(smtpUser, smtpPass);
            await client.SendAsync(message);
            await client.DisconnectAsync(true);

            _logger.LogInformation("Email sent successfully to {Email}", toEmail);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email to {Email}", toEmail);
            throw;
        }
    }
}