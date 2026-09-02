using T3VentureOS.Domain;
using T3VentureOS.Domain.Entities;
using T3VentureOS.Infrastructure.Services;
using T3VentureOS.Tests.TestSupport;

namespace T3VentureOS.Tests.Unit;

public class OnayServiceTests
{
    [Fact]
    public async Task KararVerSatis_approves_a_pending_record_and_stamps_the_reviewer()
    {
        var db = TestDb.Create();
        var girisim = new Girisim { Ad = "Test Girişim", CreatedById = Guid.NewGuid() };
        var satis = new SatisKaydi { GirisimId = girisim.Id, Donem = "2026-Q1", Ciro = 1000, SubmittedById = Guid.NewGuid() };
        db.Girisimler.Add(girisim);
        db.SatisKayitlari.Add(satis);
        await db.SaveChangesAsync();

        var onay = new OnayService(db, new NotificationService(db));
        var reviewerId = Guid.NewGuid();
        var ok = await onay.KararVerSatisAsync(satis.Id, reviewerId, onayla: true, not: null);

        Assert.True(ok);
        var updated = db.SatisKayitlari.Single(s => s.Id == satis.Id);
        Assert.Equal(OnayDurumu.Onaylandi, updated.OnayDurumu);
        Assert.Equal(reviewerId, updated.ReviewedById);
    }

    [Fact]
    public async Task KararVerSatis_returns_false_for_an_unknown_id()
    {
        var db = TestDb.Create();
        var onay = new OnayService(db, new NotificationService(db));

        var ok = await onay.KararVerSatisAsync(Guid.NewGuid(), Guid.NewGuid(), onayla: true, not: null);

        Assert.False(ok);
    }

    [Fact]
    public async Task KararVerGuncelleme_applies_the_requested_fields_onto_the_Girisim_when_approved()
    {
        var db = TestDb.Create();
        var girisim = new Girisim { Ad = "Eski Ad", Sektor = "Eski Sektör", CreatedById = Guid.NewGuid() };
        db.Girisimler.Add(girisim);
        var talep = new GirisimGuncellemeTalebi
        {
            GirisimId = girisim.Id,
            Ad = "Yeni Ad",
            Sektor = "Yeni Sektör",
            SubmittedById = Guid.NewGuid(),
        };
        db.GirisimGuncellemeTalepleri.Add(talep);
        await db.SaveChangesAsync();

        var onay = new OnayService(db, new NotificationService(db));
        var ok = await onay.KararVerGuncellemeAsync(talep.Id, Guid.NewGuid(), onayla: true, not: null);

        Assert.True(ok);
        var updatedGirisim = db.Girisimler.Single(g => g.Id == girisim.Id);
        Assert.Equal("Yeni Ad", updatedGirisim.Ad);
        Assert.Equal("Yeni Sektör", updatedGirisim.Sektor);
    }

    [Fact]
    public async Task KararVerGuncelleme_leaves_the_Girisim_untouched_when_rejected()
    {
        var db = TestDb.Create();
        var girisim = new Girisim { Ad = "Eski Ad", CreatedById = Guid.NewGuid() };
        db.Girisimler.Add(girisim);
        var talep = new GirisimGuncellemeTalebi { GirisimId = girisim.Id, Ad = "Yeni Ad", SubmittedById = Guid.NewGuid() };
        db.GirisimGuncellemeTalepleri.Add(talep);
        await db.SaveChangesAsync();

        var onay = new OnayService(db, new NotificationService(db));
        await onay.KararVerGuncellemeAsync(talep.Id, Guid.NewGuid(), onayla: false, not: "Eksik bilgi.");

        var updatedGirisim = db.Girisimler.Single(g => g.Id == girisim.Id);
        Assert.Equal("Eski Ad", updatedGirisim.Ad);
    }
}
