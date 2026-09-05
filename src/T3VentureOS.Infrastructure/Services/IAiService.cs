namespace T3VentureOS.Infrastructure.Services;

/// <summary>
/// Turns raw dashboard/karşılaştırma numbers into a Turkish narrative. Implemented once per
/// provider (<see cref="AnthropicService"/>, <see cref="GeminiService"/>); which one is wired up is
/// decided by the <c>Ai:Provider</c> configuration key so the provider can be swapped without
/// touching the controllers.
/// </summary>
public interface IAiService
{
    Task<(bool Success, string? Text, string? Error)> GenerateInsightAsync(string prompt);
}
