using T3VentureOS.Domain;
using T3VentureOS.Domain.Entities;
using T3VentureOS.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;

namespace T3VentureOS.Infrastructure.Data;

public class AppDbContext : DbContext
{
    /// <summary>Puan tazelemesi kendi SaveChanges'ini çağırdığı için sonsuz döngüyü engelleyen bayrak.</summary>
    private bool _puanTazeleniyor;

    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    /// <summary>
    /// Girişim puanı türetilmiş bir değer ama sıralanabilmesi için tabloda tutuluyor. Puanı
    /// etkileyen onlarca uç nokta var; her birine tek tek "puanı güncelle" çağrısı serpiştirmek
    /// er ya da geç bir yerin atlanmasıyla sonuçlanırdı. Bunun yerine kaydetme işleminin kendisi
    /// hangi girişimlerin etkilendiğini görüp puanlarını tazeliyor.
    /// </summary>
    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        if (_puanTazeleniyor) return await base.SaveChangesAsync(cancellationToken);

        var etkilenen = PuaniEtkilenenGirisimler();
        var sonuc = await base.SaveChangesAsync(cancellationToken);
        if (etkilenen.Count == 0) return sonuc;

        _puanTazeleniyor = true;
        try
        {
            await PuanlariTazeleAsync(etkilenen, cancellationToken);
        }
        finally
        {
            _puanTazeleniyor = false;
        }
        return sonuc;
    }

    private HashSet<Guid> PuaniEtkilenenGirisimler()
    {
        var idler = new HashSet<Guid>();
        foreach (var entry in ChangeTracker.Entries())
        {
            if (entry.State is EntityState.Unchanged or EntityState.Detached) continue;

            var id = entry.Entity switch
            {
                Girisim g => g.Id,
                SatisKaydi x => x.GirisimId,
                YatirimKaydi x => x.GirisimId,
                Basari x => x.GirisimId,
                IstihdamKaydi x => x.GirisimId,
                Dokuman x => x.GirisimId,
                GelisimAdimi x => x.GirisimId,
                GirisimContact x => x.GirisimId,
                SunumTaslagi x => x.GirisimId,
                _ => (Guid?)null,
            };
            if (id is not null) idler.Add(id.Value);
        }
        return idler;
    }

    private async Task PuanlariTazeleAsync(HashSet<Guid> girisimIdler, CancellationToken cancellationToken)
    {
        var veriler = await Girisimler
            .Where(g => girisimIdler.Contains(g.Id))
            .Select(g => new
            {
                Girisim = g,
                LogoVar = g.LogoUrl != null && g.LogoUrl != "",
                TanimVar = g.KisaTanim != null && g.KisaTanim != "",
                IletisimVar = g.Contact != null,
                SunumVar = g.Dokumanlar.Any(d => d.Tur == DokumanTuru.Sunum)
                           || SunumTaslaklari.Any(t => t.GirisimId == g.Id),
                Satis = g.SatisKayitlari.Count(x => x.OnayDurumu == OnayDurumu.Onaylandi),
                Yatirim = g.YatirimKayitlari.Count(x => x.OnayDurumu == OnayDurumu.Onaylandi),
                Basari = g.Basarilar.Count(x => x.OnayDurumu == OnayDurumu.Onaylandi),
                Gelisim = g.GelisimAdimlari.Count(),
                Istihdam = g.IstihdamKayitlari.Count(x => x.OnayDurumu == OnayDurumu.Onaylandi),
            })
            .ToListAsync(cancellationToken);

        var degisti = false;
        foreach (var v in veriler)
        {
            var (puan, _) = GirisimSaglikService.PuanHesapla(
                v.LogoVar, v.TanimVar, v.IletisimVar, v.SunumVar, v.Satis, v.Yatirim, v.Basari, v.Gelisim, v.Istihdam);
            if (v.Girisim.Puan == puan) continue;
            v.Girisim.Puan = puan;
            degisti = true;
        }

        if (degisti) await base.SaveChangesAsync(cancellationToken);
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<Girisim> Girisimler => Set<Girisim>();
    public DbSet<GirisimProgrami> Programlar => Set<GirisimProgrami>();
    public DbSet<ProgramKatilimi> ProgramKatilimlari => Set<ProgramKatilimi>();
    public DbSet<GelisimAdimi> GelisimAdimlari => Set<GelisimAdimi>();
    public DbSet<SatisKaydi> SatisKayitlari => Set<SatisKaydi>();
    public DbSet<YatirimKaydi> YatirimKayitlari => Set<YatirimKaydi>();
    public DbSet<Basari> Basarilar => Set<Basari>();
    public DbSet<IstihdamKaydi> IstihdamKayitlari => Set<IstihdamKaydi>();
    public DbSet<Dokuman> Dokumanlar => Set<Dokuman>();
    public DbSet<GirisimContact> GirisimContactlar => Set<GirisimContact>();
    public DbSet<GirisimGuncellemeTalebi> GirisimGuncellemeTalepleri => Set<GirisimGuncellemeTalebi>();
    public DbSet<VerificationToken> VerificationTokens => Set<VerificationToken>();
    public DbSet<Bildirim> Bildirimler => Set<Bildirim>();
    public DbSet<Itiraz> Itirazlar => Set<Itiraz>();
    public DbSet<OnayOnerisi> OnayOnerileri => Set<OnayOnerisi>();
    public DbSet<SunumTaslagi> SunumTaslaklari => Set<SunumTaslagi>();
    public DbSet<SilmeTalebi> SilmeTalepleri => Set<SilmeTalebi>();
    public DbSet<IslemKaydi> IslemKayitlari => Set<IslemKaydi>();
    public DbSet<AiAnalizKaydi> AiAnalizKayitlari => Set<AiAnalizKaydi>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        base.OnModelCreating(b);

        b.Entity<User>(e =>
        {
            e.HasIndex(x => x.Email).IsUnique();
            e.HasIndex(x => x.Role);
            e.Property(x => x.Email).HasMaxLength(256).IsRequired();
            e.Property(x => x.FullName).HasMaxLength(200).IsRequired();
            e.HasOne(x => x.Girisim).WithMany().HasForeignKey(x => x.GirisimId).OnDelete(DeleteBehavior.SetNull);
        });

        b.Entity<Girisim>(e =>
        {
            e.Property(x => x.Ad).HasMaxLength(200).IsRequired();
            e.HasOne(x => x.CreatedBy).WithMany().HasForeignKey(x => x.CreatedById).OnDelete(DeleteBehavior.Restrict);
        });

        b.Entity<GirisimProgrami>(e =>
        {
            e.Property(x => x.Name).HasMaxLength(200).IsRequired();
            e.HasOne(x => x.CreatedBy).WithMany().HasForeignKey(x => x.CreatedById).OnDelete(DeleteBehavior.Restrict);
        });

        b.Entity<ProgramKatilimi>(e =>
        {
            e.HasIndex(x => new { x.GirisimId, x.ProgramId, x.Donem }).IsUnique();
            e.HasOne(x => x.Girisim).WithMany(g => g.ProgramKatilimlari).HasForeignKey(x => x.GirisimId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Program).WithMany(p => p.Katilimlar).HasForeignKey(x => x.ProgramId).OnDelete(DeleteBehavior.Restrict);
        });

        b.Entity<GelisimAdimi>(e =>
        {
            e.HasIndex(x => x.GirisimId);
            e.HasOne(x => x.Girisim).WithMany(g => g.GelisimAdimlari).HasForeignKey(x => x.GirisimId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.CreatedBy).WithMany().HasForeignKey(x => x.CreatedById).OnDelete(DeleteBehavior.Restrict);
        });

        b.Entity<SatisKaydi>(e =>
        {
            e.Property(x => x.Ciro).HasPrecision(14, 2);
            e.Property(x => x.Ihracat).HasPrecision(14, 2);
            e.HasOne(x => x.Girisim).WithMany(g => g.SatisKayitlari).HasForeignKey(x => x.GirisimId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.SubmittedBy).WithMany().HasForeignKey(x => x.SubmittedById).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.ReviewedBy).WithMany().HasForeignKey(x => x.ReviewedById).OnDelete(DeleteBehavior.Restrict);
        });

        b.Entity<YatirimKaydi>(e =>
        {
            e.Property(x => x.Tutar).HasPrecision(14, 2);
            e.HasOne(x => x.Girisim).WithMany(g => g.YatirimKayitlari).HasForeignKey(x => x.GirisimId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.SubmittedBy).WithMany().HasForeignKey(x => x.SubmittedById).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.ReviewedBy).WithMany().HasForeignKey(x => x.ReviewedById).OnDelete(DeleteBehavior.Restrict);
        });

        b.Entity<Basari>(e =>
        {
            e.HasOne(x => x.Girisim).WithMany(g => g.Basarilar).HasForeignKey(x => x.GirisimId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.SubmittedBy).WithMany().HasForeignKey(x => x.SubmittedById).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.ReviewedBy).WithMany().HasForeignKey(x => x.ReviewedById).OnDelete(DeleteBehavior.Restrict);
        });

        b.Entity<IstihdamKaydi>(e =>
        {
            e.HasIndex(x => new { x.GirisimId, x.Donem });
            e.Property(x => x.Donem).HasMaxLength(20).IsRequired();
            e.HasOne(x => x.Girisim).WithMany(g => g.IstihdamKayitlari).HasForeignKey(x => x.GirisimId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.SubmittedBy).WithMany().HasForeignKey(x => x.SubmittedById).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.ReviewedBy).WithMany().HasForeignKey(x => x.ReviewedById).OnDelete(DeleteBehavior.Restrict);
        });

        b.Entity<Dokuman>(e =>
        {
            e.HasOne(x => x.Girisim).WithMany(g => g.Dokumanlar).HasForeignKey(x => x.GirisimId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.SubmittedBy).WithMany().HasForeignKey(x => x.SubmittedById).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.ReviewedBy).WithMany().HasForeignKey(x => x.ReviewedById).OnDelete(DeleteBehavior.Restrict);
        });

        b.Entity<GirisimContact>(e =>
        {
            e.HasKey(x => x.GirisimId);
            e.Property(x => x.AdSoyad).HasMaxLength(200).IsRequired();
            e.HasOne(x => x.Girisim).WithOne(g => g.Contact).HasForeignKey<GirisimContact>(x => x.GirisimId).OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<GirisimGuncellemeTalebi>(e =>
        {
            e.HasOne(x => x.Girisim).WithMany().HasForeignKey(x => x.GirisimId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.SubmittedBy).WithMany().HasForeignKey(x => x.SubmittedById).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.ReviewedBy).WithMany().HasForeignKey(x => x.ReviewedById).OnDelete(DeleteBehavior.Restrict);
        });

        b.Entity<VerificationToken>(e =>
        {
            e.HasIndex(x => x.TokenHash).IsUnique();
            e.HasIndex(x => new { x.UserId, x.Type });
            e.HasOne(x => x.User).WithMany(u => u.VerificationTokens).HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<Bildirim>(e =>
        {
            e.HasIndex(x => new { x.KullaniciId, x.Okundu });
            e.HasOne(x => x.Kullanici).WithMany().HasForeignKey(x => x.KullaniciId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.IlgiliGirisim).WithMany().HasForeignKey(x => x.IlgiliGirisimId).OnDelete(DeleteBehavior.SetNull);
        });

        b.Entity<Itiraz>(e =>
        {
            e.HasIndex(x => x.KonuId);
            e.HasOne(x => x.Girisim).WithMany().HasForeignKey(x => x.GirisimId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.SubmittedBy).WithMany().HasForeignKey(x => x.SubmittedById).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.ReviewedBy).WithMany().HasForeignKey(x => x.ReviewedById).OnDelete(DeleteBehavior.Restrict);
        });

        b.Entity<OnayOnerisi>(e =>
        {
            // One standing recommendation per reviewer per record — a second submission updates it.
            e.HasIndex(x => new { x.KonuTuru, x.KonuId, x.OneriVerenId }).IsUnique();
            e.Property(x => x.Not).HasMaxLength(1000);
            e.HasOne(x => x.OneriVeren).WithMany().HasForeignKey(x => x.OneriVerenId).OnDelete(DeleteBehavior.Restrict);
        });

        b.Entity<SunumTaslagi>(e =>
        {
            // Girişim başına tek güncel taslak — yeniden üretim yeni satır açmaz, mevcudu günceller.
            e.HasIndex(x => x.GirisimId).IsUnique();
            e.HasOne(x => x.Girisim).WithMany().HasForeignKey(x => x.GirisimId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Olusturan).WithMany().HasForeignKey(x => x.OlusturanId).OnDelete(DeleteBehavior.Restrict);
        });

        b.Entity<SilmeTalebi>(e =>
        {
            e.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.ReviewedBy).WithMany().HasForeignKey(x => x.ReviewedById).OnDelete(DeleteBehavior.Restrict);
        });

        b.Entity<IslemKaydi>(e =>
        {
            e.HasIndex(x => x.CreatedAt);
            e.HasIndex(x => x.HedefKullaniciId);
            e.Property(x => x.Eylem).HasMaxLength(100).IsRequired();
        });

        b.Entity<AiAnalizKaydi>(e =>
        {
            e.HasIndex(x => x.CreatedAt);
            e.HasIndex(x => new { x.GirisimId, x.Tur });
            e.HasOne(x => x.Girisim).WithMany().HasForeignKey(x => x.GirisimId).OnDelete(DeleteBehavior.Cascade);
        });
    }
}
