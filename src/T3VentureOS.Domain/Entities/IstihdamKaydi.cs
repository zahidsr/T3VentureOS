namespace T3VentureOS.Domain.Entities;

/// <summary>
/// Girişimin bir dönem sonundaki çalışan sayısı. Ciro ve yatırım gibi onay akışından geçer.
///
/// Profildeki "ekip büyüklüğü" tek bir anlık sayıdır ve geçmişi tutmaz; istihdamın zaman içindeki
/// seyrini göstermek (ve ekosistem düzeyinde toplamak) için döneme bağlı kayıtlar gerekir.
/// </summary>
public class IstihdamKaydi
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid GirisimId { get; set; }

    /// <summary>Satış kayıtlarıyla aynı biçim: "2026-Q1".</summary>
    public string Donem { get; set; } = string.Empty;

    /// <summary>Dönem sonundaki toplam çalışan sayısı.</summary>
    public int CalisanSayisi { get; set; }

    /// <summary>Dönem içinde yapılan yeni işe alım sayısı — girişimci biliyorsa girer.</summary>
    public int? YeniIseAlim { get; set; }

    public OnayDurumu OnayDurumu { get; set; } = OnayDurumu.Beklemede;
    public Guid SubmittedById { get; set; }
    public Guid? ReviewedById { get; set; }
    public string? ReviewNotu { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Girisim? Girisim { get; set; }
    public User? SubmittedBy { get; set; }
    public User? ReviewedBy { get; set; }
}
