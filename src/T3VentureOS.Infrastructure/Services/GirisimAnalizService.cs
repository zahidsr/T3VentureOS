using System.Text;
using T3VentureOS.Domain;
using T3VentureOS.Domain.Entities;
using T3VentureOS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace T3VentureOS.Infrastructure.Services;

public record GirisimAnalizSonucu(string Metin, DateTime CreatedAt, string CreatedByAdSoyad, AiAnalizTuru Tur);

/// <summary>
/// Tek bir girişimin verisi üzerinden AI analizi. İki soruya cevap verir ve ikisi ayrı promptlardır,
/// çünkü muhatapları farklıdır:
///
/// <list type="bullet">
/// <item>GirisimDurumu — "bu girişim ne durumda": yönetici ve girişimci için tarafsız okuma.</item>
/// <item>GirisimGelisim — "nasıl geliştiririm": yalnızca girişimciye yönelik somut eylem önerileri.</item>
/// </list>
///
/// Analizler saklanır; girişimci her sayfa açılışında yeniden üretim beklemesin ve iki farklı
/// tarihteki okumayı karşılaştırabilsin.
/// </summary>
public class GirisimAnalizService
{
    private readonly AppDbContext _db;
    private readonly IAiService _ai;

    public GirisimAnalizService(AppDbContext db, IAiService ai)
    {
        _db = db;
        _ai = ai;
    }

    public async Task<GirisimAnalizSonucu?> GetSonAnalizAsync(Guid girisimId, AiAnalizTuru tur)
    {
        var kayit = await _db.AiAnalizKayitlari
            .Where(a => a.GirisimId == girisimId && a.Tur == tur)
            .OrderByDescending(a => a.CreatedAt)
            .FirstOrDefaultAsync();

        return kayit is null ? null : new GirisimAnalizSonucu(kayit.Metin, kayit.CreatedAt, kayit.CreatedByAdSoyad, kayit.Tur);
    }

    public async Task<(bool Success, GirisimAnalizSonucu? Sonuc, string? Error)> UretAsync(
        Guid girisimId, Guid kullaniciId, AiAnalizTuru tur)
    {
        if (tur == AiAnalizTuru.Ekosistem)
            return (false, null, "Bu uç nokta yalnızca girişim bazlı analizler içindir.");

        var girisim = await _db.Girisimler
            .Include(g => g.Contact)
            .Include(g => g.GelisimAdimlari)
            .Include(g => g.Basarilar)
            .Include(g => g.SatisKayitlari)
            .Include(g => g.YatirimKayitlari)
            .Include(g => g.Dokumanlar)
            .Include(g => g.ProgramKatilimlari).ThenInclude(k => k.Program)
            .Include(g => g.AsamaGecisleri)
            .FirstOrDefaultAsync(g => g.Id == girisimId);
        if (girisim is null) return (false, null, "Girişim bulunamadı.");

        var prompt = tur switch
        {
            AiAnalizTuru.GirisimGelisim => GelisimPromptu(girisim),
            AiAnalizTuru.GirisimProgramEtkisi => ProgramEtkisiPromptu(girisim),
            _ => DurumPromptu(girisim),
        };

        var (ok, metin, hata) = await _ai.GenerateInsightAsync(prompt);
        if (!ok || string.IsNullOrWhiteSpace(metin)) return (false, null, hata ?? "Analiz üretilemedi.");

        var kullanici = await _db.Users.FindAsync(kullaniciId);
        var kayit = new AiAnalizKaydi
        {
            CreatedById = kullaniciId,
            CreatedByAdSoyad = kullanici?.FullName ?? string.Empty,
            Metin = metin.Trim(),
            Tur = tur,
            GirisimId = girisimId,
        };
        _db.AiAnalizKayitlari.Add(kayit);
        await _db.SaveChangesAsync();

        return (true, new GirisimAnalizSonucu(kayit.Metin, kayit.CreatedAt, kayit.CreatedByAdSoyad, tur), null);
    }

    // ------------------------------------------------------------------ promptlar

    /// <summary>Her iki prompta da giren ortak veri özeti — yalnızca onaylı kayıtlar.</summary>
    public static string VeriOzeti(Girisim g)
    {
        var onayliSatis = g.SatisKayitlari.Where(s => s.OnayDurumu == OnayDurumu.Onaylandi).OrderBy(s => s.Donem).ToList();
        var onayliYatirim = g.YatirimKayitlari.Where(y => y.OnayDurumu == OnayDurumu.Onaylandi).OrderBy(y => y.Tarih).ToList();
        var onayliBasari = g.Basarilar.Where(b => b.OnayDurumu == OnayDurumu.Onaylandi).ToList();
        var bekleyen = g.SatisKayitlari.Count(s => s.OnayDurumu == OnayDurumu.Beklemede)
                     + g.YatirimKayitlari.Count(y => y.OnayDurumu == OnayDurumu.Beklemede)
                     + g.Basarilar.Count(b => b.OnayDurumu == OnayDurumu.Beklemede)
                     + g.Dokumanlar.Count(d => d.OnayDurumu == OnayDurumu.Beklemede);

        var sb = new StringBuilder();
        sb.AppendLine($"- Ad: {g.Ad}");
        sb.AppendLine($"- Sektör: {g.Sektor ?? "girilmemiş"}");
        sb.AppendLine($"- Kısa tanım: {g.KisaTanim ?? "girilmemiş"}");
        sb.AppendLine($"- Teknoloji: {g.Teknoloji ?? "girilmemiş"}");
        sb.AppendLine($"- Kuruluş yılı: {(g.KurulusYili?.ToString() ?? "girilmemiş")}");
        sb.AppendLine($"- Ekip büyüklüğü: {(g.EkipBuyuklugu.HasValue ? $"{g.EkipBuyuklugu} kişi" : "girilmemiş")}");
        sb.AppendLine($"- İletişim muhatabı: {(g.Contact is null ? "girilmemiş" : g.Contact.AdSoyad)}");
        sb.AppendLine($"- Onaylı ciro kayıtları ({onayliSatis.Count}): {(onayliSatis.Count == 0 ? "yok" : string.Join(", ", onayliSatis.Select(s => $"{s.Donem}: {s.Ciro:N0} TL")))}");
        sb.AppendLine($"- Onaylı yatırım turları ({onayliYatirim.Count}): {(onayliYatirim.Count == 0 ? "yok" : string.Join(", ", onayliYatirim.Select(y => $"{y.Tur} {y.Tutar:N0} {y.ParaBirimi} ({y.Tarih:yyyy-MM})")))}");
        sb.AppendLine($"- Onaylı başarılar ({onayliBasari.Count}): {(onayliBasari.Count == 0 ? "yok" : string.Join(", ", onayliBasari.Select(b => $"{b.Baslik} ({b.Tarih:yyyy})")))}");
        sb.AppendLine($"- Gelişim adımları ({g.GelisimAdimlari.Count}): {(g.GelisimAdimlari.Count == 0 ? "yok" : string.Join(" | ", g.GelisimAdimlari.OrderBy(a => a.Tarih).Select(a => $"{a.Tarih:yyyy-MM}: {a.Baslik}")))}");
        sb.AppendLine($"- Program katılımları: {(g.ProgramKatilimlari.Count == 0 ? "yok" : string.Join(", ", g.ProgramKatilimlari.Select(k => $"{k.Program?.Name} ({k.Durum})")))}");
        sb.AppendLine($"- Onay bekleyen kayıt sayısı: {bekleyen}");
        sb.AppendLine($"- Güncel ürün olgunluk aşaması: {g.Asama}");

        var gecisler = g.AsamaGecisleri.OrderBy(x => x.Tarih).ToList();
        if (gecisler.Count > 0)
        {
            sb.AppendLine($"- Aşama yolculuğu: {string.Join(" | ", gecisler.Select(x => $"{x.Tarih:yyyy-MM}: {(x.OncekiAsama is null ? "başlangıç " : $"{x.OncekiAsama} → ")}{x.YeniAsama}{(string.IsNullOrWhiteSpace(x.Aciklama) ? "" : $" ({x.Aciklama})")}"))}");
        }

        // Programa giriş ve çıkış aşaması, "program ne değiştirdi" sorusunun tek dayanağı.
        foreach (var katilim in g.ProgramKatilimlari)
        {
            var giris = katilim.BaslangictakiAsama?.ToString() ?? "bilinmiyor";
            var cikis = katilim.BitistekiAsama?.ToString() ?? "devam ediyor";
            sb.AppendLine($"- Program: {katilim.Program?.Name} — {katilim.BaslangicTarihi:yyyy-MM} tarihinde {giris} aşamasında katıldı, çıkış aşaması: {cikis} (durum: {katilim.Durum})");
        }
        sb.AppendLine($"- Profilin son güncellenme tarihi: {g.UpdatedAt:yyyy-MM-dd}");
        return sb.ToString();
    }

    public static string DurumPromptu(Girisim g) =>
        $"""
        Bir girişimcilik ekosistemi platformunda tek bir girişimin verisini yorumluyorsun.
        Aşağıdaki verilere dayanarak Türkçe, madde işaretli 4-5 maddelik bir durum okuması yaz.

        KURALLAR:
        - Verilmeyen bilgiyi uydurma; veri yoksa "bu konuda kayıt yok" de.
        - Rakamı tekrar etme, ondan çıkarım yap. "Ciro 720.000 TL" değil, "ciro son çeyrekte iki katına çıktı" gibi.
        - Büyüme, süreklilik ve veri bütünlüğü üzerinde dur. Eksik veri varsa bunu bir bulgu olarak yaz.
        - Süslü giriş/kapanış cümlesi kurma, doğrudan maddelerle başla.
        - Övgü ya da yatırım tavsiyesi verme; tarafsız bir okuma yaz.

        GİRİŞİM VERİSİ:
        {VeriOzeti(g)}
        """;

    /// <summary>
    /// "Bu girişim programdan beri ne yaptı" sorusunun cevabı. Diğer iki promptdan farkı, zaman
    /// eksenini merkeze alması: programa girmeden önceki durumla bugünü karşılaştırır.
    /// </summary>
    public static string ProgramEtkisiPromptu(Girisim g) =>
        $"""
        Bir hızlandırma programının girişim üzerindeki etkisini değerlendiriyorsun.
        Aşağıdaki girişimin program öncesi ve sonrası verisine bakarak Türkçe, madde işaretli
        4-5 maddelik bir değerlendirme yaz.

        KURALLAR:
        - Odağın "program öncesinde neredeydi, program sırasında/sonrasında ne değişti" olsun.
        - Aşama geçişlerinin tarihleriyle program tarihlerini karşılaştır; programdan önce mi
          sonra mı gerçekleştiklerini açıkça söyle.
        - Bir değişimi programa bağlamak için yeterli kanıt yoksa bunu dürüstçe belirt;
          zamanlama örtüşmesi tek başına nedensellik değildir.
        - Program sonrası veri yoksa "programdan bu yana kayıt girilmemiş" de.
        - Verilmeyen bilgiyi uydurma. Süslü giriş/kapanış cümlesi kurma.

        GİRİŞİM VERİSİ:
        {VeriOzeti(g)}
        """;

    public static string GelisimPromptu(Girisim g) =>
        $"""
        Bir girişimcilik hızlandırma programının mentoru gibi davranıyorsun. Aşağıdaki girişimin
        platformdaki verisine bakarak Türkçe, madde işaretli 4-5 somut geliştirme önerisi yaz.

        KURALLAR:
        - Doğrudan girişimciye hitap et ("şunu yapmalısın" değil, "şunu yapabilirsin" tonunda).
        - Her öneri bu girişimin verisine dayansın; genel geçer girişimcilik tavsiyesi yazma.
        - Verideki eksikleri (girilmemiş alanlar, kayıt olmayan dönemler, bekleyen onaylar) fırsat
          olarak ele al ve neyi doldurmasının ne işine yarayacağını açıkla.
        - Her madde tek cümlelik bir eylem + tek cümlelik gerekçe olsun.
        - Süslü giriş/kapanış cümlesi kurma, doğrudan maddelerle başla.

        GİRİŞİM VERİSİ:
        {VeriOzeti(g)}
        """;
}
