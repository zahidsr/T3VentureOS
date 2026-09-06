using T3VentureOS.Domain;

namespace T3VentureOS.Domain.Entities;

/// <summary>Join entity: which startup took part in which program, in which term, with what outcome.</summary>
public class ProgramKatilimi
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid GirisimId { get; set; }
    public Guid ProgramId { get; set; }
    public string? Donem { get; set; }
    public KatilimDurumu Durum { get; set; } = KatilimDurumu.Basvuru;
    public DateTime BaslangicTarihi { get; set; } = DateTime.UtcNow;
    public DateTime? BitisTarihi { get; set; }
    /// <summary>
    /// Girişimin programa girdiği andaki aşaması. Sonradan hesaplamak yerine o an dondurulur:
    /// aşama sonradan değiştiğinde "programa hangi aşamada girdi" cevabı bozulmasın.
    /// </summary>
    public GirisimAsamasi? BaslangictakiAsama { get; set; }

    /// <summary>Girişimin programdan ayrıldığı/mezun olduğu andaki aşaması; program bitmeden null.</summary>
    public GirisimAsamasi? BitistekiAsama { get; set; }

    public string? Notlar { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Girisim? Girisim { get; set; }
    public GirisimProgrami? Program { get; set; }
}
