using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Configuration;

namespace T3VentureOS.Infrastructure.Services;

/// <summary>Thin wrapper around the Anthropic Messages API — used to turn raw dashboard numbers into a Turkish narrative for Karar Verici.</summary>
public class AnthropicService
{
    private readonly HttpClient _http;
    private readonly IConfiguration _config;

    public AnthropicService(HttpClient http, IConfiguration config)
    {
        _http = http;
        _config = config;
    }

    public async Task<(bool Success, string? Text, string? Error)> GenerateInsightAsync(string prompt)
    {
        var apiKey = _config["Anthropic:ApiKey"];
        if (string.IsNullOrWhiteSpace(apiKey))
            return (false, null, "AI analizi için API anahtarı yapılandırılmamış.");

        var request = new HttpRequestMessage(HttpMethod.Post, "https://api.anthropic.com/v1/messages");
        request.Headers.Add("x-api-key", apiKey);
        request.Headers.Add("anthropic-version", "2023-06-01");
        request.Content = JsonContent.Create(new
        {
            model = "claude-sonnet-5",
            max_tokens = 1024,
            messages = new[] { new { role = "user", content = prompt } },
        });

        try
        {
            var response = await _http.SendAsync(request);
            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadFromJsonAsync<AnthropicErrorResponse>();
                var detail = errorBody?.Error?.Message ?? "";

                // Friendly Turkish messages for the most common Anthropic API errors
                var friendly = detail switch
                {
                    var d when d.Contains("credit balance", StringComparison.OrdinalIgnoreCase) =>
                        "Anthropic hesabınızda yeterli kredi bulunmuyor. Lütfen console.anthropic.com adresinden kredi yükleyin.",
                    var d when d.Contains("invalid x-api-key", StringComparison.OrdinalIgnoreCase) =>
                        "Anthropic API anahtarı geçersiz. Lütfen appsettings / user-secrets içindeki anahtarı kontrol edin.",
                    var d when d.Contains("overloaded", StringComparison.OrdinalIgnoreCase) =>
                        "Anthropic servisi şu an yoğun. Lütfen birkaç dakika sonra tekrar deneyin.",
                    var d when d.Contains("rate limit", StringComparison.OrdinalIgnoreCase) =>
                        "Anthropic API istek limiti aşıldı. Lütfen bir süre bekleyin.",
                    var d when !string.IsNullOrWhiteSpace(d) => $"AI servisi hatası: {d}",
                    _ => $"AI servisi hata döndürdü ({(int)response.StatusCode}).",
                };
                return (false, null, friendly);
            }

            var result = await response.Content.ReadFromJsonAsync<AnthropicResponse>();
            var text = result?.Content?.FirstOrDefault(c => c.Type == "text")?.Text;
            if (string.IsNullOrWhiteSpace(text))
                return (false, null, "AI servisinden yanıt alınamadı.");

            return (true, text, null);
        }
        catch (Exception)
        {
            return (false, null, "AI servisine bağlanılamadı.");
        }
    }

    private class AnthropicResponse
    {
        [JsonPropertyName("content")]
        public List<ContentBlock>? Content { get; set; }
    }

    private class ContentBlock
    {
        [JsonPropertyName("type")]
        public string Type { get; set; } = "";

        [JsonPropertyName("text")]
        public string? Text { get; set; }
    }

    private class AnthropicErrorResponse
    {
        [JsonPropertyName("error")]
        public AnthropicErrorDetail? Error { get; set; }
    }

    private class AnthropicErrorDetail
    {
        [JsonPropertyName("message")]
        public string? Message { get; set; }
    }
}
