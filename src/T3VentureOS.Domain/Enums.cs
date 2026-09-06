namespace T3VentureOS.Domain;

public enum UserRole { SuperAdmin, ProgramYoneticisi, StartupKullanicisi }

public enum UserStatus { Invited, Active, Disabled }

public enum ProgramDurumu { Taslak, Aktif, Tamamlandi, Arsivlendi }

public enum KatilimDurumu { Basvuru, KabulEdildi, DevamEdiyor, Mezun, Ayrildi }

public enum OnayDurumu { Beklemede, Onaylandi, Reddedildi }

public enum YatirimTuru { Hibe, OnTohum, Tohum, SeriA, SeriB, SeriSonrasi, Diger }

public enum BasariTuru { Hibe, Odul, Sertifika, Diger }

public enum DokumanTuru { Genel, Sunum }

public enum VerificationTokenType { EmailVerify, PasswordReset }

public enum BildirimTuru { OnayKarari, ItirazSonucu, ProgramGuncellemesi, Sistem }

/// <summary>Which of the four onay-durumu-bearing record types an Itiraz targets.</summary>
public enum ItirazKonusuTuru { Satis, Yatirim, Basari, Dokuman }

/// <summary>
/// Every record type that can sit in the onay kuyruğu — a superset of <see cref="ItirazKonusuTuru"/>,
/// since a ProgramYoneticisi may also recommend on güncelleme talepleri and itirazlar.
/// </summary>
public enum OnayKonusuTuru { Satis, Yatirim, Basari, Dokuman, Guncelleme, Itiraz, Istihdam }

/// <summary>A ProgramYoneticisi's recommendation to the deciding SuperAdmin.</summary>
public enum OneriTavsiyesi { Onay, Ret, Cekince }

/// <summary>
/// Hangi soruya cevap veren bir AI analizi. Ekosistem geneli ile tek girişimin analizi aynı tabloda
/// tutulur; tür alanı hangisinin listeleneceğini ayırır.
/// </summary>
public enum AiAnalizTuru { Ekosistem, GirisimDurumu, GirisimGelisim }

/// <summary>
/// Girişim puanının seviye karşılığı. Puan yalnızca artar (girilen veri geri alınmaz), bu yüzden
/// seviye de düşmez — güncellik ayrı bir işaret olarak taşınır, bkz. GirisimSaglik.Guncel.
/// </summary>
public enum GirisimSeviyesi { Bronz, Gumus, Altin, Platin }

/// <summary>
/// Girişimin ürün olgunluk aşaması. Puandan (veri kalitesi) tamamen ayrıdır: bu, girişimin
/// gerçekte nerede olduğunu anlatır ve "programa hangi aşamada girdi, hangi aşamada çıktı"
/// sorusunun ölçülebilir cevabıdır.
/// </summary>
public enum GirisimAsamasi { Fikir, Prototip, MVP, IlkMusteri, Olcekleme, Buyume }
