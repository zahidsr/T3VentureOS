using T3VentureOS.Domain;
using T3VentureOS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace T3VentureOS.Infrastructure.Services;

/// <summary>Bir girişimin panelde görünen sağlık kartı: profili ne kadar dolu, en son ne zaman veri girmiş, kaç kaydı onay bekliyor.</summary>
public record GirisimSaglik(
    Guid GirisimId,
    string Ad,
    string? Sektor,
    string? LogoUrl,
    int TamamlananAdim,
    int ToplamAdim,
    DateTime? SonVeriGirisi,
    int GuncellemeUzerindenGecenGun,
    int BekleyenKayitSayisi,
    bool IletisimVar,
    bool SunumVar);

/// <summary>Panelin tek çağrıda ihtiyaç duyduğu her şey — sayılar ve "şuna bakılması lazım" listeleri.</summary>
public record PanelOzeti(
    int ToplamGirisim,
    int AktifProgramSayisi,
    int BekleyenOnaySayisi,
    decimal ToplamOnayliCiro,
    decimal ToplamOnayliYatirim,
    int EnEskiBekleyenOnayGun,
    int IletisimsizGirisimSayisi,
    int SunumsuzGirisimSayisi,
    List<GirisimSaglik> UzunSuredirGuncellenmeyenler,
    List<GirisimSaglik> ProfiliEksikOlanlar,
    List<GirisimSaglik> TumGirisimler);

/// <summary>
/// Girişimlerin "ne durumda" sorusunu tek sorguda cevaplar. SuperAdmin paneli buradan beslenir;
/// aynı hesap ileride girişimciye gösterilecek tamamlanma skorunun da kaynağıdır.
///
/// Not: <see cref="OnboardingService"/> ile karıştırılmamalı — o, girişimcinin ilk giriş kontrol
/// listesidir (e-posta doğrulama gibi kullanıcıya özel adımlar içerir). Buradaki liste ise
/// girişimin kurumsal olarak takip edilebilir olup olmadığını ölçer: sunum ve iletişim kişisi dahil.
/// </summary>
public class GirisimSaglikService
{
    /// <summary>Bu süreden uzun zamandır veri girilmemiş girişimler panelde "dikkat" listesine düşer.</summary>
    public const int BayatlikEsigiGun = 30;

    private readonly AppDbContext _db;

    public GirisimSaglikService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<GirisimSaglik>> GetTumSaglikAsync()
    {
        var girisimler = await _db.Girisimler
            .Select(g => new
            {
                g.Id,
                g.Ad,
                g.Sektor,
                g.LogoUrl,
                g.KisaTanim,
                g.UpdatedAt,
                IletisimVar = g.Contact != null,
                SunumVar = g.Dokumanlar.Any(d => d.Tur == DokumanTuru.Sunum),
                SatisVar = g.SatisKayitlari.Any(),
                GelisimVar = g.GelisimAdimlari.Any(),
                // "Son veri girişi" girişimcinin sisteme en son ne zaman dokunduğudur; profil
                // düzenlemesi de bir veri girişidir, bu yüzden UpdatedAt de hesaba katılır.
                SonSatis = g.SatisKayitlari.Max(x => (DateTime?)x.CreatedAt),
                SonYatirim = g.YatirimKayitlari.Max(x => (DateTime?)x.CreatedAt),
                SonBasari = g.Basarilar.Max(x => (DateTime?)x.CreatedAt),
                SonDokuman = g.Dokumanlar.Max(x => (DateTime?)x.CreatedAt),
                SonGelisim = g.GelisimAdimlari.Max(x => (DateTime?)x.CreatedAt),
                BekleyenSatis = g.SatisKayitlari.Count(x => x.OnayDurumu == OnayDurumu.Beklemede),
                BekleyenYatirim = g.YatirimKayitlari.Count(x => x.OnayDurumu == OnayDurumu.Beklemede),
                BekleyenBasari = g.Basarilar.Count(x => x.OnayDurumu == OnayDurumu.Beklemede),
                BekleyenDokuman = g.Dokumanlar.Count(x => x.OnayDurumu == OnayDurumu.Beklemede),
            })
            .ToListAsync();

        var simdi = DateTime.UtcNow;

        return girisimler
            .Select(g =>
            {
                var adimlar = new[]
                {
                    !string.IsNullOrWhiteSpace(g.LogoUrl),
                    !string.IsNullOrWhiteSpace(g.KisaTanim),
                    g.IletisimVar,
                    g.SunumVar,
                    g.SatisVar,
                    g.GelisimVar,
                };

                var sonVeriGirisi = new[] { g.SonSatis, g.SonYatirim, g.SonBasari, g.SonDokuman, g.SonGelisim, g.UpdatedAt }
                    .Where(d => d.HasValue)
                    .Max();

                return new GirisimSaglik(
                    g.Id, g.Ad, g.Sektor, g.LogoUrl,
                    TamamlananAdim: adimlar.Count(a => a),
                    ToplamAdim: adimlar.Length,
                    SonVeriGirisi: sonVeriGirisi,
                    GuncellemeUzerindenGecenGun: sonVeriGirisi.HasValue ? (int)(simdi - sonVeriGirisi.Value).TotalDays : int.MaxValue,
                    BekleyenKayitSayisi: g.BekleyenSatis + g.BekleyenYatirim + g.BekleyenBasari + g.BekleyenDokuman,
                    IletisimVar: g.IletisimVar,
                    SunumVar: g.SunumVar);
            })
            .OrderBy(g => g.Ad)
            .ToList();
    }

    public async Task<PanelOzeti> GetPanelOzetiAsync()
    {
        var saglik = await GetTumSaglikAsync();

        var aktifProgram = await _db.Programlar.CountAsync(p => p.Durum == ProgramDurumu.Aktif);
        var onayliCiro = await _db.SatisKayitlari.Where(s => s.OnayDurumu == OnayDurumu.Onaylandi).SumAsync(s => (decimal?)s.Ciro) ?? 0;
        var onayliYatirim = await _db.YatirimKayitlari.Where(y => y.OnayDurumu == OnayDurumu.Onaylandi).SumAsync(y => (decimal?)y.Tutar) ?? 0;

        var enEskiBekleyen = await EnEskiBekleyenOnayTarihiAsync();

        return new PanelOzeti(
            ToplamGirisim: saglik.Count,
            AktifProgramSayisi: aktifProgram,
            BekleyenOnaySayisi: saglik.Sum(s => s.BekleyenKayitSayisi),
            ToplamOnayliCiro: onayliCiro,
            ToplamOnayliYatirim: onayliYatirim,
            EnEskiBekleyenOnayGun: enEskiBekleyen.HasValue ? (int)(DateTime.UtcNow - enEskiBekleyen.Value).TotalDays : 0,
            IletisimsizGirisimSayisi: saglik.Count(s => !s.IletisimVar),
            SunumsuzGirisimSayisi: saglik.Count(s => !s.SunumVar),
            UzunSuredirGuncellenmeyenler: saglik
                .Where(s => s.GuncellemeUzerindenGecenGun >= BayatlikEsigiGun)
                .OrderByDescending(s => s.GuncellemeUzerindenGecenGun)
                .Take(5)
                .ToList(),
            ProfiliEksikOlanlar: saglik
                .Where(s => s.TamamlananAdim < s.ToplamAdim)
                .OrderBy(s => s.TamamlananAdim)
                .Take(5)
                .ToList(),
            TumGirisimler: saglik);
    }

    private async Task<DateTime?> EnEskiBekleyenOnayTarihiAsync()
    {
        var tarihler = new[]
        {
            await _db.SatisKayitlari.Where(x => x.OnayDurumu == OnayDurumu.Beklemede).MinAsync(x => (DateTime?)x.CreatedAt),
            await _db.YatirimKayitlari.Where(x => x.OnayDurumu == OnayDurumu.Beklemede).MinAsync(x => (DateTime?)x.CreatedAt),
            await _db.Basarilar.Where(x => x.OnayDurumu == OnayDurumu.Beklemede).MinAsync(x => (DateTime?)x.CreatedAt),
            await _db.Dokumanlar.Where(x => x.OnayDurumu == OnayDurumu.Beklemede).MinAsync(x => (DateTime?)x.CreatedAt),
        };
        return tarihler.Where(t => t.HasValue).Min();
    }
}
