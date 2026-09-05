using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Configuration;

namespace T3VentureOS.Infrastructure.Services;

/// <summary>Google Gemini (Generative Language API) backed <see cref="IAiService"/> implementation.</summary>
public class GeminiService : IAiService
{
    private const string DefaultModel = "gemini-3.6-flash";

    private readonly HttpClient _http;
    private readonly IConfiguration _config;

    public GeminiService(HttpClient http, IConfiguration config)
    {
        _http = http;
        _config = config;
    }

    public async Task<(bool Success, string? Text, string? Error)> GenerateInsightAsync(string prompt)
    {
        var apiKey = _config["Gemini:ApiKey"];
        if (string.IsNullOrWhiteSpace(apiKey))
            return (false, null, "AI analizi için API anahtarı yapılandırılmamış.");

        var model = _config["Ai:Gemini:Model"] is { Length: > 0 } m ? m : DefaultModel;

        var request = new HttpRequestMessage(
            HttpMethod.Post,
            $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent");
        request.Headers.Add("x-goog-api-key", apiKey);
        request.Content = JsonContent.Create(new
        {
            contents = new[] { new { parts = new[] { new { text = prompt } } } },
            // Thinking models spend part of the budget before emitting text, so keep this well above
            // the ~1k tokens the narrative itself needs.
            generationConfig = new { maxOutputTokens = 4096 },
        });

        try
        {
            var response = await _http.SendAsync(request);
            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadFromJsonAsync<GeminiErrorResponse>();
                var detail = errorBody?.Error?.Message ?? "";

                // Friendly Turkish messages for the most common Gemini API errors
                var friendly = detail switch
                {
                    var d when d.Contains("API key not valid", StringComparison.OrdinalIgnoreCase)
                            || d.Contains("API_KEY_INVALID", StringComparison.OrdinalIgnoreCase) =>
                        "Gemini API anahtarı geçersiz. Lütfen user-secrets içindeki Gemini:ApiKey değerini kontrol edin.",
                    var d when d.Contains("quota", StringComparison.OrdinalIgnoreCase) =>
                        "Gemini API kotası aşıldı. Lütfen bir süre bekleyin ya da kotanızı yükseltin.",
                    var d when d.Contains("no longer available", StringComparison.OrdinalIgnoreCase)
                            || d.Contains("not found", StringComparison.OrdinalIgnoreCase) =>
                        $"Gemini modeli ({model}) kullanılamıyor. Ai:Gemini:Model ayarını güncelleyin.",
                    var d when d.Contains("overloaded", StringComparison.OrdinalIgnoreCase) =>
                        "Gemini servisi şu an yoğun. Lütfen birkaç dakika sonra tekrar deneyin.",
                    var d when !string.IsNullOrWhiteSpace(d) => $"AI servisi hatası: {d}",
                    _ => $"AI servisi hata döndürdü ({(int)response.StatusCode}).",
                };
                return (false, null, friendly);
            }

            var result = await response.Content.ReadFromJsonAsync<GeminiResponse>();
            var candidate = result?.Candidates?.FirstOrDefault();

            // A thinking model can burn the whole budget before producing prose; say so rather than
            // reporting the generic "yanıt alınamadı".
            if (candidate?.FinishReason is "MAX_TOKENS")
                return (false, null, "AI yanıtı çok uzun olduğu için tamamlanamadı. Lütfen tekrar deneyin.");

            var text = candidate?.Content?.Parts is { } parts
                ? string.Concat(parts.Where(p => !string.IsNullOrWhiteSpace(p.Text)).Select(p => p.Text)).Trim()
                : null;

            if (string.IsNullOrWhiteSpace(text))
                return (false, null, "AI servisinden yanıt alınamadı.");

            return (true, text, null);
        }
        catch (Exception)
        {
            return (false, null, "AI servisine bağlanılamadı.");
        }
    }

    private class GeminiResponse
    {
        [JsonPropertyName("candidates")]
        public List<Candidate>? Candidates { get; set; }
    }

    private class Candidate
    {
        [JsonPropertyName("content")]
        public CandidateContent? Content { get; set; }

        [JsonPropertyName("finishReason")]
        public string? FinishReason { get; set; }
    }

    private class CandidateContent
    {
        [JsonPropertyName("parts")]
        public List<Part>? Parts { get; set; }
    }

    private class Part
    {
        [JsonPropertyName("text")]
        public string? Text { get; set; }
    }

    private class GeminiErrorResponse
    {
        [JsonPropertyName("error")]
        public GeminiErrorDetail? Error { get; set; }
    }

    private class GeminiErrorDetail
    {
        [JsonPropertyName("message")]
        public string? Message { get; set; }
    }
}
