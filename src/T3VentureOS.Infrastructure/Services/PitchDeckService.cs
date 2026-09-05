using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using T3VentureOS.Domain;
using T3VentureOS.Domain.Entities;
using T3VentureOS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace T3VentureOS.Infrastructure.Services;

/// <summary>
/// Sunumun tek bölümü. <paramref name="Icerik"/> ekranda görünen metindir; girişimci elle
/// düzenlerse <paramref name="ElleDuzenlendi"/> işaretlenir ve yeniden üretimde bu bölüm korunur.
/// AI'ın son yazdığı hâli <paramref name="AiIcerik"/>'te durur, böylece girişimci düzenlemesinden
/// vazgeçip AI metnine dönebilir.
/// </summary>
public record PitchDeckBolumu(string Anahtar, string Baslik, string Icerik, bool ElleDuzenlendi = false, string? AiIcerik = null);

public record PitchDeckSonucu(
    List<PitchDeckBolumu> Bolumler,
    DateTime OlusturulmaTarihi,
    string OlusturanAdSoyad,
    bool Guncel);

/// <summary>
/// Girişimin sistemdeki verisinden Sequoia pitch deck şablonuna oturan bir sunum taslağı üretir.
///
/// Amaç girişimciyi sistemde tutmak: profilini ne kadar güncel tutarsa sunumu o kadar dolu çıkar,
/// yeni bir yatırım turu girdiğinde sunumu tek tıkla tazeleyebilir. Yönetici tarafında da bir
/// girişimin kim olduğu, sunum aranmadan panelden hatırlanabilir.
/// </summary>
public class PitchDeckService
{
    /// <summary>
    /// Sequoia Capital'in klasik pitch deck sıralaması. Sabit tutulur: modelin bölüm uydurması ya da
    /// atlaması hâlinde eksikler bu listeden tamamlanır, böylece sunum her zaman aynı iskelete oturur.
    /// </summary>
    public static readonly (string Anahtar, string Baslik, string Yonerge)[] Sablon =
    [
        ("amac", "Şirketin Amacı", "Girişimi tek cümlede, iddialı ama abartısız biçimde tanımla."),
        ("problem", "Problem", "Müşterinin bugün yaşadığı acıyı ve mevcut çözümlerin neden yetersiz kaldığını anlat."),
        ("cozum", "Çözüm", "Girişimin bu problemi nasıl çözdüğünü ve değer önerisini anlat."),
        ("neden_simdi", "Neden Şimdi?", "Bu çözümü bugün mümkün ve gerekli kılan teknolojik veya pazar dinamiğini açıkla."),
        ("pazar", "Pazar Büyüklüğü", "Hedef müşteri kitlesini ve pazarın ölçeğini, elde veri varsa ona dayanarak tarif et."),
        ("rekabet", "Rekabet", "Sektördeki alternatifleri ve girişimin ayrıştığı noktayı anlat."),
        ("urun", "Ürün", "Ürünün ne yaptığını, hangi teknolojiyi kullandığını ve gelişim yolculuğunu anlat."),
        ("is_modeli", "İş Modeli", "Girişimin nasıl para kazandığını; ciro verisi varsa ona dayandır."),
        ("ekip", "Ekip", "Ekibin büyüklüğünü, kuruluş yılını ve iletişim muhatabını tanıt."),
        ("finansal", "Finansallar", "Onaylı ciro, ihracat ve yatırım verilerini yorumla; büyüme varsa vurgula."),
    ];

    private static readonly JsonSerializerOptions JsonAyarlari = new() { PropertyNameCaseInsensitive = true };

    private readonly AppDbContext _db;
    private readonly IAiService _ai;

    public PitchDeckService(AppDbContext db, IAiService ai)
    {
        _db = db;
        _ai = ai;
    }

    private static Task<Girisim?> GirisimSorgusu(AppDbContext db, Guid girisimId) =>
        db.Girisimler
            .Include(g => g.Contact)
            .Include(g => g.GelisimAdimlari)
            .Include(g => g.Basarilar)
            .Include(g => g.SatisKayitlari)
            .Include(g => g.YatirimKayitlari)
            .Include(g => g.ProgramKatilimlari).ThenInclude(k => k.Program)
            .FirstOrDefaultAsync(g => g.Id == girisimId);

    public async Task<PitchDeckSonucu?> GetAsync(Guid girisimId)
    {
        var taslak = await _db.SunumTaslaklari
            .Include(t => t.Olusturan)
            .FirstOrDefaultAsync(t => t.GirisimId == girisimId);
        if (taslak is null) return null;

        var girisim = await GirisimSorgusu(_db, girisimId);
        if (girisim is null) return null;

        return new PitchDeckSonucu(
            Deserialize(taslak.IcerikJson),
            taslak.UpdatedAt,
            taslak.Olusturan?.FullName ?? string.Empty,
            Guncel: taslak.VeriParmakIzi == VeriParmakIziHesapla(girisim));
    }

    public async Task<(bool Success, PitchDeckSonucu? Sonuc, string? Error)> UretAsync(Guid girisimId, Guid kullaniciId)
    {
        var girisim = await GirisimSorgusu(_db, girisimId);
        if (girisim is null) return (false, null, "Girişim bulunamadı.");

        if (string.IsNullOrWhiteSpace(girisim.KisaTanim))
            return (false, null, "Sunum üretebilmek için önce girişim profilindeki kısa tanımı doldurmalısın.");

        var taslak = await _db.SunumTaslaklari.FirstOrDefaultAsync(t => t.GirisimId == girisimId);

        var (ok, metin, hata) = await _ai.GenerateInsightAsync(PromptOlustur(girisim));
        if (!ok || string.IsNullOrWhiteSpace(metin)) return (false, null, hata ?? "Sunum üretilemedi.");

        var bolumler = Ayristir(metin, taslak is null ? null : Deserialize(taslak.IcerikJson));
        if (bolumler.Count == 0) return (false, null, "Sunum içeriği çözümlenemedi, lütfen tekrar deneyin.");

        if (taslak is null)
        {
            taslak = new SunumTaslagi { GirisimId = girisimId, OlusturanId = kullaniciId };
            _db.SunumTaslaklari.Add(taslak);
        }

        taslak.IcerikJson = JsonSerializer.Serialize(bolumler);
        taslak.VeriParmakIzi = VeriParmakIziHesapla(girisim);
        taslak.OlusturanId = kullaniciId;
        taslak.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        var olusturan = await _db.Users.FindAsync(kullaniciId);
        return (true, new PitchDeckSonucu(bolumler, taslak.UpdatedAt, olusturan?.FullName ?? string.Empty, Guncel: true), null);
    }

    /// <summary>
    /// Tek bir bölümün metnini girişimcinin yazdığıyla değiştirir. <paramref name="icerik"/> boşsa
    /// düzenleme geri alınır ve AI'ın son ürettiği metne dönülür.
    /// </summary>
    public async Task<(bool Success, PitchDeckSonucu? Sonuc, string? Error)> BolumGuncelleAsync(
        Guid girisimId, string anahtar, string? icerik)
    {
        if (!Sablon.Any(s => s.Anahtar == anahtar))
            return (false, null, "Geçersiz sunum bölümü.");

        var taslak = await _db.SunumTaslaklari.Include(t => t.Olusturan).FirstOrDefaultAsync(t => t.GirisimId == girisimId);
        if (taslak is null) return (false, null, "Önce sunum taslağı üretilmeli.");

        var bolumler = Deserialize(taslak.IcerikJson);
        var index = bolumler.FindIndex(b => b.Anahtar == anahtar);
        if (index < 0) return (false, null, "Bölüm bulunamadı.");

        var mevcut = bolumler[index];
        bolumler[index] = string.IsNullOrWhiteSpace(icerik)
            ? mevcut with { Icerik = mevcut.AiIcerik ?? mevcut.Icerik, ElleDuzenlendi = false }
            : mevcut with { Icerik = icerik.Trim(), ElleDuzenlendi = true, AiIcerik = mevcut.AiIcerik ?? mevcut.Icerik };

        taslak.IcerikJson = JsonSerializer.Serialize(bolumler);
        taslak.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        var girisim = await GirisimSorgusu(_db, girisimId);
        return (true, new PitchDeckSonucu(
            bolumler, taslak.UpdatedAt, taslak.Olusturan?.FullName ?? string.Empty,
            Guncel: girisim is not null && taslak.VeriParmakIzi == VeriParmakIziHesapla(girisim)), null);
    }

    // ------------------------------------------------------------------ prompt

    public static string PromptOlustur(Girisim g)
    {
        var onayliSatis = g.SatisKayitlari.Where(s => s.OnayDurumu == OnayDurumu.Onaylandi).ToList();
        var onayliYatirim = g.YatirimKayitlari.Where(y => y.OnayDurumu == OnayDurumu.Onaylandi).ToList();
        var onayliBasari = g.Basarilar.Where(b => b.OnayDurumu == OnayDurumu.Onaylandi).ToList();

        var sb = new StringBuilder();
        sb.AppendLine("Bir girişimin yatırımcı sunumunu (pitch deck) hazırlıyorsun.");
        sb.AppendLine("Aşağıda girişimin sistemdeki güncel verisi var. Sequoia Capital pitch deck şablonuna göre her bölümü doldur.");
        sb.AppendLine();
        sb.AppendLine("KURALLAR:");
        sb.AppendLine("- Yalnızca Türkçe yaz.");
        sb.AppendLine("- Her bölüm 2-4 cümle olsun; sunum slaytına sığacak yoğunlukta, dolgu cümle kurma.");
        sb.AppendLine("- Verilmeyen sayısal bilgiyi UYDURMA. Veri yoksa o bölümü elindeki niteliksel bilgiyle yaz ya da neyin eksik olduğunu tek cümleyle belirt.");
        sb.AppendLine("- Ciro/yatırım rakamlarını yorumlarken yalnızca aşağıdaki onaylı verileri kullan.");
        sb.AppendLine();
        sb.AppendLine("GİRİŞİM VERİSİ:");
        sb.AppendLine($"- Ad: {g.Ad}");
        sb.AppendLine($"- Sektör: {g.Sektor ?? "belirtilmemiş"}");
        sb.AppendLine($"- Kısa tanım: {g.KisaTanim ?? "belirtilmemiş"}");
        sb.AppendLine($"- Teknoloji: {g.Teknoloji ?? "belirtilmemiş"}");
        sb.AppendLine($"- Kuruluş yılı: {(g.KurulusYili?.ToString() ?? "belirtilmemiş")}");
        sb.AppendLine($"- Ekip büyüklüğü: {(g.EkipBuyuklugu.HasValue ? $"{g.EkipBuyuklugu} kişi" : "belirtilmemiş")}");
        sb.AppendLine($"- Web sitesi: {g.WebsiteUrl ?? "belirtilmemiş"}");
        sb.AppendLine($"- İletişim muhatabı: {(g.Contact is null ? "girilmemiş" : $"{g.Contact.AdSoyad} ({g.Contact.Unvan ?? "unvan belirtilmemiş"})")}");

        sb.AppendLine($"- Onaylı toplam ciro: {onayliSatis.Sum(s => s.Ciro):N0} TL ({onayliSatis.Count} dönem kaydı)");
        if (onayliSatis.Count > 0)
            sb.AppendLine($"  Dönemler: {string.Join(", ", onayliSatis.OrderBy(s => s.Donem).Select(s => $"{s.Donem}: {s.Ciro:N0} TL"))}");

        sb.AppendLine($"- Onaylı toplam yatırım: {onayliYatirim.Sum(y => y.Tutar):N0} TL ({onayliYatirim.Count} tur)");
        if (onayliYatirim.Count > 0)
            sb.AppendLine($"  Turlar: {string.Join(", ", onayliYatirim.OrderBy(y => y.Tarih).Select(y => $"{y.Tur} {y.Tutar:N0} {y.ParaBirimi} ({y.Tarih:yyyy})"))}");

        if (onayliBasari.Count > 0)
            sb.AppendLine($"- Başarılar: {string.Join(", ", onayliBasari.Select(b => $"{b.Baslik} ({b.Tur}, {b.Tarih:yyyy})"))}");

        if (g.GelisimAdimlari.Count > 0)
            sb.AppendLine($"- Gelişim adımları: {string.Join(" | ", g.GelisimAdimlari.OrderBy(a => a.Tarih).Select(a => $"{a.Tarih:yyyy-MM}: {a.Baslik}"))}");

        if (g.ProgramKatilimlari.Count > 0)
            sb.AppendLine($"- Program katılımları: {string.Join(", ", g.ProgramKatilimlari.Select(k => $"{k.Program?.Name} ({k.Durum})"))}");

        sb.AppendLine();
        sb.AppendLine("ÇIKTI BİÇİMİ: Yalnızca aşağıdaki şemaya uyan bir JSON dizisi döndür. Açıklama, başlık ya da kod bloğu ekleme.");
        sb.AppendLine("""[{"anahtar":"...","icerik":"..."}]""");
        sb.AppendLine("Kullanılacak anahtarlar ve her birinin ne anlatması gerektiği:");
        foreach (var (anahtar, baslik, yonerge) in Sablon)
            sb.AppendLine($"- {anahtar} ({baslik}): {yonerge}");

        return sb.ToString();
    }

    // ------------------------------------------------------------------ ayrıştırma

    /// <summary>
    /// Model bazen JSON'u kod bloğu içinde ya da önüne açıklama koyarak döndürür; ham metinden ilk
    /// JSON dizisini çekip ayrıştırırız. Eksik/uydurma bölümler şablona göre normalize edilir.
    /// </summary>
    public static List<PitchDeckBolumu> Ayristir(string metin, IReadOnlyList<PitchDeckBolumu>? mevcut = null)
    {
        var baslangic = metin.IndexOf('[');
        var bitis = metin.LastIndexOf(']');
        if (baslangic < 0 || bitis <= baslangic) return [];

        List<HamBolum>? ham;
        try
        {
            ham = JsonSerializer.Deserialize<List<HamBolum>>(metin[baslangic..(bitis + 1)], JsonAyarlari);
        }
        catch (JsonException)
        {
            return [];
        }
        if (ham is null) return [];

        var icerikler = ham
            .Where(h => !string.IsNullOrWhiteSpace(h.Anahtar))
            .GroupBy(h => h.Anahtar!.Trim().ToLowerInvariant())
            .ToDictionary(grup => grup.Key, grup => grup.First().Icerik?.Trim() ?? string.Empty);

        var oncekiler = (mevcut ?? []).ToDictionary(b => b.Anahtar, b => b);

        return Sablon
            .Select(s =>
            {
                var aiIcerik = icerikler.TryGetValue(s.Anahtar, out var icerik) && !string.IsNullOrWhiteSpace(icerik)
                    ? icerik
                    : "Bu bölüm için sistemde yeterli veri yok.";

                // Girişimcinin elle yazdığı metin yeniden üretimde ezilmez; yeni AI metni yalnızca
                // "AI metnine dön" seçeneği için saklanır.
                if (oncekiler.TryGetValue(s.Anahtar, out var onceki) && onceki.ElleDuzenlendi)
                    return onceki with { Baslik = s.Baslik, AiIcerik = aiIcerik };

                return new PitchDeckBolumu(s.Anahtar, s.Baslik, aiIcerik, ElleDuzenlendi: false, AiIcerik: aiIcerik);
            })
            .ToList();
    }

    private static List<PitchDeckBolumu> Deserialize(string json)
    {
        try
        {
            return JsonSerializer.Deserialize<List<PitchDeckBolumu>>(json, JsonAyarlari) ?? [];
        }
        catch (JsonException)
        {
            return [];
        }
    }

    private sealed class HamBolum
    {
        public string? Anahtar { get; set; }
        public string? Icerik { get; set; }
    }

    // ------------------------------------------------------------------ güncellik

    /// <summary>
    /// Sunumun dayandığı verinin özeti. Girişimci yeni bir yatırım turu girer ya da profilini
    /// değiştirirse bu değer değişir ve sunum "güncel değil" olarak işaretlenir.
    /// </summary>
    public static string VeriParmakIziHesapla(Girisim g)
    {
        var onayliSatis = g.SatisKayitlari.Where(s => s.OnayDurumu == OnayDurumu.Onaylandi).OrderBy(s => s.Id);
        var onayliYatirim = g.YatirimKayitlari.Where(y => y.OnayDurumu == OnayDurumu.Onaylandi).OrderBy(y => y.Id);
        var onayliBasari = g.Basarilar.Where(b => b.OnayDurumu == OnayDurumu.Onaylandi).OrderBy(b => b.Id);

        var sb = new StringBuilder();
        sb.Append(g.Ad).Append('|').Append(g.Sektor).Append('|').Append(g.KisaTanim).Append('|')
          .Append(g.Teknoloji).Append('|').Append(g.KurulusYili).Append('|').Append(g.EkipBuyuklugu).Append('|')
          .Append(g.WebsiteUrl).Append('|').Append(g.Contact?.AdSoyad).Append('|').Append(g.Contact?.Unvan);
        foreach (var s in onayliSatis) sb.Append("|S").Append(s.Donem).Append(':').Append(s.Ciro);
        foreach (var y in onayliYatirim) sb.Append("|Y").Append(y.Tur).Append(':').Append(y.Tutar);
        foreach (var b in onayliBasari) sb.Append("|B").Append(b.Baslik);
        foreach (var a in g.GelisimAdimlari.OrderBy(a => a.Id)) sb.Append("|G").Append(a.Baslik);

        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(sb.ToString())));
    }
}
