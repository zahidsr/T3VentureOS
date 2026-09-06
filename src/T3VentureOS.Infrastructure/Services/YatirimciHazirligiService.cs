using T3VentureOS.Domain;
using T3VentureOS.Domain.Entities;
using T3VentureOS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace T3VentureOS.Infrastructure.Services;

public record HazirlikKriteri(string Anahtar, string Baslik, string NedenOnemli, bool Karsilandi, string? Ipucu);

public record YatirimciHazirligi(int Yuzde, string Durum, List<HazirlikKriteri> Kriterler);

/// <summary>
/// "Yatırımcıya hazır mıyım?" değerlendirmesi.
///
/// Girişim puanından (bkz. <see cref="GirisimSaglikService"/>) kasten farklıdır: puan verinin
/// <em>var olup olmadığını</em> ölçer, hazırlık ise verinin bir yatırımcı görüşmesine
/// <em>dayanıp dayanmadığını</em> — tek bir çeyreklik ciro puan kazandırır ama trend göstermez;
/// onay bekleyen kayıt puana girer ama doğrulanmamış veridir.
/// </summary>
public class YatirimciHazirligiService
{
    /// <summary>Bu süreden uzun süredir veri girilmemişse finansal tablo "güncel" sayılmaz.</summary>
    public const int GuncellikEsigiGun = 120;

    private readonly AppDbContext _db;

    public YatirimciHazirligiService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<YatirimciHazirligi?> GetAsync(Guid girisimId)
    {
        var girisim = await _db.Girisimler
            .Include(g => g.Contact)
            .Include(g => g.SatisKayitlari)
            .Include(g => g.YatirimKayitlari)
            .Include(g => g.Basarilar)
            .Include(g => g.IstihdamKayitlari)
            .Include(g => g.Dokumanlar)
            .FirstOrDefaultAsync(g => g.Id == girisimId);
        if (girisim is null) return null;

        var sunumVar = girisim.Dokumanlar.Any(d => d.Tur == DokumanTuru.Sunum)
                       || await _db.SunumTaslaklari.AnyAsync(t => t.GirisimId == girisimId);

        return Degerlendir(girisim, sunumVar, DateTime.UtcNow);
    }

    public static YatirimciHazirligi Degerlendir(Girisim g, bool sunumVar, DateTime simdi)
    {
        var onayliSatis = g.SatisKayitlari
            .Where(s => s.OnayDurumu == OnayDurumu.Onaylandi)
            .OrderBy(s => s.Donem, StringComparer.Ordinal)
            .ToList();

        var bekleyenSayisi = g.SatisKayitlari.Count(s => s.OnayDurumu == OnayDurumu.Beklemede)
                           + g.YatirimKayitlari.Count(y => y.OnayDurumu == OnayDurumu.Beklemede)
                           + g.Basarilar.Count(b => b.OnayDurumu == OnayDurumu.Beklemede)
                           + g.IstihdamKayitlari.Count(i => i.OnayDurumu == OnayDurumu.Beklemede);

        var sonKayitTarihi = new[]
        {
            g.SatisKayitlari.Select(x => (DateTime?)x.CreatedAt).Max(),
            g.YatirimKayitlari.Select(x => (DateTime?)x.CreatedAt).Max(),
            g.IstihdamKayitlari.Select(x => (DateTime?)x.CreatedAt).Max(),
        }.Where(t => t.HasValue).Max();

        var onayliKayitVar = onayliSatis.Count > 0
                             || g.YatirimKayitlari.Any(y => y.OnayDurumu == OnayDurumu.Onaylandi)
                             || g.IstihdamKayitlari.Any(i => i.OnayDurumu == OnayDurumu.Onaylandi);

        // Büyüme: son dönem, ilk döneme göre daha yüksek mi.
        var buyumeVar = onayliSatis.Count >= 2 && onayliSatis[^1].Ciro > onayliSatis[0].Ciro;

        var kriterler = new List<HazirlikKriteri>
        {
            new("tanim", "Girişim tanımı eksiksiz",
                "Yatırımcı ilk 30 saniyede ne yaptığını anlamalı; sektör ve kuruluş yılı olmadan profil eksik görünür.",
                !string.IsNullOrWhiteSpace(g.KisaTanim) && !string.IsNullOrWhiteSpace(g.Sektor) && g.KurulusYili.HasValue,
                "Profil bölümünden kısa tanım, sektör ve kuruluş yılını doldur."),

            new("iletisim", "Ulaşılabilir bir muhatap var",
                "Görüşme talebi geldiğinde kime ulaşılacağı belli olmalı.",
                g.Contact is not null && (!string.IsNullOrWhiteSpace(g.Contact.Email) || !string.IsNullOrWhiteSpace(g.Contact.Telefon)),
                "İletişim muhatabını e-posta ya da telefonuyla birlikte ekle."),

            new("sunum", "Sunum hazır",
                "Yatırımcı görüşmesinin çıktısı çoğu zaman sunumun paylaşılmasıdır.",
                sunumVar,
                "Sunum bölümünden taslağını oluştur ya da kendi sunumunu yükle."),

            new("finansal_gecmis", "En az iki dönem ciro kaydı",
                "Tek bir çeyreklik ciro bir rakamdır; iki dönem bir eğilim gösterir.",
                onayliSatis.Count >= 2,
                "Geçmiş çeyreklerin ciro kayıtlarını da gir."),

            new("buyume", "Ciroda artış görünüyor",
                "Yatırımcının aradığı ilk sinyal büyüme yönüdür.",
                buyumeVar,
                onayliSatis.Count >= 2
                    ? "Ciro düşüyorsa nedenini gelişim adımlarında açıklamak görüşmede işine yarar."
                    : "Önce en az iki dönem ciro kaydı gir."),

            new("istihdam", "İstihdam verisi var",
                "Ekibin büyümesi, cironun tek başına anlatamadığı bir büyüme kanıtıdır.",
                g.IstihdamKayitlari.Any(i => i.OnayDurumu == OnayDurumu.Onaylandi),
                "İstihdam bölümünden dönem sonu çalışan sayını gir."),

            // Hiç kayıt yokken "bekleyen onay yok" kendiliğinden doğrudur ama hazırlık göstergesi
            // değildir: doğrulanacak bir şey olmalı ki doğrulanmış olsun.
            new("dogrulanmis", "Kayıtların doğrulanmış",
                "Onay bekleyen kayıtlar doğrulanmamış veridir; yatırımcıya gösterilen tablo onaylı olmalı.",
                bekleyenSayisi == 0 && onayliKayitVar,
                bekleyenSayisi > 0
                    ? $"{bekleyenSayisi} kaydın onay bekliyor."
                    : "Önce ciro, yatırım ya da istihdam kaydı gir; onaylandığında bu ölçüt karşılanır."),

            new("guncel", "Veriler güncel",
                "Aylardır güncellenmemiş bir profil, yatırımcıya girişimin durduğu izlenimi verir.",
                sonKayitTarihi.HasValue && (simdi - sonKayitTarihi.Value).TotalDays <= GuncellikEsigiGun,
                "Son çeyreğin verilerini gir."),

            new("dogrulama", "Dış doğrulama var",
                "Ödül, hibe ya da sertifika, girişimin dışarıdan da değerlendirildiğini gösterir.",
                g.Basarilar.Any(b => b.OnayDurumu == OnayDurumu.Onaylandi),
                "Aldığın ödül, hibe ya da sertifikayı Başarı bölümüne ekle."),
        };

        var karsilanan = kriterler.Count(k => k.Karsilandi);
        var yuzde = (int)Math.Round(karsilanan * 100.0 / kriterler.Count);

        var durum = yuzde switch
        {
            100 => "Hazır",
            >= 75 => "Neredeyse hazır",
            >= 40 => "Eksikler var",
            _ => "Hazırlık başlamadı",
        };

        return new YatirimciHazirligi(yuzde, durum, kriterler);
    }
}
