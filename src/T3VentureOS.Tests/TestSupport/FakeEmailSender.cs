using T3VentureOS.Infrastructure.Services;

namespace T3VentureOS.Tests.TestSupport;

/// <summary>Records every call instead of sending mail — lets tests assert an email was (or wasn't) sent.</summary>
public class FakeEmailSender : IEmailSender
{
    public List<(string ToEmail, string Subject, string HtmlBody)> Sent { get; } = new();

    public Task SendAsync(string toEmail, string subject, string htmlBody)
    {
        Sent.Add((toEmail, subject, htmlBody));
        return Task.CompletedTask;
    }
}
