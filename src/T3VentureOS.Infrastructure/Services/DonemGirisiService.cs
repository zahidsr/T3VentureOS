using T3VentureOS.Domain;
using T3VentureOS.Domain.Entities;
using T3VentureOS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace T3VentureOS.Infrastructure.Services;

public record EksikDonem(string Donem, bool CiroEksik, bool IstihdamEksik);

public record DonemGirisiSonucu(
    string Donem, int OncekiPuan, int YeniPuan, int EklenenKayitSayisi, List<string> Kazanimlar);

/// <summary>
/// Girişimcinin bir çeyreğin tüm sayısal verisini tek seferde girmesini sağlar.
///
/// Veriler ayrı sayfalardaki ayrı formlardan giriliyordu: ciro için bir sayfa, istihdam için
/// başka, yatırım için başka. Girişimcinin bunu her çeyrek yapması beklenemezdi. Tek çağrı ile
/// hepsi birden kaydedilir; girilmeyen alanlar atlanır.
/// </summary>
public class DonemGirisiService
{
    private readonly AppDbContext _db;
    private readonly GirisimSaglikService _saglik;
    private readonly NotificationService _bildirimler;

    public DonemGirisiService(AppDbContext db, GirisimSaglikService saglik, NotificationService bildirimler)
    {
        _db = db;
        _saglik = saglik;
        _bildirimler = bildirimler;
    }

    public static string DonemEtiketi(DateTime tarih) => $"{tarih.Year}-Q{(tarih.Month - 1) / 3 + 1}";

    /// <summary>İçinde bulunulan çeyrek henüz kapanmadığı için istenmez; bir öncesi istenir.</summary>
    public static string SonKapananDonem(DateTime simdi) => DonemEtiketi(simdi.AddMonths(-3));

    /// <summary>
    /// Son <paramref name="kacDonem"/> kapanmış çeyrekten hangilerinde veri eksik. Reddedilmiş
    /// kayıtlar "girilmiş" sayılmaz; girişimcinin yeniden girmesi beklenir.
    /// </summary>
    public async Task<List<EksikDonem>> EksikDonemlerAsync(Guid girisimId, int kacDonem = 4, DateTime? simdi = null)
    {
        var an = simdi ?? DateTime.UtcNow;

        var ciroDonemleri = await _db.SatisKayitlari
            .Where(s => s.GirisimId == girisimId && s.OnayDurumu != OnayDurumu.Reddedildi)
            .Select(s => s.Donem)
            .ToListAsync();

        var istihdamDonemleri = await _db.IstihdamKayitlari
            .Where(i => i.GirisimId == girisimId && i.OnayDurumu != OnayDurumu.Reddedildi)
            .Select(i => i.Donem)
            .ToListAsync();

        var eksikler = new List<EksikDonem>();
        for (var i = 1; i <= kacDonem; i++)
        {
            var donem = DonemEtiketi(an.AddMonths(-3 * i));
            var ciroEksik = !ciroDonemleri.Contains(donem);
            var istihdamEksik = !istihdamDonemleri.Contains(donem);
            if (ciroEksik || istihdamEksik) eksikler.Add(new EksikDonem(donem, ciroEksik, istihdamEksik));
        }

        return eksikler;
    }

    /// <summary>
    /// Son kapanmış çeyreğin verisini girmemiş girişimlerin temsilcilerine hatırlatma bildirimi
    /// gönderir. Yöneticinin tek tek peşine düşmesi yerine tek hamlede yapılır.
    /// </summary>
    public async Task<(int Gonderilen, string Donem)> HatirlatmaGonderAsync(DateTime? simdi = null)
    {
        var an = simdi ?? DateTime.UtcNow;
        var donem = SonKapananDonem(an);

        var veriGirenler = await _db.SatisKayitlari
            .Where(s => s.Donem == donem && s.OnayDurumu != OnayDurumu.Reddedildi)
            .Select(s => s.GirisimId)
            .Distinct()
            .ToListAsync();

        // Bildirim, girişimin kendi temsilcisine gider; temsilcisi olmayan girişimler atlanır.
        var hedefler = await _db.Users
            .Where(u => u.Role == UserRole.StartupKullanicisi
                        && u.Status == UserStatus.Active
                        && u.GirisimId != null
                        && !veriGirenler.Contains(u.GirisimId.Value))
            .Select(u => new { u.Id, GirisimId = u.GirisimId!.Value })
            .ToListAsync();

        foreach (var hedef in hedefler)
        {
            await _bildirimler.CreateAsync(
                hedef.Id,
                BildirimTuru.Sistem,
                $"{donem} verisi bekleniyor",
                $"{donem} çeyreği kapandı ve girişiminin verisi henüz girilmedi. Ciro, ihracat ve çalışan sayını tek ekrandan birkaç dakikada girebilirsin.",
                hedef.GirisimId);
        }

        return (hedefler.Count, donem);
    }

    public async Task<(bool Success, DonemGirisiSonucu? Sonuc, string? Error)> KaydetAsync(
        Guid girisimId, Guid kullaniciId, string donem,
        decimal? ciro, decimal? ihracat, int? calisanSayisi, int? yeniIseAlim,
        string? yatirimTuru, decimal? yatirimTutari, DateTime? yatirimTarihi, string? yatirimciAdi)
    {
        if (string.IsNullOrWhiteSpace(donem)) return (false, null, "Dönem zorunludur.");
        if (ciro is null && calisanSayisi is null && yatirimTutari is null)
            return (false, null, "En az bir alan doldurulmalı.");

        var oncekiPuan = await _db.Girisimler.Where(g => g.Id == girisimId).Select(g => g.Puan).FirstOrDefaultAsync();
        var kazanimlar = new List<string>();
        var eklenen = 0;

        if (ciro is not null)
        {
            var mevcut = await _db.SatisKayitlari
                .AnyAsync(s => s.GirisimId == girisimId && s.Donem == donem && s.OnayDurumu != OnayDurumu.Reddedildi);
            if (mevcut) return (false, null, $"{donem} dönemi için zaten bir ciro kaydın var.");

            _db.SatisKayitlari.Add(new SatisKaydi
            {
                GirisimId = girisimId, Donem = donem, Ciro = ciro.Value, Ihracat = ihracat,
                SubmittedById = kullaniciId,
            });
            eklenen++;
            kazanimlar.Add(ihracat is > 0
                ? $"{donem} cirosu ve ihracatı onaya gönderildi."
                : $"{donem} cirosu onaya gönderildi.");
        }

        if (calisanSayisi is not null)
        {
            var mevcut = await _db.IstihdamKayitlari
                .AnyAsync(i => i.GirisimId == girisimId && i.Donem == donem && i.OnayDurumu != OnayDurumu.Reddedildi);
            if (mevcut) return (false, null, $"{donem} dönemi için zaten bir istihdam kaydın var.");

            _db.IstihdamKayitlari.Add(new IstihdamKaydi
            {
                GirisimId = girisimId, Donem = donem, CalisanSayisi = calisanSayisi.Value,
                YeniIseAlim = yeniIseAlim, SubmittedById = kullaniciId,
            });
            eklenen++;
            kazanimlar.Add(yeniIseAlim is > 0
                ? $"{donem} istihdamı ({yeniIseAlim} yeni işe alım) onaya gönderildi."
                : $"{donem} istihdam kaydı onaya gönderildi.");
        }

        if (yatirimTutari is > 0)
        {
            if (!Enum.TryParse<YatirimTuru>(yatirimTuru, ignoreCase: true, out var tur))
                return (false, null, "Geçersiz yatırım türü.");

            _db.YatirimKayitlari.Add(new YatirimKaydi
            {
                GirisimId = girisimId, Tur = tur, Tutar = yatirimTutari.Value, ParaBirimi = "TRY",
                Tarih = yatirimTarihi ?? DateTime.UtcNow, YatirimciAdi = yatirimciAdi,
                SubmittedById = kullaniciId,
            });
            eklenen++;
            kazanimlar.Add($"{tur} yatırımı onaya gönderildi.");
        }

        if (eklenen == 0) return (false, null, "Kaydedilecek bir veri yok.");

        await _db.SaveChangesAsync();

        // Puan yalnızca onaylı kayıtlardan hesaplandığı için bu aşamada genelde değişmez; bunu
        // gizlemek yerine açıkça söylemek girişimcinin beklentisini doğru kuruyor.
        var yeniPuan = await _db.Girisimler.Where(g => g.Id == girisimId).Select(g => g.Puan).FirstOrDefaultAsync();
        var saglik = await _saglik.GetAsync(girisimId);
        if (saglik is not null && saglik.SonrakiAdimlar.Count > 0)
            kazanimlar.Add($"Sıradaki adımın: {saglik.SonrakiAdimlar[0].Aciklama} (+{saglik.SonrakiAdimlar[0].Puan} puan)");

        return (true, new DonemGirisiSonucu(donem, oncekiPuan, yeniPuan, eklenen, kazanimlar), null);
    }
}
