using T3VentureOS.Domain;
using T3VentureOS.Domain.Entities;
using T3VentureOS.Infrastructure.Services;

namespace T3VentureOS.Web.Dtos;

public record GirisimSummaryDto(
    Guid Id, string Ad, string? Sektor, string? KisaTanim, string? Teknoloji,
    int? KurulusYili, int? EkipBuyuklugu, string? LogoUrl, decimal ToplamOnayliCiro, DateTime CreatedAt,
    int Puan, string Seviye, bool Guncel);

public record CreateGirisimRequest(string Ad, string? Sektor, string? KisaTanim, string? Teknoloji, string? WebsiteUrl, int? KurulusYili, int? EkipBuyuklugu);
public record UpdateGirisimRequest(string Ad, string? Sektor, string? KisaTanim, string? Teknoloji, string? WebsiteUrl, int? KurulusYili, int? EkipBuyuklugu);

public record ProgramKatilimOzetDto(Guid Id, Guid ProgramId, string ProgramAdi, string? Donem, string Durum, DateTime BaslangicTarihi, DateTime? BitisTarihi);
public record GelisimAdimiDto(Guid Id, DateTime Tarih, string Baslik, string? Aciklama);
public record SatisKaydiDto(Guid Id, string Donem, decimal Ciro, decimal? Ihracat, string OnayDurumu, string? ReviewNotu, DateTime CreatedAt);
public record YatirimKaydiDto(Guid Id, string Tur, decimal Tutar, string ParaBirimi, DateTime Tarih, string? YatirimciAdi, string OnayDurumu, string? ReviewNotu, DateTime CreatedAt);
public record BasariDto(Guid Id, string Tur, string Baslik, string? Aciklama, DateTime Tarih, string OnayDurumu, string? ReviewNotu, DateTime CreatedAt);
public record IstihdamKaydiDto(Guid Id, string Donem, int CalisanSayisi, int? YeniIseAlim, string OnayDurumu, string? ReviewNotu, DateTime CreatedAt);
public record AddIstihdamKaydiRequest(string Donem, int CalisanSayisi, int? YeniIseAlim);
public record DokumanDto(Guid Id, string Baslik, string DosyaAdi, string DosyaUrl, long DosyaBoyutu, string Tur, string OnayDurumu, string? ReviewNotu, DateTime CreatedAt);
public record GuncellemeTalebiDto(
    Guid Id, string Ad, string? Sektor, string? KisaTanim, string? Teknoloji, string? WebsiteUrl,
    int? KurulusYili, int? EkipBuyuklugu, string OnayDurumu, string? ReviewNotu, DateTime CreatedAt);

public record GirisimContactDto(string AdSoyad, string? Unvan, string? Telefon, string? Email, string? LinkedInUrl, DateTime UpdatedAt);
public record UpsertGirisimContactRequest(string AdSoyad, string? Unvan, string? Telefon, string? Email, string? LinkedInUrl);

/// <summary>Rakip karşılaştırma panelindeki bir girişim satırı — filtre kriterlerine uyan set + son 6 ay trendi.</summary>
public record GirisimKarsilastirmaDto(
    Guid Id, string Ad, string? Sektor, int? KurulusYili, int? EkipBuyuklugu, string? LogoUrl,
    decimal ToplamOnayliCiro, decimal ToplamOnayliYatirim, List<AylikTrendDto> AylikTrend);

public record RakipAnaliziRequest(List<Guid> GirisimIds);

public record GirisimDetailDto(
    Guid Id, string Ad, string? Sektor, string? KisaTanim, string? Teknoloji, string? WebsiteUrl,
    int? KurulusYili, int? EkipBuyuklugu, string? LogoUrl, DateTime CreatedAt,
    List<ProgramKatilimOzetDto> ProgramKatilimlari,
    List<GelisimAdimiDto> GelisimAdimlari,
    List<SatisKaydiDto> SatisKayitlari,
    List<YatirimKaydiDto> YatirimKayitlari,
    List<BasariDto> Basarilar,
    List<IstihdamKaydiDto> IstihdamKayitlari,
    List<DokumanDto> Dokumanlar,
    GirisimContactDto? Contact);

public record AddGelisimAdimiRequest(DateTime Tarih, string Baslik, string? Aciklama);
public record AddSatisKaydiRequest(string Donem, decimal Ciro, decimal? Ihracat);
public record AddYatirimKaydiRequest(string Tur, decimal Tutar, string ParaBirimi, DateTime Tarih, string? YatirimciAdi);
public record AddBasariRequest(string Tur, string Baslik, string? Aciklama, DateTime Tarih);
public record SubmitGuncellemeTalebiRequest(string Ad, string? Sektor, string? KisaTanim, string? Teknoloji, string? WebsiteUrl, int? KurulusYili, int? EkipBuyuklugu);

public static class GirisimDtoExtensions
{
    /// <param name="saglik">Puan/seviye ayrı hesaplandığı için dışarıdan verilir; yoksa sıfır puan gösterilir.</param>
    public static GirisimSummaryDto ToSummaryDto(this Girisim g, GirisimSaglik? saglik = null) =>
        new(g.Id, g.Ad, g.Sektor, g.KisaTanim, g.Teknoloji, g.KurulusYili, g.EkipBuyuklugu, g.LogoUrl,
            g.SatisKayitlari.Sum(s => s.Ciro), g.CreatedAt,
            saglik?.Puan ?? 0, (saglik?.Seviye ?? GirisimSeviyesi.Bronz).ToString(), saglik?.Guncel ?? false);

    public static GirisimDetailDto ToDetailDto(this Girisim g) => new(
        g.Id, g.Ad, g.Sektor, g.KisaTanim, g.Teknoloji, g.WebsiteUrl, g.KurulusYili, g.EkipBuyuklugu, g.LogoUrl, g.CreatedAt,
        g.ProgramKatilimlari.Select(k => new ProgramKatilimOzetDto(k.Id, k.ProgramId, k.Program?.Name ?? string.Empty, k.Donem, k.Durum.ToString(), k.BaslangicTarihi, k.BitisTarihi)).ToList(),
        g.GelisimAdimlari.Select(a => new GelisimAdimiDto(a.Id, a.Tarih, a.Baslik, a.Aciklama)).ToList(),
        g.SatisKayitlari.Select(s => new SatisKaydiDto(s.Id, s.Donem, s.Ciro, s.Ihracat, s.OnayDurumu.ToString(), s.ReviewNotu, s.CreatedAt)).ToList(),
        g.YatirimKayitlari.Select(y => new YatirimKaydiDto(y.Id, y.Tur.ToString(), y.Tutar, y.ParaBirimi, y.Tarih, y.YatirimciAdi, y.OnayDurumu.ToString(), y.ReviewNotu, y.CreatedAt)).ToList(),
        g.Basarilar.Select(b => new BasariDto(b.Id, b.Tur.ToString(), b.Baslik, b.Aciklama, b.Tarih, b.OnayDurumu.ToString(), b.ReviewNotu, b.CreatedAt)).ToList(),
        g.IstihdamKayitlari.Select(i => new IstihdamKaydiDto(i.Id, i.Donem, i.CalisanSayisi, i.YeniIseAlim, i.OnayDurumu.ToString(), i.ReviewNotu, i.CreatedAt)).ToList(),
        g.Dokumanlar.Select(d => new DokumanDto(d.Id, d.Baslik, d.DosyaAdi, d.DosyaUrl, d.DosyaBoyutu, d.Tur.ToString(), d.OnayDurumu.ToString(), d.ReviewNotu, d.CreatedAt)).ToList(),
        g.Contact is null ? null : new GirisimContactDto(g.Contact.AdSoyad, g.Contact.Unvan, g.Contact.Telefon, g.Contact.Email, g.Contact.LinkedInUrl, g.Contact.UpdatedAt));
}

/// <summary>Sequoia şablonuna göre üretilmiş sunum taslağının tek bölümü.</summary>
public record PitchDeckBolumuDto(string Anahtar, string Baslik, string Icerik, bool ElleDuzenlendi, bool AiMetniVar);

/// <summary>Bölüm metnini elle günceller; <c>Icerik</c> boş bırakılırsa AI metnine geri dönülür.</summary>
public record PitchDeckBolumGuncelleRequest(string? Icerik);

/// <summary>
/// Girişimin güncel sunum taslağı. <c>Guncel=false</c> ise taslak üretildikten sonra girişim
/// verisi değişmiş demektir; arayüz "yeniden üret" uyarısı gösterir.
/// </summary>
public record PitchDeckDto(
    List<PitchDeckBolumuDto> Bolumler, DateTime OlusturulmaTarihi, string OlusturanAdSoyad, bool Guncel);

/// <summary>Tek bir girişim için üretilmiş AI analizi.</summary>
public record GirisimAnalizDto(string Metin, DateTime CreatedAt, string CreatedByAdSoyad, string Tur);

public record HazirlikKriteriDto(string Anahtar, string Baslik, string NedenOnemli, bool Karsilandi, string? Ipucu);

/// <summary>Girişimin yatırımcı görüşmesine hazırlık durumu.</summary>
public record YatirimciHazirligiDto(int Yuzde, string Durum, List<HazirlikKriteriDto> Kriterler);
