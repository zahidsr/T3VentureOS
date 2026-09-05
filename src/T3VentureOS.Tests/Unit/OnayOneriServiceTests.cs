using T3VentureOS.Domain;
using T3VentureOS.Domain.Entities;
using T3VentureOS.Infrastructure.Services;
using T3VentureOS.Tests.TestSupport;

namespace T3VentureOS.Tests.Unit;

public class OnayOneriServiceTests
{
    private static async Task<(Infrastructure.Data.AppDbContext Db, OnayOneriService Service, User Reviewer)> SetupAsync()
    {
        var db = TestDb.Create();
        var reviewer = new User { Email = "program@t3vakfi.local", FullName = "Program Yöneticisi", Role = UserRole.ProgramYoneticisi };
        db.Users.Add(reviewer);
        await db.SaveChangesAsync();
        return (db, new OnayOneriService(db, new AuditLogService(db)), reviewer);
    }

    [Fact]
    public async Task UpsertAsync_records_a_new_recommendation()
    {
        var (db, service, reviewer) = await SetupAsync();
        var konuId = Guid.NewGuid();

        await service.UpsertAsync(OnayKonusuTuru.Satis, konuId, reviewer.Id, OneriTavsiyesi.Cekince, "Ciro teyide muhtaç.");

        var kayit = db.OnayOnerileri.Single();
        Assert.Equal(OnayKonusuTuru.Satis, kayit.KonuTuru);
        Assert.Equal(konuId, kayit.KonuId);
        Assert.Equal(OneriTavsiyesi.Cekince, kayit.Tavsiye);
        Assert.Equal("Ciro teyide muhtaç.", kayit.Not);
        Assert.Null(kayit.UpdatedAt);
    }

    [Fact]
    public async Task UpsertAsync_replaces_the_same_reviewers_earlier_recommendation()
    {
        var (db, service, reviewer) = await SetupAsync();
        var konuId = Guid.NewGuid();

        await service.UpsertAsync(OnayKonusuTuru.Satis, konuId, reviewer.Id, OneriTavsiyesi.Ret, "Belge eksik.");
        await service.UpsertAsync(OnayKonusuTuru.Satis, konuId, reviewer.Id, OneriTavsiyesi.Onay, null);

        // A reviewer has one standing opinion, not a running commentary.
        var kayit = Assert.Single(db.OnayOnerileri);
        Assert.Equal(OneriTavsiyesi.Onay, kayit.Tavsiye);
        Assert.Null(kayit.Not);
        Assert.NotNull(kayit.UpdatedAt);
    }

    [Fact]
    public async Task UpsertAsync_keeps_recommendations_from_different_reviewers_side_by_side()
    {
        var (db, service, reviewer) = await SetupAsync();
        var digerReviewer = new User { Email = "program2@t3vakfi.local", FullName = "İkinci Yönetici", Role = UserRole.ProgramYoneticisi };
        db.Users.Add(digerReviewer);
        await db.SaveChangesAsync();
        var konuId = Guid.NewGuid();

        await service.UpsertAsync(OnayKonusuTuru.Yatirim, konuId, reviewer.Id, OneriTavsiyesi.Onay, null);
        await service.UpsertAsync(OnayKonusuTuru.Yatirim, konuId, digerReviewer.Id, OneriTavsiyesi.Ret, "Değerleme yüksek.");

        Assert.Equal(2, db.OnayOnerileri.Count());
    }

    [Fact]
    public async Task UpsertAsync_treats_the_same_id_under_a_different_konu_turu_as_a_separate_record()
    {
        var (db, service, reviewer) = await SetupAsync();
        var konuId = Guid.NewGuid();

        await service.UpsertAsync(OnayKonusuTuru.Satis, konuId, reviewer.Id, OneriTavsiyesi.Onay, null);
        await service.UpsertAsync(OnayKonusuTuru.Basari, konuId, reviewer.Id, OneriTavsiyesi.Ret, "Belgelenmemiş.");

        Assert.Equal(2, db.OnayOnerileri.Count());
    }

    [Fact]
    public async Task ListForKonularAsync_returns_only_the_recommendations_for_the_requested_pairs()
    {
        var (db, service, reviewer) = await SetupAsync();
        var satisId = Guid.NewGuid();
        var yatirimId = Guid.NewGuid();
        await service.UpsertAsync(OnayKonusuTuru.Satis, satisId, reviewer.Id, OneriTavsiyesi.Onay, null);
        await service.UpsertAsync(OnayKonusuTuru.Yatirim, yatirimId, reviewer.Id, OneriTavsiyesi.Ret, "Değerleme yüksek.");

        var sonuc = await service.ListForKonularAsync([(OnayKonusuTuru.Satis, satisId)]);

        var tek = Assert.Single(sonuc);
        Assert.Equal(satisId, tek.KonuId);
        Assert.Equal("Program Yöneticisi", tek.OneriVeren?.FullName);
    }

    [Fact]
    public async Task ListForKonularAsync_does_not_match_a_recommendation_whose_konu_turu_differs()
    {
        var (_, service, reviewer) = await SetupAsync();
        var konuId = Guid.NewGuid();
        await service.UpsertAsync(OnayKonusuTuru.Satis, konuId, reviewer.Id, OneriTavsiyesi.Onay, null);

        // Aynı Guid başka bir kayıt türünde de görülebilir — tür eşleşmesi şart.
        var sonuc = await service.ListForKonularAsync([(OnayKonusuTuru.Dokuman, konuId)]);

        Assert.Empty(sonuc);
    }

    [Fact]
    public async Task ListForKonularAsync_returns_empty_when_no_konu_is_requested()
    {
        var (_, service, _) = await SetupAsync();

        Assert.Empty(await service.ListForKonularAsync([]));
    }
}
