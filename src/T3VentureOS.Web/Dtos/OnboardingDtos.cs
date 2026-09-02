namespace T3VentureOS.Web.Dtos;

public record OnboardingDurumuDto(
    bool LogoEklendi, bool KisaTanimGirildi, bool IlkSatisKaydiGirildi, bool IlkGelisimAdimiEklendi, bool EmailDogrulandi,
    int TamamlananAdimSayisi, int ToplamAdimSayisi);
