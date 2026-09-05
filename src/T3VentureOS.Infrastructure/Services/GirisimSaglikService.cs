using T3VentureOS.Domain;
using T3VentureOS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace T3VentureOS.Infrastructure.Services;

/// <summary>Girişimciye "şunu yaparsan şu kadar puan" diye gösterilen tek adım.</summary>
public record SonrakiAdim(string Aciklama, int Puan);

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
    bool SunumVar,
    int Puan,
    GirisimSeviyesi Seviye,
    bool Guncel,
    List<SonrakiAdim> SonrakiAdimlar);

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
    List<GirisimSaglik> OneCikanlar,
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

    /// <summary>Tek bir girişimin sağlık kartı — girişim künyesinde kullanılır.</summary>
    public async Task<GirisimSaglik?> GetAsync(Guid girisimId) =>
        (await GetTumSaglikAsync([girisimId])).FirstOrDefault();

    /// <param name="girisimIds">Verilirse yalnızca bu girişimler hesaplanır; null ise tümü.</param>
    public async Task<List<GirisimSaglik>> GetTumSaglikAsync(IReadOnlyCollection<Guid>? girisimIds = null)
    {
        var db = _db;
        var girisimler = await _db.Girisimler
            .Where(g => girisimIds == null || girisimIds.Contains(g.Id))
            .Select(g => new
            {
                g.Id,
                g.Ad,
                g.Sektor,
                g.LogoUrl,
                g.KisaTanim,
                g.UpdatedAt,
                IletisimVar = g.Contact != null,
                // "Tanıtım sunumu var mı": ya girişimci bir sunum dosyası yüklemiştir ya da
                // sistemde üretilmiş bir sunum taslağı vardır — ikisi de yöneticinin
                // "bu takım kimdi" sorusunu cevaplar.
                SunumVar = g.Dokumanlar.Any(d => d.Tur == DokumanTuru.Sunum)
                           || db.SunumTaslaklari.Any(t => t.GirisimId == g.Id),
                SatisVar = g.SatisKayitlari.Any(),
                GelisimVar = g.GelisimAdimlari.Any(),
                SatisSayisi = g.SatisKayitlari.Count(x => x.OnayDurumu == OnayDurumu.Onaylandi),
                YatirimSayisi = g.YatirimKayitlari.Count(x => x.OnayDurumu == OnayDurumu.Onaylandi),
                BasariSayisi = g.Basarilar.Count(x => x.OnayDurumu == OnayDurumu.Onaylandi),
                GelisimSayisi = g.GelisimAdimlari.Count(),
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

                var gecenGun = sonVeriGirisi.HasValue ? (int)(simdi - sonVeriGirisi.Value).TotalDays : int.MaxValue;

                var (puan, sonrakiAdimlar) = PuanHesapla(
                    logoVar: adimlar[0], kisaTanimVar: adimlar[1], iletisimVar: adimlar[2], sunumVar: adimlar[3],
                    satisSayisi: g.SatisSayisi, yatirimSayisi: g.YatirimSayisi,
                    basariSayisi: g.BasariSayisi, gelisimSayisi: g.GelisimSayisi);

                return new GirisimSaglik(
                    g.Id, g.Ad, g.Sektor, g.LogoUrl,
                    TamamlananAdim: adimlar.Count(a => a),
                    ToplamAdim: adimlar.Length,
                    SonVeriGirisi: sonVeriGirisi,
                    GuncellemeUzerindenGecenGun: gecenGun,
                    BekleyenKayitSayisi: g.BekleyenSatis + g.BekleyenYatirim + g.BekleyenBasari + g.BekleyenDokuman,
                    IletisimVar: g.IletisimVar,
                    SunumVar: g.SunumVar,
                    Puan: puan,
                    Seviye: SeviyeBelirle(puan),
                    Guncel: gecenGun < BayatlikEsigiGun,
                    SonrakiAdimlar: sonrakiAdimlar);
            })
            .OrderBy(g => g.Ad)
            .ToList();
    }

    // ------------------------------------------------------------------ puanlama

    /// <summary>
    /// Girişim puanı (0-100). Yalnızca girilmiş veriyi ödüllendirir; hiçbir bileşeni zamanla
    /// erimez — girişimcinin emek verip kazandığı puan geri alınmaz. Güncellik ayrı bir işaret
    /// olarak taşınır (bkz. <see cref="GirisimSaglik.Guncel"/>).
    ///
    /// Formül bilerek basit ve açıklanabilir: girişimciye "şunu yaparsan şu kadar kazanırsın"
    /// diye gösterilebilsin. Kayıt sayıları azalan getiriyle sayılır, yoksa aynı kaydı defalarca
    /// girmek puan kasmaya döner.
    /// </summary>
    public static (int Puan, List<SonrakiAdim> SonrakiAdimlar) PuanHesapla(
        bool logoVar, bool kisaTanimVar, bool iletisimVar, bool sunumVar,
        int satisSayisi, int yatirimSayisi, int basariSayisi, int gelisimSayisi)
    {
        // Profil 50 + kayıt derinliği 50 = 100. Bileşenler tam olarak toplanmalı: aksi hâlde
        // arayüzdeki "/100" ulaşılamaz bir hedef gösterir.
        const int KisaTanimPuani = 15;
        const int IletisimPuani = 15;
        const int LogoPuani = 10;
        const int SunumPuani = 10;

        var puan = 0;
        var adimlar = new List<SonrakiAdim>();

        void ProfilAdimi(bool tamam, int deger, string aciklama)
        {
            if (tamam) puan += deger;
            else adimlar.Add(new SonrakiAdim(aciklama, deger));
        }

        ProfilAdimi(kisaTanimVar, KisaTanimPuani, "Girişimini bir paragrafla tanıt (kısa tanım)");
        ProfilAdimi(iletisimVar, IletisimPuani, "İletişim muhatabını ekle");
        ProfilAdimi(logoVar, LogoPuani, "Logonu yükle");
        ProfilAdimi(sunumVar, SunumPuani, "Sunum taslağını oluştur");

        // Kayıt derinliği: her kayıt türü kendi tavanına kadar sayılır.
        int Derinlik(int sayi, int birimPuan, int tavanAdet, string aciklama)
        {
            var sayilan = Math.Min(sayi, tavanAdet);
            if (sayilan < tavanAdet)
            {
                adimlar.Add(new SonrakiAdim(
                    sayi == 0 ? aciklama : $"{aciklama} (her kayıt +{birimPuan} puan)",
                    birimPuan));
            }
            return sayilan * birimPuan;
        }

        puan += Derinlik(satisSayisi, 5, 4, "Onaylı satış/ciro kaydı gir");   // 20
        puan += Derinlik(yatirimSayisi, 6, 2, "Aldığın yatırımı kaydet");     // 12
        puan += Derinlik(gelisimSayisi, 2, 5, "Gelişim adımı ekle");          // 10
        puan += Derinlik(basariSayisi, 4, 2, "Ödül, hibe ya da sertifikanı ekle"); // 8

        // En çok puan getiren adım başa gelsin: girişimci en verimli hamleyi görsün.
        return (Math.Min(puan, 100), adimlar.OrderByDescending(a => a.Puan).ToList());
    }

    public static GirisimSeviyesi SeviyeBelirle(int puan) => puan switch
    {
        >= 85 => GirisimSeviyesi.Platin,
        >= 65 => GirisimSeviyesi.Altin,
        >= 40 => GirisimSeviyesi.Gumus,
        _ => GirisimSeviyesi.Bronz,
    };

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
            // Yüksek puanın karşılığı: yöneticinin panelinde görünür olmak.
            OneCikanlar: saglik
                .OrderByDescending(s => s.Puan)
                .ThenBy(s => s.Ad)
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
