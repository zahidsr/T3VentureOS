namespace T3VentureOS.Domain.Entities;

/// <summary>
/// A ProgramYoneticisi's non-binding recommendation on a pending record. Approval authority sits
/// solely with SuperAdmin, so a program manager reviews the submission and leaves an
/// onay/ret/çekince note here; the SuperAdmin sees it next to the item in the onay kuyruğu.
///
/// Polymorphic over the six record types that carry an OnayDurumu — same (KonuTuru, KonuId) shape
/// <see cref="Itiraz"/> already uses, rather than six near-identical columns on six tables.
/// </summary>
public class OnayOnerisi
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public OnayKonusuTuru KonuTuru { get; set; }

    /// <summary>Id of the pending record being recommended on (polymorphic — see KonuTuru).</summary>
    public Guid KonuId { get; set; }

    public OneriTavsiyesi Tavsiye { get; set; }

    /// <summary>Required for Ret/Çekince — a bare "reddedilsin" tells the SuperAdmin nothing.</summary>
    public string? Not { get; set; }

    public Guid OneriVerenId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    public User? OneriVeren { get; set; }
}
